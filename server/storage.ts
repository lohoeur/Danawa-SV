
import { db } from "./db";
import { carSales, type InsertCarSales, type CarSales } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Stats
  getStats(params: { year?: number; month?: number; nation?: 'domestic' | 'export'; minSales?: number; includeNew?: boolean }): Promise<CarSales[]>;
  getAvailableMonths(): Promise<{ year: number; month: number }[]>;
  
  // ETL / Data Management
  upsertCarSales(sales: InsertCarSales[]): Promise<void>;
  getLatestMonth(nation: 'domestic' | 'export'): Promise<{ year: number; month: number } | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getStats(params: { year?: number; month?: number; nation?: 'domestic' | 'export'; minSales?: number; includeNew?: boolean }): Promise<CarSales[]> {
    const conditions = [];

    if (params.year) conditions.push(eq(carSales.year, params.year));
    if (params.month) conditions.push(eq(carSales.month, params.month));
    if (params.nation) conditions.push(eq(carSales.nation, params.nation));
    
    // Minimum sales filter (default 300 if not specified, but let route handle default)
    if (params.minSales !== undefined) {
      conditions.push(sql`${carSales.sales} >= ${params.minSales}`);
    }

    // New entry filter: if includeNew is false, we filter OUT prevSales = 0
    if (params.includeNew === false) {
      conditions.push(sql`${carSales.prevSales} > 0`);
    }

    return await db.select()
      .from(carSales)
      .where(and(...conditions))
      .orderBy(desc(carSales.score)); // Default sort by score
  }

  async getAvailableMonths(): Promise<{ year: number; month: number }[]> {
    return await db.selectDistinct({ year: carSales.year, month: carSales.month })
      .from(carSales)
      .orderBy(desc(carSales.year), desc(carSales.month));
  }

  async upsertCarSales(salesData: InsertCarSales[]): Promise<void> {
    if (salesData.length === 0) return;

    // Use a transaction to ensure integrity, or simple loop with upsert
    // Since we scrape full months, we can clear the month/nation combination and re-insert, 
    // OR use ON CONFLICT. For simplicity in MVP, let's delete existing for that month/nation and insert fresh.
    
    // Group by month/year/nation to handle batching if mixed data comes in (unlikely)
    // Assuming salesData is all for one period/nation usually.
    
    const first = salesData[0];
    await db.transaction(async (tx) => {
      // 1. Clear existing data for this specific period and nation to avoid duplicates
      await tx.delete(carSales)
        .where(and(
          eq(carSales.year, first.year),
          eq(carSales.month, first.month),
          eq(carSales.nation, first.nation)
        ));

      // 2. Insert new data
      await tx.insert(carSales).values(salesData);
    });
  }

  async getLatestMonth(nation: 'domestic' | 'export'): Promise<{ year: number; month: number } | undefined> {
    const [result] = await db.select({ year: carSales.year, month: carSales.month })
      .from(carSales)
      .where(eq(carSales.nation, nation))
      .orderBy(desc(carSales.year), desc(carSales.month))
      .limit(1);
    
    return result;
  }
}

export const storage = new DatabaseStorage();
