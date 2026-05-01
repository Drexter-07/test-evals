import { expect, test } from "bun:test";
import { validateExtraction } from "@test-evals/llm/src/retry";

test("Schema validation passes valid extraction", () => {
  const validData = {
    chief_complaint: "chest pain",
    vitals: { bp: null, hr: null, temp_f: null, spo2: null },
    medications: [],
    diagnoses: [],
    plan: [],
    follow_up: { interval_days: null, reason: null }
  };

  const result = validateExtraction(validData);
  expect(result.valid).toBe(true);
  expect(result.errors.length).toBe(0);
});

test("Schema validation fails on missing required field", () => {
  const invalidData = {
    chief_complaint: "chest pain"
    // missing everything else
  };

  const result = validateExtraction(invalidData);
  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
});
