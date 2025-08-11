import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  symbol: text("symbol").notNull(),
  name: text("name"),
  type: text("type").notNull(), // 'stock' or 'fund'
  quantity: integer("quantity").notNull(),
  buyPrice: decimal("buy_price", { precision: 12, scale: 6 }).notNull(),
  buyDate: timestamp("buy_date").notNull(),
  currentPrice: decimal("current_price", { precision: 12, scale: 6 }),
  lastUpdated: timestamp("last_updated").default(sql`now()`),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const closedPositions = pgTable("closed_positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  symbol: text("symbol").notNull(),
  name: text("name"),
  type: text("type").notNull(),
  quantity: integer("quantity").notNull(),
  buyPrice: decimal("buy_price", { precision: 12, scale: 6 }).notNull(),
  sellPrice: decimal("sell_price", { precision: 12, scale: 6 }).notNull(),
  buyDate: timestamp("buy_date").notNull(),
  sellDate: timestamp("sell_date").notNull(),
  pl: decimal("pl", { precision: 10, scale: 2 }).notNull(),
  plPercent: decimal("pl_percent", { precision: 5, scale: 2 }).notNull(),
  commission: decimal("commission", { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const priceHistory = pgTable("price_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  type: text("type").notNull(),
  price: decimal("price", { precision: 12, scale: 6 }).notNull(),
  change: decimal("change", { precision: 5, scale: 2 }).default('0'),
  changePercent: decimal("change_percent", { precision: 5, scale: 2 }).default('0'),
  timestamp: timestamp("timestamp").default(sql`now()`),
});

export const positionsRelations = relations(positions, ({ one }) => ({
  user: one(users, {
    fields: [positions.userId],
    references: [users.id],
  }),
}));

export const closedPositionsRelations = relations(closedPositions, ({ one }) => ({
  user: one(users, {
    fields: [closedPositions.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
  userId: true,
  currentPrice: true,
  lastUpdated: true,
  createdAt: true,
}).extend({
  symbol: z.string().min(1, "Varlık kodu gerekli"),
  quantity: z.number().min(1, "Adet en az 1 olmalı"),
  buyPrice: z.string().refine((val) => {
    const parsed = parseFloat(val.replace(',', '.'));
    return !isNaN(parsed) && parsed > 0;
  }, "Alış fiyatı 0'dan büyük olmalı"),
  buyDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Geçerli bir tarih giriniz"),
  type: z.enum(["stock", "fund"], { required_error: "Varlık türü seçilmeli" }),
});

export const closePositionSchema = z.object({
  sellPrice: z.string().refine((val) => {
    const parsed = parseFloat(val.replace(',', '.'));
    return !isNaN(parsed) && parsed > 0;
  }, "Satış fiyatı 0'dan büyük olmalı"),
  sellDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Geçerli bir tarih giriniz"),
});

// BIST symbols table for market data
export const bistSymbols = pgTable("bist_symbols", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  sector: text("sector"),
  marketCap: text("market_cap"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertBistSymbolSchema = createInsertSchema(bistSymbols).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type ClosedPosition = typeof closedPositions.$inferSelect;
export type ClosePosition = z.infer<typeof closePositionSchema>;
export type PriceHistory = typeof priceHistory.$inferSelect;
export type BistSymbol = typeof bistSymbols.$inferSelect;
export type InsertBistSymbol = z.infer<typeof insertBistSymbolSchema>;
