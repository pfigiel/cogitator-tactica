import { useMutation } from "@tanstack/react-query";
import { api } from "@/api";

export const useParsePromptMutation = () =>
  useMutation({
    mutationFn: (prompt: string) => api.parsePrompt(prompt),
  });
