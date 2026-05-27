import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import type { UnitProfile } from "@/lib/calculator/types";

export const getUnitQueryOptions = (id: string) => ({
  queryKey: ["unit", id] as const,
  queryFn: () => api.getUnit(id),
});

export const useGetUnitQuery = (id: string) =>
  useQuery<UnitProfile>({
    ...getUnitQueryOptions(id),
    enabled: !!id,
  });
