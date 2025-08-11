// Format number to Turkish number format with commas  
export function formatTurkishPrice(value: number): string {
  return value.toLocaleString('tr-TR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

// Format fund price with 6 decimal places for high precision
export function formatFundPrice(value: number): string {
  // Convert to string with full precision, then format manually to avoid rounding issues
  const valueStr = value.toString();
  const parts = valueStr.split('.');
  
  if (parts.length === 1) {
    // No decimal point, add 6 zeros
    return parts[0] + ',000000';
  }
  
  // Pad or trim decimal part to exactly 6 digits
  let decimalPart = parts[1];
  if (decimalPart.length < 6) {
    decimalPart = decimalPart.padEnd(6, '0');
  } else if (decimalPart.length > 6) {
    decimalPart = decimalPart.substring(0, 6);
  }
  
  // Format the integer part with Turkish thousands separator
  const integerPart = parseInt(parts[0]).toLocaleString('tr-TR');
  
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