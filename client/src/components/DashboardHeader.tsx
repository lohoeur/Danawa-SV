import { RefreshCw, Database } from "lucide-react";
import { useEtlStatus, useTriggerEtl } from "@/hooks/use-stats";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function DashboardHeader() {
  const { data: status, isLoading } = useEtlStatus();
  const { mutate: triggerEtl, isPending: isTriggering } = useTriggerEtl();
  const { toast } = useToast();

  const handleUpdate = () => {
    triggerEtl(undefined, {
      onSuccess: () => {
        toast({
          title: "Update Started",
          description: "The data extraction process has been triggered.",
        });
      },
      onError: () => {
        toast({
          title: "Update Failed",
          description: "Could not start the update process. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const isRunning = status?.status === 'running' || isTriggering;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight font-display hidden md:block">
            Danawa <span className="text-primary">Sales Radar</span>
          </h1>
          <h1 className="text-xl font-bold tracking-tight font-display md:hidden">
            Sales<span className="text-primary">Radar</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs text-muted-foreground hidden sm:block text-right">
            <p>Last updated</p>
            <p className="font-medium text-foreground">
              {isLoading ? "Loading..." : status?.lastRun ? format(new Date(status.lastRun), 'MMM d, HH:mm') : 'Never'}
            </p>
          </div>

          <Button 
            onClick={handleUpdate} 
            disabled={isRunning}
            size="sm"
            className={`
              gap-2 font-medium transition-all
              ${isRunning ? 'opacity-80' : 'hover:shadow-md'}
            `}
          >
            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Updating...' : 'Update Data'}
          </Button>
        </div>
      </div>
    </header>
  );
}
