import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import type { UnitProfile } from "@/lib/calculator/types";

export const useGetUnitQuery = (id: string) =>
  useQuery<UnitProfile>({
    queryKey: ["unit", id],
    queryFn: () => api.getUnit(id),
    enabled: !!id,
  });
