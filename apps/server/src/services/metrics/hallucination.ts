import { normalizeString } from "./normalize";
import * as fuzzball from "fuzzball";

export interface HallucinationResult {
  field: string;
  value: string;
  grounded: boolean;
}

export function detectHallucinations(prediction: any, transcript: string): HallucinationResult[] {
  const normTranscript = normalizeString(transcript);
  const results: HallucinationResult[] = [];

  function checkValue(field: string, value: string | null | undefined) {
    if (!value) return;
    const normVal = normalizeString(value);
    if (!normVal) return;

    // Check if substring
    if (normTranscript.includes(normVal)) {
      results.push({ field, value, grounded: true });
      return;
    }

    // Check fuzzy match against chunks of transcript (token_set_ratio handles partials well)
    const score = fuzzball.token_set_ratio(normVal, normTranscript);
    if (score >= 80) {
      results.push({ field, value, grounded: true });
    } else {
      results.push({ field, value, grounded: false });
    }
  }

  if (prediction) {
    checkValue("chief_complaint", prediction.chief_complaint);
    
    if (prediction.medications) {
      for (const m of prediction.medications) {
        checkValue("medication_name", m.name);
      }
    }
    
    if (prediction.diagnoses) {
      for (const d of prediction.diagnoses) {
        checkValue("diagnosis_desc", d.description);
      }
    }

    if (prediction.plan) {
      for (const p of prediction.plan) {
        checkValue("plan_item", p);
      }
    }
  }

  return results;
}
