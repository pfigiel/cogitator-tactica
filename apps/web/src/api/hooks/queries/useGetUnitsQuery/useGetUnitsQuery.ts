import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";

export const useGetUnitsQuery = () =>
  useQuery({
    queryKey: ["units"],
    queryFn: api.getUnits,
  });
