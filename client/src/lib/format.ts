// Format number to Turkish number format with commas  
export function formatTurkishPrice(value: number): string {
  return value.toLocaleString('tr-TR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

// Format fund price with exact 6 decimal precision
export function formatFundPrice(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0,000000';
  }
  
  // Use Number.parseFloat to ensure we have the exact value
  const numValue = Number(value);
  
  // Format with exactly 6 decimal places, no rounding beyond that
  const formatted = numValue.toFixed(6);
  
  // Replace decimal point with Turkish comma
  return formatted.replace('.', ',');
}

// Format currency to Turkish format with ₺ symbol
export function formatTurkishCurrency(value: number): string {
  return '₺' + value.toLocaleString('tr-TR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

// Format percentage to Turkish format
export function formatTurkishPercent(value: number): string {
  return value.toLocaleString('tr-TR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }) + '%';
}

// Parse Turkish formatted price (with commas) to number
export function parseTurkishPrice(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.'));
}