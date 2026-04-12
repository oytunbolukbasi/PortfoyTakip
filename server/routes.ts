import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPositionSchema, closePositionSchema, insertBistSymbolSchema } from "@shared/schema";
import { PriceService } from "./services/price-service";
import { db } from "./db";
import { bistSymbols } from "@shared/schema";
import { ilike } from "drizzle-orm";

// Extend express-session with custom properties
declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
    username: string;
  }
}

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.authenticated) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  const priceService = new PriceService();

  // ── Auth endpoints ──────────────────────────────────────────────────────
  app.post("/api/auth/login", (req: Request, res: Response) => {
    const { username, password } = req.body;
    const validUsername = process.env.APP_USERNAME || "oytunbolukbasi";
    const validPassword = process.env.APP_PASSWORD || "Slither1986";

    if (username === validUsername && password === validPassword) {
      req.session.authenticated = true;
      req.session.username = username;
      return res.json({ success: true, username });
    }
    res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" });
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (req.session?.authenticated) {
      return res.json({ authenticated: true, username: req.session.username });
    }
    res.json({ authenticated: false });
  });
  // ────────────────────────────────────────────────────────────────────────

  // Positions endpoints
  app.get("/api/positions", requireAuth, async (req, res) => {
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

  app.post("/api/positions", requireAuth, async (req, res) => {
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
      
      // Auto-fetch buyRate for US stocks if not provided or to ensure accuracy
      let buyRate = validatedData.buyRate;
      if (validatedData.type === 'us_stock') {
        try {
          const fetchedRate = await priceService.getHistoricalExchangeRate(new Date(validatedData.buyDate));
          buyRate = fetchedRate.toString();
          console.log(`Auto-assigned buyRate for ${validatedData.symbol}: ${buyRate}`);
        } catch (error) {
          console.warn(`Failed to auto-fetch buyRate for ${validatedData.symbol}, keeping existing or default.`);
        }
      }

      // Fetch current price for the new position
      let currentPrice = null;
      try {
        currentPrice = await priceService.getPrice(validatedData.symbol, validatedData.type);
      } catch (error) {
        console.warn(`Failed to fetch price for ${validatedData.symbol}:`, error);
      }

      // Get proper fund name for TEFAS funds
      let positionName = validatedData.name;
      if (validatedData.type === 'fund' && (!validatedData.name || validatedData.name === validatedData.symbol)) {
        positionName = priceService.getFundName(validatedData.symbol, validatedData.type);
      }

      const position = await storage.createPosition({
        ...validatedData,
        buyRate,
        name: positionName,
        userId,
      });

      // Update with current price if available
      if (currentPrice !== null) {
        await storage.updatePosition(position.id, {
          currentPrice: currentPrice.toFixed(6), // Preserve 6-digit precision
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



  app.delete("/api/positions/:id", requireAuth, async (req, res) => {
    try {
      const userId = "demo-user";
      await storage.deletePosition(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete position" });
    }
  });

  // Update position (quantity, buyPrice, buyDate)
  app.patch("/api/positions/:id", requireAuth, async (req, res) => {
    try {
      const positionId = req.params.id;
      const userId = "demo-user";

      // Verify ownership
      const positions = await storage.getPositions(userId);
      const existing = positions.find(p => p.id === positionId);
      if (!existing) {
        return res.status(404).json({ error: "Position not found" });
      }

      const { quantity, buyPrice, buyDate } = req.body;
      const updates: Record<string, any> = {};

      if (quantity !== undefined) {
        const parsed = parseFloat(String(quantity).replace(',', '.'));
        if (isNaN(parsed) || parsed <= 0) {
          return res.status(400).json({ error: "Geçerli bir adet giriniz" });
        }
        updates.quantity = parsed.toString();
      }

      if (buyPrice !== undefined) {
        // Handle Turkish decimal format: "1.234,56" -> "1234.56"
        const normalized = String(buyPrice)
          .replace(/\./g, '')
          .replace(',', '.');
        const parsed = parseFloat(normalized);
        if (isNaN(parsed) || parsed <= 0) {
          return res.status(400).json({ error: "Geçerli bir alış fiyatı giriniz" });
        }
        updates.buyPrice = parsed.toFixed(6);
      }

      if (buyDate !== undefined) {
        updates.buyDate = new Date(buyDate);

        // Re-fetch buyRate if this is a US stock and date changed
        if (existing.type === 'us_stock') {
          try {
            const rate = await priceService.getHistoricalExchangeRate(new Date(buyDate));
            updates.buyRate = rate.toString();
            console.log(`Re-fetched buyRate for ${existing.symbol} on ${buyDate}: ${rate}`);
          } catch (err) {
            console.warn(`Failed to re-fetch buyRate for ${existing.symbol}:`, err);
          }
        }
      }

      const updated = await storage.updatePosition(positionId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Update position error:", error);
      res.status(500).json({ error: "Failed to update position" });
    }
  });

  app.post("/api/positions/:id/refresh-price", requireAuth, async (req, res) => {
    try {
      const positionId = req.params.id;
      const userId = "demo-user";
      const positions = await storage.getPositions(userId);
      const position = positions.find(p => p.id === positionId);
      if (!position) {
        return res.status(404).json({ error: "Position not found" });
      }
      const price = await priceService.getPrice(position.symbol, position.type as 'stock' | 'fund' | 'us_stock');
      await storage.updatePosition(positionId, {
        currentPrice: price.toFixed(6),
        lastUpdated: new Date(),
      });
      res.json({ success: true, price });
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh price" });
    }
  });

  app.post("/api/positions/:id/close", requireAuth, async (req, res) => {
    try {
      const positionId = req.params.id;
      const rawData = req.body;

      console.log('Close position request:', { positionId, rawData });

      // Convert Turkish number format to standard format for validation
      if (rawData.sellPrice && typeof rawData.sellPrice === 'string') {
        let normalizedPrice = rawData.sellPrice.trim();
        if (normalizedPrice.includes(',') && !normalizedPrice.includes('.')) {
          normalizedPrice = normalizedPrice.replace(',', '.');
        } else if (normalizedPrice.includes('.') && normalizedPrice.includes(',')) {
          normalizedPrice = normalizedPrice.replace(/\./g, '').replace(',', '.');
        }
        rawData.sellPrice = normalizedPrice;
        console.log('Normalized sell price:', normalizedPrice);
      }

      const validatedData = closePositionSchema.parse(rawData);
      const userId = "demo-user";

      const closedPosition = await storage.closePosition(positionId, userId, validatedData);
      res.json(closedPosition);
    } catch (error) {
      console.error('Close position error:', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to close position" });
      }
    }
  });


  // Closed positions endpoint
  app.get("/api/closed-positions", requireAuth, async (req, res) => {
    try {
      const userId = "demo-user";
      const closedPositions = await storage.getClosedPositions(userId);
      res.json(closedPositions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch closed positions" });
    }
  });

  // Delete closed position endpoint
  app.delete("/api/closed-positions/:id", requireAuth, async (req, res) => {
    try {
      const userId = "demo-user";
      await storage.deleteClosedPosition(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete closed position" });
    }
  });

  // Market data endpoint
  app.get("/api/market-data", async (req, res) => {
    try {
      const marketData = await priceService.getBISTMarketData();
      res.json(marketData);
    } catch (error) {
      console.error('Market data fetch error:', error);
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  // Price update endpoint
  app.post("/api/prices/refresh", requireAuth, async (req, res) => {
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
      const price = await priceService.getPrice(symbol, type as 'stock' | 'fund' | 'us_stock');
      res.json({ symbol, type, price });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price" });
    }
  });

  // Get exchange rates
  app.get("/api/exchange-rates", async (req, res) => {
    try {
      const pair = (req.query.pair as string) || 'USDTRY';
      const rate = await priceService.getExchangeRate(pair);
      res.json({ pair, rate });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exchange rate" });
    }
  });

  // Price monitor endpoints
  app.post("/api/price-monitor/update-all", requireAuth, async (req, res) => {
    try {
      const userId = "demo-user";
      const positions = await storage.getPositions(userId);
      
      const results = [];
      
      for (const position of positions) {
        try {
          const price = await priceService.getPrice(position.symbol, position.type as 'stock' | 'fund');
          
          // Update position with new price
          const updateData: any = {
            currentPrice: price.toString(),
            lastUpdated: new Date(),
          };
          
          // Also update fund names if they're missing or generic
          if (position.type === 'fund' && (!position.name || position.name === position.symbol)) {
            const fundName = priceService.getFundName(position.symbol, position.type as 'stock' | 'fund');
            if (fundName !== position.symbol) {
              updateData.name = fundName;
            }
          }
          
          await storage.updatePosition(position.id, updateData);
          
          console.log(`Updated ${position.symbol}: ${price} TL`);
          results.push({ symbol: position.symbol, success: true, price });
        } catch (error) {
          console.warn(`Failed to update price for ${position.symbol}:`, error);
          results.push({ symbol: position.symbol, success: false, error: String(error) });
        }
      }

      console.log(`Price update completed: ${results.filter(r => r.success).length}/${results.length} positions updated successfully`);
      res.json({ success: true, results });
    } catch (error) {
      console.error('Price monitor update error:', error);
      res.status(500).json({ error: "Failed to update prices" });
    }
  });

  // BIST symbols endpoints
  app.get("/api/bist-symbols/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }

      const symbols = await db.select()
        .from(bistSymbols)
        .where(ilike(bistSymbols.symbol, `%${query.toUpperCase()}%`))
        .limit(20);

      res.json(symbols);
    } catch (error) {
      console.error('BIST symbol search error:', error);
      res.status(500).json({ error: "Failed to search symbols" });
    }
  });

  app.post("/api/bist-symbols/populate", async (req, res) => {
    try {
      // Sample BIST symbols - in production, this would fetch from Google Finance
      const sampleSymbols = [
        { symbol: "AKBNK", name: "Akbank T.A.Ş.", sector: "Bankacılık" },
        { symbol: "GARAN", name: "Türkiye Garanti Bankası A.Ş.", sector: "Bankacılık" },
        { symbol: "ISCTR", name: "Türkiye İş Bankası A.Ş.", sector: "Bankacılık" },
        { symbol: "HALKB", name: "Türkiye Halk Bankası A.Ş.", sector: "Bankacılık" },
        { symbol: "VAKBN", name: "Türkiye Vakıflar Bankası T.A.O.", sector: "Bankacılık" },
        { symbol: "YKBNK", name: "Yapı ve Kredi Bankası A.Ş.", sector: "Bankacılık" },
        { symbol: "ARCLK", name: "Arçelik A.Ş.", sector: "Beyaz Eşya" },
        { symbol: "BIMAS", name: "BİM Birleşik Mağazalar A.Ş.", sector: "Perakende" },
        { symbol: "ULKER", name: "Ülker Bisküvi Sanayi A.Ş.", sector: "Gıda" },
        { symbol: "CCOLA", name: "Coca-Cola İçecek A.Ş.", sector: "İçecek" },
        { symbol: "MIGRS", name: "Migros T.A.Ş.", sector: "Perakende" },
        { symbol: "SAHOL", name: "Hacı Ömer Sabancı Holding A.Ş.", sector: "Holding" },
        { symbol: "KCHOL", name: "Koç Holding A.Ş.", sector: "Holding" },
        { symbol: "ASELS", name: "Aselsan Elektronik San. ve Tic. A.Ş.", sector: "Savunma" },
        { symbol: "TUPRS", name: "Tüpraş-Türkiye Petrol Rafinerileri A.Ş.", sector: "Petrol" },
        { symbol: "EREGL", name: "Ereğli Demir ve Çelik Fab. T.A.Ş.", sector: "Metal" },
        { symbol: "FROTO", name: "Ford Otomotiv San. A.Ş.", sector: "Otomotiv" },
        { symbol: "OTKAR", name: "Otokar Otomotiv ve Savunma Sanayi A.Ş.", sector: "Otomotiv" },
        { symbol: "SISE", name: "Türkiye Şişe ve Cam Fab. A.Ş.", sector: "Cam" },
        { symbol: "TKFEN", name: "Tekfen Holding A.Ş.", sector: "Holding" },
        { symbol: "TCELL", name: "Turkcell İletişim Hizmetleri A.Ş.", sector: "Telekomünikasyon" },
        { symbol: "PGSUS", name: "Pegasus Hava Taşımacılığı A.Ş.", sector: "Havayolu" },
        { symbol: "TAVHL", name: "TAV Havalimanları Holding A.Ş.", sector: "Havalimanı" },
        { symbol: "VESTL", name: "Vestel Elektronik San. ve Tic. A.Ş.", sector: "Elektronik" },
        { symbol: "SASA", name: "Sasa Polyester San. A.Ş.", sector: "Kimya" },
        { symbol: "AKFIS", name: "Akdeniz Güvenlik Hizm. ve Tic. A.Ş.", sector: "Güvenlik" },
        { symbol: "ENKAI", name: "Enka İnşaat ve Sanayi A.Ş.", sector: "İnşaat" },
        { symbol: "PETKM", name: "Petkim Petrokimya Holding A.Ş.", sector: "Kimya" },
        { symbol: "DOHOL", name: "Doğan Holding A.Ş.", sector: "Holding" },
        { symbol: "EKGYO", name: "Emlak Konut Gayrimenkul Yat. Ort. A.Ş.", sector: "GYO" },
        { symbol: "ALARK", name: "Alarko Holding A.Ş.", sector: "Holding" },
        { symbol: "KRDMD", name: "Kardemir Karabük Demir Çelik San. T.A.Ş.", sector: "Metal" },
        { symbol: "TOASO", name: "Tofaş Türk Otomobil Fab. A.Ş.", sector: "Otomotiv" }
      ];

      // Clear existing symbols and insert new ones
      await db.delete(bistSymbols);
      
      for (const symbolData of sampleSymbols) {
        await db.insert(bistSymbols).values(symbolData);
      }

      res.json({ message: "BIST symbols populated successfully", count: sampleSymbols.length });
    } catch (error) {
      console.error('BIST symbol population error:', error);
      res.status(500).json({ error: "Failed to populate symbols" });
    }
  });

  const httpServer = createServer(app);
  // Maintenance endpoints
  app.post("/api/maintenance/backfill-rates", requireAuth, async (req, res) => {
    try {
      const userId = "demo-user";
      const positions = await storage.getPositions(userId);
      const usStocks = positions.filter(p => p.type === 'us_stock');
      
      console.log(`Starting backfill for ${usStocks.length} US stock positions...`);
      const results = [];
      
      for (const pos of usStocks) {
        try {
          const rate = await priceService.getHistoricalExchangeRate(new Date(pos.buyDate));
          await storage.updatePosition(pos.id, {
            buyRate: rate.toString()
          });
          results.push({ symbol: pos.symbol, date: pos.buyDate, rate });
        } catch (err) {
          results.push({ symbol: pos.symbol, date: pos.buyDate, error: (err as Error).message });
        }
      }
      
      res.json({ success: true, results });
    } catch (error) {
      res.status(500).json({ error: "Backfill failed" });
    }
  });

  return httpServer;
}
