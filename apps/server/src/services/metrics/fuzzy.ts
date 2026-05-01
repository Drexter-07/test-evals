import * as fuzzball from "fuzzball";
import { normalizeString } from "./normalize";

export function fuzzyScore(a: string | null | undefined, b: string | null | undefined): number {
  const normA = normalizeString(a);
  const normB = normalizeString(b);
  
  if (!normA && !normB) return 1.0;
  if (!normA || !normB) return 0.0;
  
  const score = fuzzball.token_set_ratio(normA, normB);
  return score / 100.0;
}
