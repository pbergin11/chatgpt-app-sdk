import { useOpenAIGlobal } from "./use-openai-global";

export function useTheme() {
  return useOpenAIGlobal("theme");
}
