import { useState, useEffect } from "react";
import { useStats, useMonths, StatsQueryParams } from "@/hooks/use-stats";
import { StatsCard, StatsCardSkeleton } from "@/components/StatsCard";
import { DashboardHeader } from "@/components/DashboardHeader";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertCircle, Filter, Car } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Dashboard() {
  const { data: months, isLoading: isLoadingMonths } = useMonths();
  
  // State for filters
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [nation, setNation] = useState<"domestic" | "export">("domestic");
  const [minSales, setMinSales] = useState([300]);
  const [includeNew, setIncludeNew] = useState(false);

  // Set default date when months are loaded
  useEffect(() => {
    if (months && months.length > 0 && !selectedDate) {
      const latest = months[0];
      setSelectedDate(`${latest.year}-${latest.month}`);
    }
  }, [months]);

  // Derived query params
  const queryParams: StatsQueryParams = {
    nation,
    minSales: minSales[0],
    includeNew,
  };

  if (selectedDate) {
    const [year, month] = selectedDate.split("-").map(Number);
    queryParams.year = year;
    queryParams.month = month;
  }

  const { data: cars, isLoading: isLoadingCars, isError } = useStats(queryParams);

  // Sorting: Prioritize Score primarily, but API might already sort. 
  // Let's sort client side by sales just to be safe if the API order isn't strict
  const sortedCars = cars ? [...cars].sort((a, b) => b.score - a.score) : [];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />
      
      <main className="flex-1 container py-8 space-y-8">
        
        {/* Controls Section */}
        <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
            
            {/* Left: Primary Filters */}
            <div className="flex flex-col sm:flex-row gap-6 w-full lg:w-auto">
              <div className="space-y-2 w-full sm:w-48">
                <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                  <Filter className="w-3 h-3" /> Period
                </Label>
                <Select 
                  value={selectedDate} 
                  onValueChange={setSelectedDate}
                  disabled={isLoadingMonths}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months?.map((m) => (
                      <SelectItem key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                        {m.year}.{String(m.month).padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 w-full sm:w-auto">
                <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                  <Car className="w-3 h-3" /> Market
                </Label>
                <Tabs value={nation} onValueChange={(v) => setNation(v as "domestic" | "export")} className="w-full sm:w-[200px]">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="domestic">Domestic</TabsTrigger>
                    <TabsTrigger value="export">Export</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Right: Secondary Filters */}
            <div className="flex flex-col sm:flex-row gap-8 w-full lg:w-auto items-start sm:items-center bg-secondary/30 p-4 rounded-lg border border-border/50">
              <div className="space-y-3 w-full sm:w-48">
                <div className="flex justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground">Min Sales</Label>
                  <span className="text-xs font-mono font-medium text-foreground">{minSales[0]} units</span>
                </div>
                <Slider 
                  value={minSales} 
                  onValueChange={setMinSales} 
                  max={5000} 
                  step={100} 
                  className="py-1"
                />
              </div>

              <div className="h-8 w-px bg-border hidden sm:block" />

              <div className="flex items-center space-x-3">
                <Switch 
                  id="new-models" 
                  checked={includeNew}
                  onCheckedChange={setIncludeNew}
                />
                <Label htmlFor="new-models" className="text-sm font-medium cursor-pointer">
                  Include New Models
                  <p className="text-xs text-muted-foreground font-normal">Show 0 prev. sales</p>
                </Label>
              </div>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-display">Rising Models</h2>
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-bold text-foreground">{sortedCars.length}</span> results
            </div>
          </div>

          {isError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load car sales data. Please try again later.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isLoadingCars || isLoadingMonths ? (
              Array.from({ length: 8 }).map((_, i) => (
                <StatsCardSkeleton key={i} />
              ))
            ) : sortedCars.length > 0 ? (
              sortedCars.map((car, index) => (
                <StatsCard key={car.id} car={car} index={index} />
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-card rounded-xl border border-dashed border-border">
                <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-foreground">No models found</h3>
                <p className="text-muted-foreground">Try adjusting your filters to see more results.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
