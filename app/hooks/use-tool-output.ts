import { useOpenAIGlobal } from "./use-openai-global";

export function useToolOutput() {
  return useOpenAIGlobal("toolOutput");
}
