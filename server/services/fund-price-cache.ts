// Shared in-memory cache for TEFAS fund prices
// Stored separately to avoid circular dependency between price-service and price-monitor

interface FundCacheEntry {
  price: number;
  fetchedAt: Date;
}

const fundPriceCache = new Map<string, FundCacheEntry>();

/**
 * Returns cached fund price if it was fetched today (Turkey time), otherwise null.
 */
export function getCachedFundPrice(symbol: string): number | null {
  const entry = fundPriceCache.get(symbol);
  if (!entry) return null;

  // Compare calendar dates in UTC+3 (Turkey time)
  const now = new Date();
  const nowTR = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const cachedTR = new Date(entry.fetchedAt.getTime() + 3 * 60 * 60 * 1000);

  const sameDay =
    nowTR.getUTCFullYear() === cachedTR.getUTCFullYear() &&
    nowTR.getUTCMonth() === cachedTR.getUTCMonth() &&
    nowTR.getUTCDate() === cachedTR.getUTCDate();

  return sameDay ? entry.price : null;
}

/**
 * Stores a fund price in the cache.
 */
export function setCachedFundPrice(symbol: string, price: number): void {
  fundPriceCache.set(symbol, { price, fetchedAt: new Date() });
}

/**
 * Returns all cache entries (for monitoring/status endpoints).
 */
export function getAllCachedFundPrices(): { symbol: string; price: number; fetchedAt: string }[] {
  return Array.from(fundPriceCache.entries()).map(([symbol, entry]) => ({
    symbol,
    price: entry.price,
    fetchedAt: entry.fetchedAt.toISOString()
  }));
}
