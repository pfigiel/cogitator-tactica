"use client";

import { createContext, useContext, useState } from "react";
import { CombatFormState } from "@/lib/calculator/types";

export type CalculatorHandoff = {
  form: CombatFormState;
  prompt: string;
  autoSubmit: boolean;
};

type CalculatorContextValue = {
  handoff: CalculatorHandoff | null;
  setHandoff: (h: CalculatorHandoff) => void;
};

const CalculatorContext = createContext<CalculatorContextValue | null>(null);

type Props = {
  children: React.ReactNode;
};

export const CalculatorProvider = ({ children }: Props) => {
  const [handoff, setHandoff] = useState<CalculatorHandoff | null>(null);

  return (
    <CalculatorContext.Provider value={{ handoff, setHandoff }}>
      {children}
    </CalculatorContext.Provider>
  );
};

export const useCalculator = (): CalculatorContextValue => {
  const ctx = useContext(CalculatorContext);
  if (!ctx)
    throw new Error("useCalculator must be used within CalculatorProvider");
  return ctx;
};
