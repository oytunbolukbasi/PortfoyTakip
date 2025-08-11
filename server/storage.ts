import { 
  users, 
  positions, 
  closedPositions, 
  priceHistory,
  type User, 
  type InsertUser,
  type Position,
  type InsertPosition,
  type ClosedPosition,
  type ClosePosition,
  type PriceHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Position management
  getPositions(userId: string): Promise<Position[]>;
  getPosition(id: string, userId: string): Promise<Position | undefined>;
  createPosition(position: InsertPosition & { userId: string }): Promise<Position>;
  updatePosition(id: string, updates: Partial<Position>): Promise<Position>;
  deletePosition(id: string, userId: string): Promise<void>;
  
  // Closed positions
  getClosedPositions(userId: string): Promise<ClosedPosition[]>;
  closePosition(positionId: string, userId: string, closeData: ClosePosition): Promise<ClosedPosition>;
  deleteClosedPosition(id: string, userId: string): Promise<void>;
  
  // Price history
  savePriceHistory(priceData: Omit<PriceHistory, 'id' | 'timestamp'>): Promise<void>;
  getLatestPrice(symbol: string, type: string): Promise<PriceHistory | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getPositions(userId: string): Promise<Position[]> {
    return await db.select().from(positions).where(eq(positions.userId, userId));
  }

  async getPosition(id: string, userId: string): Promise<Position | undefined> {
    const [position] = await db
      .select()
      .from(positions)
      .where(and(eq(positions.id, id), eq(positions.userId, userId)));
    return position || undefined;
  }

  async createPosition(position: InsertPosition & { userId: string }): Promise<Position> {
    const [newPosition] = await db
      .insert(positions)
      .values({
        ...position,
        buyDate: new Date(position.buyDate),
      })
      .returning();
    return newPosition;
  }

  async updatePosition(id: string, updates: Partial<Position>): Promise<Position> {
    const [updatedPosition] = await db
      .update(positions)
      .set(updates)
      .where(eq(positions.id, id))
      .returning();
    return updatedPosition;
  }

  async deletePosition(id: string, userId: string): Promise<void> {
    await db
      .delete(positions)
      .where(and(eq(positions.id, id), eq(positions.userId, userId)));
  }

  async getClosedPositions(userId: string): Promise<ClosedPosition[]> {
    return await db
      .select()
      .from(closedPositions)
      .where(eq(closedPositions.userId, userId))
      .orderBy(desc(closedPositions.sellDate));
  }

  async deleteClosedPosition(id: string, userId: string): Promise<void> {
    await db.delete(closedPositions).where(and(eq(closedPositions.id, id), eq(closedPositions.userId, userId)));
  }

  async closePosition(positionId: string, userId: string, closeData: ClosePosition): Promise<ClosedPosition> {
    const position = await this.getPosition(positionId, userId);
    if (!position) {
      throw new Error("Position not found");
    }

    const sellPrice = parseFloat(closeData.sellPrice);
    const buyPrice = parseFloat(position.buyPrice);
    const quantity = position.quantity;
    
    const pl = (sellPrice - buyPrice) * quantity;
    const plPercent = ((sellPrice - buyPrice) / buyPrice) * 100;
    
    // No commission calculation needed anymore
    const commission = 0;

    const [closedPosition] = await db
      .insert(closedPositions)
      .values({
        userId,
        symbol: position.symbol,
        name: position.name,
        type: position.type,
        quantity: position.quantity,
        buyPrice: position.buyPrice,
        sellPrice: closeData.sellPrice,
        buyDate: position.buyDate,
        sellDate: new Date(closeData.sellDate),
        pl: pl.toString(),
        plPercent: plPercent.toString(),
        commission: commission.toString(),
      })
      .returning();

    // Delete the active position
    await this.deletePosition(positionId, userId);

    return closedPosition;
  }

  async savePriceHistory(priceData: Omit<PriceHistory, 'id' | 'timestamp'>): Promise<void> {
    await db.insert(priceHistory).values(priceData);
  }

  async getLatestPrice(symbol: string, type: string): Promise<PriceHistory | undefined> {
    const [latest] = await db
      .select()
      .from(priceHistory)
      .where(and(eq(priceHistory.symbol, symbol), eq(priceHistory.type, type)))
      .orderBy(desc(priceHistory.timestamp))
      .limit(1);
    return latest || undefined;
  }
}

