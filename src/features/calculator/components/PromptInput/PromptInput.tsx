// src/features/calculator/components/PromptInput/PromptInput.tsx
"use client";

import { useState } from "react";
import { CombatFormState } from "@/lib/calculator/types";
import { Textarea, Button, Stack } from "@/ui";
import styles from "./PromptInput.module.css";
import clsx from "clsx";

type Props = {
  className?: string;
  compact?: boolean;
  initialPrompt?: string;
  onParsed: (state: CombatFormState, prompt: string) => void;
  onSimulate: (state: CombatFormState, prompt: string) => void;
};

const PromptInput = ({
  className,
  compact,
  initialPrompt,
  onParsed,
  onSimulate,
}: Props) => {
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [loadingAction, setLoadingAction] = useState<
    "parse" | "simulate" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const parse = async (
    action: "parse" | "simulate",
  ): Promise<CombatFormState | null> => {
    if (!prompt.trim()) return null;
    setLoadingAction(action);
    setError(null);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed");
      return data as CombatFormState;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setLoadingAction(null);
    }
  };

  const handleParse = async () => {
    const state = await parse("parse");
    if (state) onParsed(state, prompt);
  };

  const handleSimulate = async () => {
    const state = await parse("simulate");
    if (state) onSimulate(state, prompt);
  };

  return (
    <Stack className={className} gap={compact ? "xs" : "md"} align="center">
      {!compact && (
        <p className={styles.tagline}>
          Describe the engagement parameters. Probability matrices will be
          computed and rendered for your strategic calculus.
        </p>
      )}
      <div className={styles.inputWrap}>
        <Textarea
          className={styles.textArea}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="10 intercessors with bolt rifles shoot at 20 ork boyz in cover"
          error={error}
          minRows={compact ? 1 : 3}
          autosize
        />
        <div className={clsx(styles.buttons, compact && styles.buttonsCompact)}>
          <Button
            variant="default"
            onClick={handleParse}
            disabled={!prompt.trim() || loadingAction !== null}
            loading={loadingAction === "parse"}
            fullWidth
          >
            {compact ? "Parse" : "Parse report"}
          </Button>
          <Button
            color="yellow"
            onClick={handleSimulate}
            disabled={!prompt.trim() || loadingAction !== null}
            loading={loadingAction === "simulate"}
            fullWidth
          >
            {compact ? "Engage" : "Engage cogitator"}
          </Button>
        </div>
      </div>
    </Stack>
  );
};

export default PromptInput;
