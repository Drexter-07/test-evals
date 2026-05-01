import { expect, test } from "bun:test";
import { exactMatch, exactMatchWithTolerance, evaluateVitals } from "../services/metrics/exact";

test("Exact match handles nulls correctly", () => {
  expect(exactMatch(null, null)).toBe(1.0);
  expect(exactMatch("A", null)).toBe(0.0);
  expect(exactMatch(null, "A")).toBe(0.0);
  expect(exactMatch("A", "A")).toBe(1.0);
});

test("Exact match with tolerance", () => {
  expect(exactMatchWithTolerance(98.6, 98.6, 0.2)).toBe(1.0);
  expect(exactMatchWithTolerance(98.6, 98.7, 0.2)).toBe(1.0);
  expect(exactMatchWithTolerance(98.6, 99.0, 0.2)).toBe(0.0);
});

test("Evaluate vitals aggregates scores", () => {
  const gold = { bp: "120/80", hr: 80, temp_f: 98.6, spo2: 98 };
  const pred = { bp: "120/80", hr: 80, temp_f: 98.7, spo2: 95 }; // spo2 is wrong, temp is within tolerance
  
  // 3 out of 4 correct -> 0.75
  expect(evaluateVitals(pred, gold)).toBe(0.75);
});
