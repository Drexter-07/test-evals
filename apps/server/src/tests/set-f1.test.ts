import { expect, test } from "bun:test";
import { computeSetF1 } from "../services/metrics/set-f1";

test("Set-F1 correctness on a tiny synthetic case", () => {
  const gold = ["A", "B", "C"];
  const predicted = ["A", "B", "D"];
  
  const matchFn = (p: string, g: string) => p === g;
  const result = computeSetF1(predicted, gold, matchFn);

  // Precision = 2/3 (A and B are correct out of 3 predictions)
  expect(result.precision).toBeCloseTo(2/3);
  // Recall = 2/3 (A and B were found out of 3 gold)
  expect(result.recall).toBeCloseTo(2/3);
  // F1 = 2 * (P*R) / (P+R) = 2/3
  expect(result.f1).toBeCloseTo(2/3);
});

test("Set-F1 handles empty predictions", () => {
  const result = computeSetF1([], ["A", "B"], (p,g) => p===g);
  expect(result.f1).toBe(0);
});

test("Set-F1 handles perfect match", () => {
  const result = computeSetF1(["A", "B"], ["B", "A"], (p,g) => p===g);
  expect(result.f1).toBe(1);
});
