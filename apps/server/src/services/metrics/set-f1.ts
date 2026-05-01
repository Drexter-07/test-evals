export interface SetF1Result {
  precision: number;
  recall: number;
  f1: number;
}

export function computeSetF1<T, U>(
  predicted: T[] | null | undefined,
  gold: U[] | null | undefined,
  matchFn: (p: T, g: U) => boolean
): SetF1Result {
  const pList = predicted || [];
  const gList = gold || [];

  if (pList.length === 0 && gList.length === 0) {
    return { precision: 1.0, recall: 1.0, f1: 1.0 };
  }
  if (pList.length === 0) {
    return { precision: 0.0, recall: 0.0, f1: 0.0 };
  }
  if (gList.length === 0) {
    return { precision: 0.0, recall: 1.0, f1: 0.0 }; // precision is 0, recall is undefined conceptually, we'll say 1
  }

  // Count how many gold items have at least one match in predicted
  let matchedGoldCount = 0;
  for (const g of gList) {
    if (pList.some(p => matchFn(p, g))) {
      matchedGoldCount++;
    }
  }

  // Count how many predicted items match at least one gold item
  let matchedPredCount = 0;
  for (const p of pList) {
    if (gList.some(g => matchFn(p, g))) {
      matchedPredCount++;
    }
  }

  const precision = matchedPredCount / pList.length;
  const recall = matchedGoldCount / gList.length;

  let f1 = 0;
  if (precision + recall > 0) {
    f1 = (2 * precision * recall) / (precision + recall);
  }

  return { precision, recall, f1 };
}
