import { useOpenAIGlobal } from "./use-openai-global";

export function useSafeArea() {
  return useOpenAIGlobal("safeArea");
}
