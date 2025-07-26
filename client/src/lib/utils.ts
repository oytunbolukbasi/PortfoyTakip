import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = '₺'): string {
  return `${currency}${amount.toLocaleString('tr-TR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

export function formatNumber(num: number, minimumFractionDigits: number = 0): string {
  return num.toLocaleString('tr-TR', { 
    minimumFractionDigits, 
    maximumFractionDigits: 2 
  });
}

export function formatPercentage(percentage: number): string {
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(2)}%`;
}

export function calculatePL(buyPrice: number, currentPrice: number, quantity: number) {
  const pl = (currentPrice - buyPrice) * quantity;
  const plPercent = ((currentPrice - buyPrice) / buyPrice) * 100;
  return { pl, plPercent };
}

export function calculateCommission(volume: number, rate: number = 0.0007): number {
  return volume * rate;
}
