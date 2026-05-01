import { expect, test } from "bun:test";
import { evaluateCase } from "../services/evaluate.service";

test("Evaluate case handles empty prediction", () => {
  const gold = {
    chief_complaint: "headache",
    vitals: { bp: null, hr: null, temp_f: null, spo2: null },
    medications: [],
    diagnoses: [],
    plan: [],
    follow_up: { interval_days: null, reason: null }
  };

  const result = evaluateCase(null, gold, "Patient has a headache.");
  
  expect(result.scores.overall).toBe(0);
  expect(result.scores.chief_complaint).toBe(0);
  expect(result.hallucinations.length).toBe(0);
});
