import { useOpenAIGlobal } from "./use-openai-global";

export function useToolResponseMetadata() {
  return useOpenAIGlobal("toolResponseMetadata");
}
