import { expect, test } from "bun:test";
import { hashPrompt } from "@test-evals/llm/src/prompt-hash";

test("Prompt hash stability", () => {
  const prompt1 = "This is a prompt.";
  const prompt2 = "This is a prompt.";
  const prompt3 = "This is a prompt!";

  const hash1 = hashPrompt(prompt1);
  const hash2 = hashPrompt(prompt2);
  const hash3 = hashPrompt(prompt3);

  expect(hash1).toBe(hash2);
  expect(hash1).not.toBe(hash3);
});
