import { useMutation } from "@tanstack/react-query";
import { api } from "@/api";
import type { CombatInput } from "@/features/calculator/types";

export const useCalculateMutation = () =>
  useMutation({
    mutationFn: (input: CombatInput) => api.calculate(input),
  });
