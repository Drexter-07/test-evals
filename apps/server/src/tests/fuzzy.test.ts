import { expect, test } from "bun:test";
import { fuzzyScore } from "../services/metrics/fuzzy";
import { normalizeString, normalizeFrequency, normalizeDose } from "../services/metrics/normalize";

test("Fuzzy string matching correctly handles case and minor differences", () => {
  const a = "Ibuprofen";
  const b = "ibuprofen";
  expect(fuzzyScore(a, b)).toBeGreaterThan(0.9);

  const c = "sore throat for 4 days";
  const d = "sore throat and nasal congestion for four days";
  expect(fuzzyScore(c, d)).toBeGreaterThan(0.6);
});

test("Normalize frequency maps abbreviations to full words", () => {
  expect(normalizeFrequency("BID")).toBe("twice daily");
  expect(normalizeFrequency("qd")).toBe("daily");
  expect(normalizeFrequency("PRN")).toBe("as needed");
  // Partial replacements
  expect(normalizeFrequency("take bid for pain")).toContain("twice daily");
});

test("Normalize dose removes spaces between numbers and letters", () => {
  expect(normalizeDose("10 mg")).toBe("10mg");
  expect(normalizeDose("400   milligrams")).toBe("400milligrams");
});
