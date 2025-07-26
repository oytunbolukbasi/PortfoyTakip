import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPositionSchema, closePositionSchema } from "@shared/schema";
import { PriceService } from "./services/price-service";

export async function registerRoutes(app: Express): Promise<Server> {
  const priceService = new PriceService();

  // Positions endpoints
  app.get("/api/positions", async (req, res) => {
    try {
      // For demo purposes, using a default user ID
      // In production, this would come from authentication
      const userId = "demo-user";
      const positions = await storage.getPositions(userId);
      res.json(positions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch positions" });
    }
  });

  app.post("/api/positions", async (req, res) => {
    try {
      const rawData = req.body;
      
      // Convert Turkish number format to standard format for validation
      if (rawData.buyPrice && typeof rawData.buyPrice === 'string') {
        // Convert 1.234,56 or 234,56 to 1234.56 or 234.56
        const normalizedPrice = rawData.buyPrice
          .replace(/\./g, '') // Remove thousand separators
          .replace(',', '.'); // Replace decimal comma with dot
        rawData.buyPrice = normalizedPrice;
      }
      
      const validatedData = insertPositionSchema.parse(rawData);
      const userId = "demo-user";
      
      // Fetch current price for the new position
      let currentPrice = null;
      try {
        currentPrice = await priceService.getPrice(validatedData.symbol, validatedData.type);
      } catch (error) {
        console.warn(`Failed to fetch price for ${validatedData.symbol}:`, error);
      }

      const position = await storage.createPosition({
        ...validatedData,
        userId,
      });

      // Update with current price if available
      if (currentPrice !== null) {
        await storage.updatePosition(position.id, {
          currentPrice: currentPrice.toString(),
          lastUpdated: new Date(),
        });
      }

      res.json(position);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create position" });
      }
    }
  });

  app.delete("/api/positions/:id", async (req, res) => {
    try {
      const userId = "demo-user";
      await storage.deletePosition(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete position" });
    }
  });

  app.post("/api/positions/:id/close", async (req, res) => {
    try {
      const validatedData = closePositionSchema.parse(req.body);
      const userId = "demo-user";
      
      const closedPosition = await storage.closePosition(req.params.id, userId, validatedData);
      res.json(closedPosition);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to close position" });
      }
    }
  });

  // Closed positions endpoint
  app.get("/api/closed-positions", async (req, res) => {
    try {
      const userId = "demo-user";
      const closedPositions = await storage.getClosedPositions(userId);
      res.json(closedPositions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch closed positions" });
    }
  });

  // Price update endpoint
  app.post("/api/prices/refresh", async (req, res) => {
    try {
      const userId = "demo-user";
      const positions = await storage.getPositions(userId);
      
      const updatePromises = positions.map(async (position) => {
        try {
          const price = await priceService.getPrice(position.symbol, position.type as 'stock' | 'fund');
          await storage.updatePosition(position.id, {
            currentPrice: price.toString(),
            lastUpdated: new Date(),
          });
          
          // Save to price history
          await storage.savePriceHistory({
            symbol: position.symbol,
            type: position.type,
            price: price.toString(),
            change: '0', // Would calculate from previous price
            changePercent: '0',
          });
        } catch (error) {
          console.warn(`Failed to update price for ${position.symbol}:`, error);
        }
      });

      await Promise.all(updatePromises);
      
      const updatedPositions = await storage.getPositions(userId);
      res.json(updatedPositions);
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh prices" });
    }
  });

  // Get single price
  app.get("/api/price/:symbol/:type", async (req, res) => {
    try {
      const { symbol, type } = req.params;
      const price = await priceService.getPrice(symbol, type as 'stock' | 'fund');
      res.json({ symbol, type, price });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price" });
    }
  });

  // Price monitor endpoints
  app.post("/api/price-monitor/update-all", async (req, res) => {
    try {
      const userId = "demo-user";
      const positions = await storage.getPositions(userId);
      
      const results = [];
      
      for (const position of positions) {
        try {
          const price = await priceService.getPrice(position.symbol, position.type as 'stock' | 'fund');
          await storage.updatePosition(position.id, {
            currentPrice: price.toString(),
            lastUpdated: new Date(),
          });
          
          console.log(`Updated ${position.symbol}: ${price} TL`);
          results.push({ symbol: position.symbol, success: true, price });
        } catch (error) {
          console.warn(`Failed to update price for ${position.symbol}:`, error);
          results.push({ symbol: position.symbol, success: false, error: error.message });
        }
      }

      console.log(`Price update completed: ${results.filter(r => r.success).length}/${results.length} positions updated successfully`);
      res.json({ success: true, results });
    } catch (error) {
      console.error('Price monitor update error:', error);
      res.status(500).json({ error: "Failed to update prices" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
