import { CarSalesData } from "@/hooks/use-stats";
import { ArrowUp, ArrowDown, ExternalLink, Minus, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface StatsCardProps {
  car: CarSalesData;
  index: number;
}

export function StatsCard({ car, index }: StatsCardProps) {
  const isNew = car.prevSales === 0;
  const isPositive = car.momAbs > 0;
  const isNeutral = car.momAbs === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group relative flex flex-col justify-between p-6 bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 overflow-hidden"
    >
      {/* Decorative background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-secondary-foreground font-mono font-bold text-sm">
              #{car.rank}
            </div>
            {isNew && (
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 rounded-full">
                New Entry
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
             {car.rankChange > 0 ? (
               <span className="flex items-center text-positive">
                 <ArrowUp className="w-3 h-3 mr-0.5" /> {car.rankChange}
               </span>
             ) : car.rankChange < 0 ? (
                <span className="flex items-center text-negative">
                  <ArrowDown className="w-3 h-3 mr-0.5" /> {Math.abs(car.rankChange)}
                </span>
             ) : (
               <span className="flex items-center text-muted-foreground">
                 <Minus className="w-3 h-3 mr-0.5" /> 0
               </span>
             )}
             <span className="ml-1 opacity-50">rank</span>
          </div>
        </div>

        <h3 className="text-xl font-bold font-display text-foreground mb-1 group-hover:text-primary transition-colors">
          {car.modelName}
        </h3>
        
        <div className="text-3xl font-bold text-foreground tracking-tight mb-6">
          {car.sales.toLocaleString()} <span className="text-base font-normal text-muted-foreground">units</span>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">MoM Growth</p>
            <div className={`flex items-baseline text-lg font-bold ${isPositive ? 'text-positive' : isNeutral ? 'text-muted-foreground' : 'text-negative'}`}>
              {isPositive ? '+' : ''}{car.momAbs.toLocaleString()}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Growth %</p>
            <div className={`flex items-center text-lg font-bold ${isPositive ? 'text-positive' : isNeutral ? 'text-muted-foreground' : 'text-negative'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4 mr-1.5" /> : null}
              {isPositive ? '+' : ''}{car.momPct.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-6 pt-2">
        <a
          href={car.dataUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary/50 hover:bg-secondary hover:text-foreground rounded-lg transition-colors group/btn"
        >
          View on Danawa
          <ExternalLink className="w-3.5 h-3.5 ml-2 opacity-50 group-hover/btn:opacity-100 transition-opacity" />
        </a>
      </div>
    </motion.div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="p-6 bg-card border border-border rounded-xl shadow-sm animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="w-8 h-8 rounded-lg bg-muted" />
        <div className="w-12 h-4 rounded bg-muted" />
      </div>
      <div className="h-6 w-3/4 bg-muted rounded mb-2" />
      <div className="h-8 w-1/2 bg-muted rounded mb-6" />
      <div className="border-t border-border/50 pt-4 grid grid-cols-2 gap-4">
        <div className="h-10 bg-muted rounded" />
        <div className="h-10 bg-muted rounded" />
      </div>
      <div className="mt-6 h-9 bg-muted rounded" />
    </div>
  );
}
