
import { pgTable, text, serial, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const carSales = pgTable("car_sales", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  nation: text("nation").notNull(), // 'domestic' | 'export'
  modelName: text("model_name").notNull(),
  sales: integer("sales").notNull(),
  rank: integer("rank").notNull(),
  
  // Derived metrics
  prevSales: integer("prev_sales").default(0),
  momAbs: integer("mom_abs").default(0),
  momPct: real("mom_pct").default(0.0),
  rankChange: integer("rank_change").default(0),
  score: real("score").default(0.0),
  
  // Metadata
  dataUrl: text("data_url").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCarSalesSchema = createInsertSchema(carSales).omit({ 
  id: true, 
  updatedAt: true 
});

export type CarSales = typeof carSales.$inferSelect;
export type InsertCarSales = z.infer<typeof insertCarSalesSchema>;

// API Types
export type CarSalesResponse = CarSales;

export interface StatsQueryParams {
  year?: number;
  month?: number;
  nation?: 'domestic' | 'export';
  minSales?: number;
  includeNew?: boolean; // If true, include prevSales=0
}

export interface EtlStatusResponse {
  lastRun: string | null;
  status: 'idle' | 'running' | 'failed' | 'success';
  message?: string;
}
