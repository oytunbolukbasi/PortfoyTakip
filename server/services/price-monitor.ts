import { PriceService } from './price-service';
import { db } from '../db';
import { positions, priceHistory } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class PriceMonitor {
  private priceService: PriceService;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.priceService = new PriceService();
  }

  startMonitoring() {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    console.log('Starting price monitoring service...');
    
    // Initial update
    this.updateAllPrices();
    
    // Set up recurring updates
    this.monitoringInterval = setInterval(() => {
      this.updateAllPrices();
    }, this.UPDATE_INTERVAL);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Price monitoring stopped');
    }
  }

  async updateAllPrices() {
    try {
      console.log('Updating all position prices...');
      
      // Get all active positions
      const activePositions = await db.select().from(positions);
      
      const updatePromises = activePositions.map(async (position) => {
        try {
          const currentPrice = await this.priceService.getPrice(position.symbol, position.type as 'stock' | 'fund');
          
          // Update position with new price
          await db
            .update(positions)
            .set({
              currentPrice: currentPrice.toString(),
              lastUpdated: new Date()
            })
            .where(eq(positions.id, position.id));

          // Record price history
          await db.insert(priceHistory).values({
            symbol: position.symbol,
            type: position.type,
            price: currentPrice.toString(),
            timestamp: new Date()
          });

          console.log(`Updated ${position.symbol}: ${currentPrice} TL`);
          return { symbol: position.symbol, price: currentPrice, success: true };
        } catch (error) {
          console.warn(`Failed to update price for ${position.symbol}:`, error);
          return { symbol: position.symbol, price: null, success: false };
        }
      });

      const results = await Promise.all(updatePromises);
      const successful = results.filter(r => r.success).length;
      const total = results.length;
      
      console.log(`Price update completed: ${successful}/${total} positions updated successfully`);
      
      return results;
    } catch (error) {
      console.error('Error during price update cycle:', error);
    }
  }

  async updateSinglePosition(positionId: string) {
    try {
      const [position] = await db.select().from(positions).where(eq(positions.id, positionId));
      
      if (!position) {
        throw new Error(`Position not found: ${positionId}`);
      }

      const currentPrice = await this.priceService.getPrice(position.symbol, position.type as 'stock' | 'fund');
      
      // Update position with new price
      await db
        .update(positions)
        .set({
          currentPrice: currentPrice.toString(),
          lastUpdated: new Date()
        })
        .where(eq(positions.id, position.id));

      // Record price history
      await db.insert(priceHistory).values({
        symbol: position.symbol,
        type: position.type,
        price: currentPrice.toString(),
        timestamp: new Date()
      });

      console.log(`Manual update ${position.symbol}: ${currentPrice} TL`);
      return currentPrice;
    } catch (error) {
      console.error(`Failed to update single position ${positionId}:`, error);
      throw error;
    }
  }

  getMonitoringStatus() {
    return {
      isMonitoring: !!this.monitoringInterval,
      updateInterval: this.UPDATE_INTERVAL,
      lastUpdate: new Date().toISOString()
    };
  }
}

// Global instance
export const priceMonitor = new PriceMonitor();