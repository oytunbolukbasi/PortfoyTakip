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

// Format price with correct currency symbol based on asset type
// Used for per-unit prices (e.g. buy price, current price)
export function formatPositionPrice(value: number, type: string): string {
  // Fund per-unit prices get 6 decimal places, others get 2
  const formatted = type === 'fund' ? formatFundPrice(value) : formatTurkishPrice(value);
  return type === 'us_stock' ? `$${formatted}` : `₺${formatted}`;
}

// Format aggregate position values (total value, P&L) - always 2 decimal places
// Fund totals should NOT use 6-decimal fund format
export function formatPositionValue(value: number, type: string): string {
  const formatted = formatTurkishPrice(value);
  return type === 'us_stock' ? `$${formatted}` : `₺${formatted}`;
}