import * as cron from 'node-cron';
import { PriceService } from './price-service';
import { db } from '../db';
import { positions, priceHistory } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { setCachedFundPrice, getAllCachedFundPrices } from './fund-price-cache';

export class PriceMonitor {
  private priceService: PriceService;
  private monitoringInterval: NodeJS.Timeout | null = null;
  // Scheduled cron jobs for TEFAS fund prices (09:00 and 10:00 Turkey time = UTC+3)
  private fundCronJobs: cron.ScheduledTask[] = [];
  private readonly STOCK_UPDATE_INTERVAL = 15 * 60 * 1000; // 15 minutes for stocks only

  constructor() {
    this.priceService = new PriceService();
  }

  startMonitoring() {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    console.log('Starting price monitoring service...');

    // --- STOCKS & US STOCKS: update every 15 minutes ---
    this.updateStockPrices();
    this.monitoringInterval = setInterval(() => {
      this.updateStockPrices();
    }, this.STOCK_UPDATE_INTERVAL);

    // --- TEFAS FUNDS: update only at 09:00 and 10:00 Turkey time (UTC+3 = 06:00 and 07:00 UTC) ---
    // !!! QUOTA PROTECTION !!! — No fetch on startup.
    // this.updateFundPrices();

    // Scheduled: 09:00 Turkey time (06:00 UTC)
    const job9 = cron.schedule('0 6 * * *', () => {
      console.log('[CRON] 09:00 TR - Fetching TEFAS fund prices...');
      this.updateFundPrices(true);
    }, { timezone: 'UTC' });

    // Scheduled: 10:00 Turkey time (07:00 UTC) — retry/backup run
    const job10 = cron.schedule('0 7 * * *', () => {
      console.log('[CRON] 10:00 TR - TEFAS fund price backup fetch...');
      this.updateFundPrices(true);
    }, { timezone: 'UTC' });

    this.fundCronJobs = [job9, job10];
    console.log('Fund price scheduler active: 09:00 and 10:00 Turkey time daily.');
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.fundCronJobs.forEach(job => job.stop());
    this.fundCronJobs = [];
    console.log('Price monitoring stopped');
  }

  // Only updates stock and us_stock positions
  async updateStockPrices() {
    try {
      const activePositions = await db.select().from(positions);
      const stockPositions = activePositions.filter(
        p => p.type === 'stock' || p.type === 'us_stock'
      );

      if (stockPositions.length === 0) return;

      console.log(`Updating ${stockPositions.length} stock/us_stock prices...`);

      const updatePromises = stockPositions.map(async (position) => {
        try {
          const currentPrice = await this.priceService.getPrice(
            position.symbol,
            position.type as 'stock' | 'us_stock'
          );
          await db.update(positions).set({
            currentPrice: currentPrice.toFixed(6),
            lastUpdated: new Date()
          }).where(eq(positions.id, position.id));

          await db.insert(priceHistory).values({
            symbol: position.symbol,
            type: position.type,
            price: currentPrice.toFixed(6),
            timestamp: new Date()
          });

          console.log(`[Stock] Updated ${position.symbol}: ${currentPrice}`);
          return { symbol: position.symbol, price: currentPrice, success: true };
        } catch (error) {
          console.warn(`[Stock] Failed to update ${position.symbol}:`, error);
          return { symbol: position.symbol, price: null, success: false };
        }
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error during stock price update:', error);
    }
  }

  // Only updates fund positions — writes to cache  // Updates TEFAS funds only. If forceLiveFetch is true, it rigorously bypasses the DB cache protection.
  async updateFundPrices(forceLiveFetch = false) {
    try {
      const activePositions = await db.select().from(positions);
      const fundPositions = activePositions.filter(p => p.type === 'fund');

      if (fundPositions.length === 0) {
        console.log('[TEFAS] No fund positions to update.');
        return;
      }

      console.log(`[TEFAS] Fetching prices for ${fundPositions.length} fund(s)...`);

      for (const position of fundPositions) {
        try {
          const currentPrice = forceLiveFetch 
            ? await this.priceService.forceTEFASUpdate(position.symbol)
            : await this.priceService.getPrice(position.symbol, 'fund');

          // Store in shared cache module
          setCachedFundPrice(position.symbol, currentPrice);

          await db.update(positions).set({
            currentPrice: currentPrice.toFixed(6),
            lastUpdated: new Date()
          }).where(eq(positions.id, position.id));

          await db.insert(priceHistory).values({
            symbol: position.symbol,
            type: position.type,
            price: currentPrice.toFixed(6),
            timestamp: new Date()
          });

          console.log(`[TEFAS] Updated ${position.symbol}: ${currentPrice}`);

          // Small delay between fund requests to be gentle on TEFAS
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
          console.warn(`[TEFAS] Failed to fetch live price for ${position.symbol}:`, (error as Error).message);

          // Fallback: use last known price already stored in DB (updated by user or previous successful fetch)
          const lastKnownPrice = parseFloat(position.currentPrice ?? '0');
          if (lastKnownPrice > 0) {
            console.log(`[TEFAS] Using last DB price for ${position.symbol}: ${lastKnownPrice}`);
            // Seed cache so the app continues to show the last known value
            setCachedFundPrice(position.symbol, lastKnownPrice);
          } else {
            console.warn(`[TEFAS] No fallback price available for ${position.symbol}`);
          }
        }
      }

      console.log('[TEFAS] Fund price update completed.');
    } catch (error) {
      console.error('[TEFAS] Error during fund price update:', error);
    }
  }

  async updateAllPrices() {
    await this.updateStockPrices();
    await this.updateFundPrices();
  }

  async updateSinglePosition(positionId: string) {
    try {
      const [position] = await db.select().from(positions).where(eq(positions.id, positionId));

      if (!position) {
        throw new Error(`Position not found: ${positionId}`);
      }

      let currentPrice: number;
      if (position.type === 'fund') {
         // !!! QUOTA PROTECTION !!! — Manual refreshes for funds are disabled.
         // They will only update during the 09:00 and 10:00 TRT cron jobs.
         console.log(`[TEFAS Quota Protection] Manual update skipped for ${position.symbol}.`);
         currentPrice = parseFloat(position.currentPrice ?? '0');
      } else {
         currentPrice = await this.priceService.getPrice(
           position.symbol,
           position.type as 'stock' | 'us_stock'
         );
      }

      if (position.type === 'fund') {
        setCachedFundPrice(position.symbol, currentPrice);
      }

      await db.update(positions).set({
        currentPrice: currentPrice.toFixed(6),
        lastUpdated: new Date()
      }).where(eq(positions.id, position.id));

      await db.insert(priceHistory).values({
        symbol: position.symbol,
        type: position.type,
        price: currentPrice.toFixed(6),
        timestamp: new Date()
      });

      console.log(`Manual update ${position.symbol}: ${currentPrice}`);
      return currentPrice;
    } catch (error) {
      console.error(`Failed to update single position ${positionId}:`, error);
      throw error;
    }
  }

  getMonitoringStatus() {
    return {
      isMonitoring: !!this.monitoringInterval,
      stockUpdateIntervalMinutes: this.STOCK_UPDATE_INTERVAL / 60000,
      fundSchedule: ['09:00 TR', '10:00 TR'],
      cachedFunds: getAllCachedFundPrices(),
      lastUpdate: new Date().toISOString()
    };
  }
}

// Global instance
export const priceMonitor = new PriceMonitor();