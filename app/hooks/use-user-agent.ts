import { useOpenAIGlobal } from "./use-openai-global";
import type { UserAgent } from "./types";

export function useUserAgent(): UserAgent | null {
  return useOpenAIGlobal("userAgent");
}