// Temporarily use MemStorage due to database endpoint issues
export class MemStorage implements IStorage {
  private users: User[] = [];
  private positions: Position[] = [];
  private closedPositions: ClosedPosition[] = [];
  private priceHistory: PriceHistory[] = [];

  async getUser(id: string): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: randomUUID(),
      ...insertUser
    };
    this.users.push(user);
    return user;
  }

  async getPositions(userId: string): Promise<Position[]> {
    return this.positions.filter(position => position.userId === userId);
  }

  async getPosition(id: string, userId: string): Promise<Position | undefined> {
    return this.positions.find(position => position.id === id && position.userId === userId);
  }

  async createPosition(position: InsertPosition & { userId: string }): Promise<Position> {
    const newPosition: Position = {
      id: randomUUID(),
      userId: position.userId,
      symbol: position.symbol,
      name: position.name || null,
      type: position.type,
      quantity: position.quantity,
      buyPrice: position.buyPrice,
      buyDate: new Date(position.buyDate),
      currentPrice: null,
      lastUpdated: null,
      createdAt: null
    };
    this.positions.push(newPosition);
    return newPosition;
  }

  async updatePosition(id: string, updates: Partial<Position>): Promise<Position> {
    const index = this.positions.findIndex(position => position.id === id);
    if (index === -1) {
      throw new Error('Position not found');
    }
    this.positions[index] = { ...this.positions[index], ...updates };
    return this.positions[index];
  }

  async deletePosition(id: string, userId: string): Promise<void> {
    const index = this.positions.findIndex(position => position.id === id && position.userId === userId);
    if (index !== -1) {
      this.positions.splice(index, 1);
    }
  }

  async getClosedPositions(userId: string): Promise<ClosedPosition[]> {
    return this.closedPositions.filter(position => position.userId === userId);
  }

  async closePosition(positionId: string, userId: string, closeData: ClosePosition): Promise<ClosedPosition> {
    const position = await this.getPosition(positionId, userId);
    if (!position) {
      throw new Error('Position not found');
    }

    const profit = (parseFloat(closeData.sellPrice) - parseFloat(position.buyPrice)) * position.quantity;
    const profitPercent = ((parseFloat(closeData.sellPrice) - parseFloat(position.buyPrice)) / parseFloat(position.buyPrice)) * 100;
    
    const closedPosition: ClosedPosition = {
      id: randomUUID(),
      userId,
      symbol: position.symbol,
      name: position.name,
      type: position.type,
      quantity: position.quantity,
      buyPrice: position.buyPrice,
      sellPrice: closeData.sellPrice,
      buyDate: position.buyDate,
      sellDate: new Date(closeData.sellDate),
      pl: profit.toString(),
      plPercent: profitPercent.toString(),
      commission: '0',
      createdAt: null
    };

    this.closedPositions.push(closedPosition);
    await this.deletePosition(positionId, userId);
    return closedPosition;
  }

  async deleteClosedPosition(id: string, userId: string): Promise<void> {
    const index = this.closedPositions.findIndex(position => position.id === id && position.userId === userId);
    if (index !== -1) {
      this.closedPositions.splice(index, 1);
    }
  }

  async savePriceHistory(priceData: Omit<PriceHistory, 'id' | 'timestamp'>): Promise<void> {
    const entry: PriceHistory = {
      id: randomUUID(),
      ...priceData,
      timestamp: new Date()
    };
    this.priceHistory.push(entry);
  }

  async getLatestPrice(symbol: string, type: string): Promise<PriceHistory | undefined> {
    return this.priceHistory
      .filter(entry => entry.symbol === symbol && entry.type === type)
      .sort((a, b) => {
        const aTime = a.timestamp ? a.timestamp.getTime() : 0;
        const bTime = b.timestamp ? b.timestamp.getTime() : 0;
        return bTime - aTime;
      })[0];
  }
}

export const storage = new MemStorage();
