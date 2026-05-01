export function getZeroShotPrompt(): string {
  return `You are a clinical data extraction assistant. Extract structured clinical data from the following doctor-patient transcript. Be precise and only include information explicitly stated in the transcript.`;
}
