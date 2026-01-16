
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import * as cheerio from "cheerio";
import axios from "axios";

// --- ETL Logic ---

interface ScrapedRow {
  rank: number;
  modelName: string;
  sales: number;
  prevSales: number; // Derived from page text or calculated if we fetch prev month
  rankChange: number;
}

// Helper to scrape Danawa
async function scrapeDanawa(year: number, month: number, nation: 'domestic' | 'export') {
  const url = `https://auto.danawa.com/auto/?Month=${year}-${String(month).padStart(2, '0')}-00&Nation=${nation}&Tab=Model&Work=record`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(data);
    const results: ScrapedRow[] = [];
    
    // Select the table rows. The selector might need adjustment based on actual Danawa HTML structure.
    // Based on typical table structures:
    const rows = $('table.recordTable tbody tr');

    rows.each((_, element) => {
      const row = $(element);
      
      // Skip if it's a trim/detail row (usually has different class or structure)
      // Heuristic: Check if it has a rank number.
      const rankText = row.find('.rank').text().trim();
      const rank = parseInt(rankText);
      if (isNaN(rank)) return; // Skip rows without rank

      const modelName = row.find('.title a').text().trim(); // Adjust selector
      if (!modelName) return;

      // Sales Volume
      const salesText = row.find('.sales').text().trim().replace(/,/g, '');
      const sales = parseInt(salesText) || 0;

      // Previous Month Comparison (Often shown as "+100" or "-50")
      // Danawa often shows "Diff" column. 
      // If we can't parse prevSales directly, we calculate it: prevSales = sales - diff
      // Let's assume we can scrape the "Diff" value.
      let diff = 0;
      const diffText = row.find('.diff').text().trim().replace(/,/g, '');
      if (diffText.includes('▲')) {
         diff = parseInt(diffText.replace('▲', '')) || 0;
      } else if (diffText.includes('▼')) {
         diff = -(parseInt(diffText.replace('▼', '')) || 0);
      } else if (diffText === '-') {
         diff = 0;
      } else {
         // Try parsing bare number
         diff = parseInt(diffText) || 0;
      }

      // Rank Change
      let rankChange = 0;
      const rankDiffText = row.find('.rankChange').text().trim(); // Adjust selector
      // Logic for rank change parsing... similar to diff
       if (rankDiffText.includes('▲')) {
         rankChange = parseInt(rankDiffText.replace('▲', '')) || 0;
      } else if (rankDiffText.includes('▼')) {
         rankChange = -(parseInt(rankDiffText.replace('▼', '')) || 0);
      }

      // Calculate Prev Sales derived from current and diff
      // If diff is "increase from prev", then prev = current - diff
      const prevSales = sales - diff;

      results.push({
        rank,
        modelName,
        sales,
        prevSales,
        rankChange
      });
    });

    return { results, url };
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error);
    throw new Error('Failed to fetch data from Danawa');
  }
}

// Standard Score (Z-Score) helper
function calculateZScores(values: number[]) {
  const n = values.length;
  if (n === 0) return [];
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n) || 1; // Avoid divide by zero
  return values.map(v => (v - mean) / stdDev);
}

// ETL Orchestrator
async function runEtlJob() {
  const date = new Date();
  // We want the "latest closed month".
  // If today is Jan 5th, we probably want December data.
  // Logic: Data usually available by 1st (Domestic) or 15th (Import).
  // Let's fetch the *previous* month by default as it's the most likely complete one.
  // Or simpler: fetch Current Month AND Previous Month to be safe, but let's stick to Previous Month for stability.
  
  // Correction: User said "Month-1" is usually the target.
  const targetDate = new Date();
  targetDate.setDate(1); // Go to 1st of current month
  targetDate.setMonth(targetDate.getMonth() - 1); // Go back one month
  
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1; // 0-indexed to 1-indexed

  const nations: ('domestic' | 'export')[] = ['domestic', 'export'];
  
  for (const nation of nations) {
    console.log(`Starting ETL for ${year}-${month} (${nation})...`);
    
    // 1. Scrape
    // Note: In a real implementation, we might need to adjust selectors in scrapeDanawa
    // For this MVP, we will simulate if scraping fails (or if we can't implement real scraping without valid selectors)
    // But let's try to structure it so it works with the real URL.
    // Since I can't see the real DOM structure in this environment, I'll assume standard class names
    // If it fails, I might fallback to dummy data for demonstration if requested, but code intends to scrape.
    const { results, url } = await scrapeDanawa(year, month, nation);
    
    if (results.length === 0) {
      console.warn(`No data found for ${year}-${month} (${nation})`);
      continue;
    }

    // 2. Calculate Metrics & Scores
    const enrichedResults = results.map(r => {
      const momAbs = r.sales - r.prevSales;
      // Cap max pct for new entries (prevSales=0)
      let momPct = r.prevSales > 0 ? momAbs / r.prevSales : 5.0; // 500% cap or treated as high score
      if (momPct > 5.0) momPct = 5.0; 

      return { ...r, momAbs, momPct };
    });

    // Calculate Scores
    // score = 0.55 * z(mom_abs) + 0.35 * z(mom_pct) + 0.10 * z(rank_change)
    const momAbsList = enrichedResults.map(r => r.momAbs);
    const momPctList = enrichedResults.map(r => r.momPct);
    const rankChangeList = enrichedResults.map(r => r.rankChange);

    const zMomAbs = calculateZScores(momAbsList);
    const zMomPct = calculateZScores(momPctList);
    const zRankChange = calculateZScores(rankChangeList);

    const finalData = enrichedResults.map((r, i) => {
      const score = (0.55 * zMomAbs[i]) + (0.35 * zMomPct[i]) + (0.10 * zRankChange[i]);
      return {
        year,
        month,
        nation,
        modelName: r.modelName,
        sales: r.sales,
        rank: r.rank,
        prevSales: r.prevSales,
        momAbs: r.momAbs,
        momPct: r.momPct, // Store as float (e.g., 0.15 for 15%)
        rankChange: r.rankChange,
        score,
        dataUrl: url
      };
    });

    // 3. Save to DB
    await storage.upsertCarSales(finalData);
    console.log(`Saved ${finalData.length} records for ${nation}.`);
  }
}

