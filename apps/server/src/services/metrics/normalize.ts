export function normalizeString(s: string | null | undefined): string {
  if (!s) return "";
  return s.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

export function normalizeFrequency(s: string | null | undefined): string {
  if (!s) return "";
  let n = normalizeString(s);
  
  // common abbreviations mapping
  const map: Record<string, string> = {
    "bid": "twice daily",
    "qd": "daily",
    "once daily": "daily",
    "tid": "three times daily",
    "qid": "four times daily",
    "prn": "as needed",
    "qhs": "at bedtime",
    "at night": "at bedtime"
  };
  
  if (map[n]) return map[n];
  
  // Replace components iteratively
  n = n.replace(/\bbid\b/g, "twice daily");
  n = n.replace(/\bprn\b/g, "as needed");
  return n;
}

export function normalizeDose(s: string | null | undefined): string {
  if (!s) return "";
  let n = normalizeString(s);
  // remove spaces between number and unit (10 mg -> 10mg)
  return n.replace(/(\d+)\s+([a-z]+)/g, "$1$2");
}
