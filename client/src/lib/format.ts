// Format number to Turkish number format with commas  
export function formatTurkishPrice(value: number): string {
  return value.toLocaleString('tr-TR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

// Format fund price with 6 decimal places for high precision
export function formatFundPrice(value: number): string {
  // Use fixed-point notation to avoid scientific notation for small numbers
  const fixedValue = value.toFixed(6);
  const parts = fixedValue.split('.');
  
  // Format the integer part with Turkish thousands separator if needed
  const integerPart = parseInt(parts[0]).toLocaleString('tr-TR');
  
  // Always use exactly 6 decimal places
  const decimalPart = parts[1];
  
  return `${integerPart},${decimalPart}`;
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