// --- Routes ---

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // CORS configuration for Netlify
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Allow Netlify domain or all origins for MVP
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.get(api.stats.list.path, async (req, res) => {
    try {
      const params = api.stats.list.input.optional().parse(req.query || {});
      const stats = await storage.getStats(params);
      res.json(stats);
    } catch (error) {
       // @ts-ignore
      res.status(400).json({ message: error.message });
    }
  });

  app.get(api.stats.months.path, async (req, res) => {
    const months = await storage.getAvailableMonths();
    res.json(months);
  });

  // ETL Trigger (Manual for MVP)
  let isEtlRunning = false;
  let lastEtlRun: string | null = null;
  let lastEtlStatus: 'idle' | 'running' | 'failed' | 'success' = 'idle';

  app.post(api.etl.trigger.path, async (req, res) => {
    if (isEtlRunning) {
      return res.status(409).json({ message: "ETL Job is already running", success: false });
    }

    isEtlRunning = true;
    lastEtlStatus = 'running';
    
    // Run async without awaiting to return response immediately
    runEtlJob()
      .then(() => {
        isEtlRunning = false;
        lastEtlStatus = 'success';
        lastEtlRun = new Date().toISOString();
        console.log("ETL Job completed successfully.");
      })
      .catch((err) => {
        isEtlRunning = false;
        lastEtlStatus = 'failed';
        console.error("ETL Job failed:", err);
      });

    res.json({ message: "ETL Job started", success: true });
  });

  app.get(api.etl.status.path, (req, res) => {
    res.json({
      lastRun: lastEtlRun,
      status: lastEtlStatus
    });
  });

  // Seed Data (if empty)
  const existing = await storage.getAvailableMonths();
  if (existing.length === 0) {
    console.log("Database empty, inserting mock data...");
    await seedDatabase();
  }

  return httpServer;
}

// Mock Data Seeder for immediate visualization
async function seedDatabase() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed, so simple math works
  // Just ensure month is valid (1-12)
  const month = currentMonth === 0 ? 12 : currentMonth; 
  const year = currentMonth === 0 ? currentYear - 1 : currentYear;

  const mockData = [
    { modelName: "Grandeur", sales: 8500, prevSales: 7200, rank: 1, rankChange: 0, nation: 'domestic' },
    { modelName: "Sorento", sales: 7100, prevSales: 6800, rank: 2, rankChange: 0, nation: 'domestic' },
    { modelName: "Carnival", sales: 6200, prevSales: 5000, rank: 3, rankChange: 1, nation: 'domestic' },
    { modelName: "Santa Fe", sales: 5800, prevSales: 2000, rank: 4, rankChange: 5, nation: 'domestic' }, // Rising star!
    { modelName: "Avante", sales: 4500, prevSales: 4600, rank: 5, rankChange: -1, nation: 'domestic' },
    { modelName: "E-Class", sales: 2100, prevSales: 1800, rank: 1, rankChange: 0, nation: 'export' },
    { modelName: "5 Series", sales: 1900, prevSales: 2200, rank: 2, rankChange: -1, nation: 'export' },
    { modelName: "Model Y", sales: 1500, prevSales: 300, rank: 3, rankChange: 10, nation: 'export' }, // Rising!
  ];

  // Manual Enrichment similar to ETL
  const enriched = mockData.map(d => {
    const momAbs = d.sales - d.prevSales;
    const momPct = d.prevSales > 0 ? momAbs / d.prevSales : 5.0;
    // Dummy score logic for seed
    const score = (momAbs > 0 ? 1 : 0) + (d.rankChange > 0 ? 1 : 0) + Math.random(); 
    
    return {
      year,
      month,
      nation: d.nation as 'domestic' | 'export',
      modelName: d.modelName,
      sales: d.sales,
      rank: d.rank,
      prevSales: d.prevSales,
      momAbs,
      momPct,
      rankChange: d.rankChange,
      score,
      dataUrl: "https://auto.danawa.com/auto/?Work=record"
    };
  });

  await storage.upsertCarSales(enriched);
  console.log("Mock data seeded.");
}
