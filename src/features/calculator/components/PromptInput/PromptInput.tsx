"use client";

import { useState } from "react";
import { CombatFormState } from "@/lib/calculator/types";
import { TextInput, Button, Stack, Group } from "@/ui";
import styles from "./PromptInput.module.css";

interface Props {
  onParsed: (state: CombatFormState) => void;
}

const PromptInput = ({ onParsed }: Props) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed");
      onParsed(data as CombatFormState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="xs">
      <Group gap="xs" align="flex-end">
        <TextInput
          className={styles.input}
          label="Describe the combat situation"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleParse()}
          placeholder="e.g. 10 intercessors shoot at 20 ork boyz in cover"
          error={error}
        />
        <Button
          onClick={handleParse}
          disabled={!prompt.trim()}
          loading={loading}
        >
          Parse
        </Button>
      </Group>
      <p className={styles.hint}>
        Powered by Claude Haiku — fills in the form below automatically.
      </p>
    </Stack>
  );
};

export default PromptInput;
