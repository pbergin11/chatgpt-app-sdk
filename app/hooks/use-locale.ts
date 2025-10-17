import { useOpenAIGlobal } from "./use-openai-global";

export function useLocale() {
  return useOpenAIGlobal("locale");
}
