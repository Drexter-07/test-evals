export function exactMatch(a: any, b: any): number {
  if (a === null && b === null) return 1.0;
  if (a === null || b === null) return 0.0;
  return String(a).trim() === String(b).trim() ? 1.0 : 0.0;
}

export function exactMatchWithTolerance(a: number | null | undefined, b: number | null | undefined, tolerance: number): number {
  if (a == null && b == null) return 1.0;
  if (a == null || b == null) return 0.0;
  return Math.abs(a - b) <= tolerance ? 1.0 : 0.0;
}

export function evaluateVitals(predicted: any, gold: any): number {
  if (!predicted && !gold) return 1.0;
  if (!predicted || !gold) return 0.0;

  const scores = [
    exactMatch(predicted.bp, gold.bp),
    exactMatch(predicted.hr, gold.hr),
    exactMatchWithTolerance(predicted.temp_f, gold.temp_f, 0.2),
    exactMatch(predicted.spo2, gold.spo2)
  ];

  const sum = scores.reduce((a, b) => a + b, 0);
  return sum / scores.length;
}
