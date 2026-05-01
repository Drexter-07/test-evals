export function getCotPrompt(): string {
  return `You are a clinical data extraction assistant. Think step by step:
1. Read the entire transcript carefully
2. Identify the chief complaint from the patient's words
3. Find any vitals mentioned (BP, HR, temp, SpO2) — use null if not mentioned
4. List all medications with dose, frequency, and route
5. Determine diagnoses with ICD-10 codes if you can infer them
6. Extract the plan items
7. Identify follow-up interval and reason
Only include information explicitly stated in the transcript. Do not hallucinate.`;
}
