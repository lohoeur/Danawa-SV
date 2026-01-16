import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

// Type definitions inferred from API schema
export type StatsQueryParams = z.infer<NonNullable<typeof api.stats.list.input>>;
export type CarSalesData = z.infer<typeof api.stats.list.responses[200]>[number];
export type EtlStatus = z.infer<typeof api.etl.status.responses[200]>;

export function useStats(params: StatsQueryParams) {
  // Construct URL with query params
  const queryString = new URLSearchParams();
  if (params.year) queryString.append("year", params.year.toString());
  if (params.month) queryString.append("month", params.month.toString());
  if (params.nation) queryString.append("nation", params.nation);
  if (params.minSales) queryString.append("minSales", params.minSales.toString());
  if (params.includeNew !== undefined) queryString.append("includeNew", params.includeNew.toString());

  const url = `${api.stats.list.path}?${queryString.toString()}`;

  return useQuery({
    queryKey: [api.stats.list.path, params],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch car sales stats");
      // Use safeParse or coerce in Zod if needed, but here we trust the API contract roughly
      // Ideally we parse with the response schema:
      return api.stats.list.responses[200].parse(await res.json());
    },
    // Keep data fresh but don't refetch aggressively
    staleTime: 1000 * 60 * 5, 
  });
}

export function useMonths() {
  return useQuery({
    queryKey: [api.stats.months.path],
    queryFn: async () => {
      const res = await fetch(api.stats.months.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch available months");
      return api.stats.months.responses[200].parse(await res.json());
    },
  });
}

export function useEtlStatus() {
  return useQuery({
    queryKey: [api.etl.status.path],
    queryFn: async () => {
      const res = await fetch(api.etl.status.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch ETL status");
      return api.etl.status.responses[200].parse(await res.json());
    },
    // Poll every 5 seconds if running, otherwise slower
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "running" ? 5000 : 30000;
    },
  });
}

export function useTriggerEtl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.etl.trigger.path, {
        method: api.etl.trigger.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to trigger data update");
      return api.etl.trigger.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      // Invalidate status to show "running" immediately
      queryClient.invalidateQueries({ queryKey: [api.etl.status.path] });
      // We might want to invalidate stats too, but usually only after it finishes
    },
  });
}
