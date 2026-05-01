import Anthropic from "@anthropic-ai/sdk";
import { env } from "@test-evals/env/server";
import { type ClinicalExtraction, type PromptStrategy, type AttemptLog, MAX_RETRIES } from "@test-evals/shared";
import { getSystemPrompt } from "./strategies";
import { extractionToolSchema } from "./tool-schema";
import { validateExtraction } from "./retry";

const client = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

export interface ExtractionResult {
  extraction: ClinicalExtraction | null;
  attempts: AttemptLog[];
  schemaValid: boolean;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export async function extractClinicalData(
  transcript: string,
  strategy: PromptStrategy,
  model: string
): Promise<ExtractionResult> {
  const systemPrompt = getSystemPrompt(strategy);
  
  const attempts: AttemptLog[] = [];
  let extraction: ClinicalExtraction | null = null;
  let schemaValid = false;

  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;

  let messages: Anthropic.MessageParam[] = [
    { role: "user", content: transcript }
  ];

  for (let i = 0; i < MAX_RETRIES; i++) {
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages,
      tools: [extractionToolSchema as any],
      tool_choice: { type: "tool", name: "extract_clinical_data" }
    });

    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;
    // Note: older SDK versions might not type cache_read_input_tokens properly
    const usageAny = response.usage as any;
    cacheReadTokens += usageAny.cache_read_input_tokens || 0;
    cacheWriteTokens += usageAny.cache_creation_input_tokens || 0;

    const toolUseBlock = response.content.find((b: any) => b.type === "tool_use" && b.name === "extract_clinical_data");
    
    if (!toolUseBlock || !("input" in toolUseBlock)) {
      attempts.push({
        request: messages,
        response: response.content,
        valid: false,
        errors: ["Model did not use the extract_clinical_data tool"]
      });
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: "You must use the extract_clinical_data tool to output JSON." });
      continue;
    }

    const rawInput = toolUseBlock.input;
    const validation = validateExtraction(rawInput);
    
    attempts.push({
      request: messages,
      response: toolUseBlock.input,
      valid: validation.valid,
      errors: validation.errors
    });

    if (validation.valid) {
      extraction = rawInput as ClinicalExtraction;
      schemaValid = true;
      break;
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUseBlock.id,
          content: `Validation failed with errors: ${JSON.stringify(validation.errors)}. Please fix these and try again.`
        }
      ]
    });
  }

  return {
    extraction,
    attempts,
    schemaValid,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens
  };
}
