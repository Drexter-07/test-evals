import type { ClinicalExtraction, PerFieldScores } from "@test-evals/shared";
import * as fuzzball from "fuzzball";
import { fuzzyScore } from "./metrics/fuzzy";
import { computeSetF1 } from "./metrics/set-f1";
import { detectHallucinations, type HallucinationResult } from "./metrics/hallucination";
import { evaluateVitals } from "./metrics/exact";
import { normalizeDose, normalizeFrequency, normalizeString } from "./metrics/normalize";

function medMatchFn(p: any, g: any): boolean {
  if (fuzzyScore(p.name, g.name) < 0.8) return false;
  
  if (p.dose != null && g.dose != null && normalizeDose(p.dose) !== normalizeDose(g.dose)) return false;
  if (p.frequency != null && g.frequency != null && normalizeFrequency(p.frequency) !== normalizeFrequency(g.frequency)) return false;
  
  // Note: ignoring route for matching simplification as per problem statement
  return true;
}

function dxMatchFn(p: any, g: any): boolean {
  return fuzzyScore(p.description, g.description) > 0.8;
  // Note: bonus credit for icd10 match can be added by increasing F1 score slightly or tracking separately
}

function planMatchFn(p: string, g: string): boolean {
  return fuzzyScore(p, g) > 0.8;
}

function evaluateFollowUp(predicted: any, gold: any): number {
  if (!predicted && !gold) return 1.0;
  if (!predicted || !gold) return 0.0;

  let intervalScore = 0;
  if (predicted.interval_days === gold.interval_days) {
    intervalScore = 1.0;
  }
  
  const reasonScore = fuzzyScore(predicted.reason, gold.reason);
  return (intervalScore + reasonScore) / 2.0;
}

export interface EvaluationResult {
  scores: PerFieldScores;
  hallucinations: HallucinationResult[];
}

export function evaluateCase(
  prediction: ClinicalExtraction | null,
  gold: ClinicalExtraction,
  transcript: string
): EvaluationResult {
  if (!prediction) {
    return {
      scores: {
        chief_complaint: 0,
        vitals: 0,
        medications: 0,
        diagnoses: 0,
        plan: 0,
        follow_up: 0,
        overall: 0
      },
      hallucinations: []
    };
  }

  const scores: PerFieldScores = {
    chief_complaint: fuzzyScore(prediction.chief_complaint, gold.chief_complaint),
    vitals: evaluateVitals(prediction.vitals, gold.vitals),
    medications: computeSetF1(prediction.medications, gold.medications, medMatchFn).f1,
    diagnoses: computeSetF1(prediction.diagnoses, gold.diagnoses, dxMatchFn).f1,
    plan: computeSetF1(prediction.plan, gold.plan, planMatchFn).f1,
    follow_up: evaluateFollowUp(prediction.follow_up, gold.follow_up),
    overall: 0
  };

  scores.overall = (
    scores.chief_complaint + 
    scores.vitals + 
    scores.medications + 
    scores.diagnoses + 
    scores.plan + 
    scores.follow_up
  ) / 6.0;

  const hallucinations = detectHallucinations(prediction, transcript).filter(h => !h.grounded);

  return { scores, hallucinations };
}
