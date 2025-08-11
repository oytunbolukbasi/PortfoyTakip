// Format number to Turkish number format with commas  
export function formatTurkishPrice(value: number): string {
  return value.toLocaleString('tr-TR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

// Format fund price with 6 decimal places for high precision
export function formatFundPrice(value: number): string {
  // Convert to string with exactly 6 decimal places without any locale formatting
  const str = value.toFixed(6);
  
  // Replace dot with comma for Turkish formatting
  return str.replace('.', ',');
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