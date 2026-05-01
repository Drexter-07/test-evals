import type { PromptStrategy } from "@test-evals/shared";
import { getZeroShotPrompt } from "./zero-shot";
import { getFewShotPrompt } from "./few-shot";
import { getCotPrompt } from "./cot";

export function getSystemPrompt(strategy: PromptStrategy): string {
  switch (strategy) {
    case "zero_shot":
      return getZeroShotPrompt();
    case "few_shot":
      return getFewShotPrompt();
    case "cot":
      return getCotPrompt();
    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }
}
