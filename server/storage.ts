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
    const quantity = parseFloat(position.quantity);
    
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
        quantity: position.quantity, // Keep as string for decimal type
        buyPrice: position.buyPrice,
        buyRate: position.buyRate,
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

export const storage = new DatabaseStorage();
