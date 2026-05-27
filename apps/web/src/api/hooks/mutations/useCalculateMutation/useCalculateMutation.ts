import { useMutation } from "@tanstack/react-query";
import { api } from "@/api";
import type { CombatInput } from "@/lib/calculator/types";

export const useCalculateMutation = () =>
  useMutation({
    mutationFn: (input: CombatInput) => api.calculate(input),
  });
