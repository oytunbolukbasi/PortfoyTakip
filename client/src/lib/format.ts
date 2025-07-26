// Turkish formatting utilities

export function formatTurkishPrice(price: number | string | null): string {
  if (price === null || price === undefined) return '—';
  
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return '—';
  
  // Format with Turkish locale (comma as decimal separator, dot as thousand separator)
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numPrice);
}

export function formatTurkishCurrency(price: number | string | null): string {
  if (price === null || price === undefined) return '—';
  
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return '—';
  
  // Format with Turkish locale and TL symbol
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numPrice);
}

export function formatTurkishPercent(percent: number | string | null): string {
  if (percent === null || percent === undefined) return '—';
  
  const numPercent = typeof percent === 'string' ? parseFloat(percent) : percent;
  if (isNaN(numPercent)) return '—';
  
  const sign = numPercent >= 0 ? '+' : '';
  return `${sign}${formatTurkishPrice(numPercent)}%`;
}

export function parseTurkishPrice(priceStr: string): number {
  if (!priceStr || typeof priceStr !== 'string') return 0;
  
  // Handle various Turkish price formats
  const cleaned = priceStr.trim();
  
  // If already in decimal format (contains dot but no comma)
  if (cleaned.includes('.') && !cleaned.includes(',')) {
    return parseFloat(cleaned) || 0;
  }
  
  // Convert Turkish format (1.234,56) to standard format (1234.56)
  const normalized = cleaned
    .replace(/\./g, '') // Remove thousand separators
    .replace(',', '.'); // Replace decimal comma with dot
  
  return parseFloat(normalized) || 0;
}

export function formatTurkishInput(value: string): string {
  // Allow typing Turkish decimal format with comma
  return value.replace(/[^\d,]/g, ''); // Only allow digits and comma
}