import { useOpenAIGlobal } from "./use-openai-global";

export function useToolInput() {
  return useOpenAIGlobal("toolInput");
}
