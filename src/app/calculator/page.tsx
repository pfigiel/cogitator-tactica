"use client";

import { useRouter } from "next/navigation";
import { CombatFormState } from "@/lib/calculator/types";
import { useCalculator } from "@/features/calculator/context/CalculatorContext";
import PromptInput from "@/features/calculator/components/PromptInput/PromptInput";
import styles from "./page.module.css";

const CalculatorPage = () => {
  const router = useRouter();
  const { setHandoff } = useCalculator();

  const handleParsed = (form: CombatFormState, prompt: string) => {
    setHandoff({ form, prompt, autoSubmit: false });
    router.push("/calculator/results");
  };

  const handleSimulate = (form: CombatFormState, prompt: string) => {
    setHandoff({ form, prompt, autoSubmit: true });
    router.push("/calculator/results");
  };

  return (
    <main className={styles.page}>
      <div className={styles.promptWrap}>
        <PromptInput onParsed={handleParsed} onSimulate={handleSimulate} />
      </div>
    </main>
  );
};

export default CalculatorPage;
