export interface ClinicalExtraction {
  chief_complaint: string;
  vitals: {
    bp: string | null;
    hr: number | null;
    temp_f: number | null;
    spo2: number | null;
  };
  medications: Array<{
    name: string;
    dose: string | null;
    frequency: string | null;
    route: string | null;
  }>;
  diagnoses: Array<{
    description: string;
    icd10?: string;
  }>;
  plan: string[];
  follow_up: {
    interval_days: number | null;
    reason: string | null;
  };
}

export interface PerFieldScores {
  chief_complaint: number;
  vitals: number;
  medications: number;
  diagnoses: number;
  plan: number;
  follow_up: number;
  overall: number;
}

export interface AttemptLog {
  request: any;
  response: any;
  valid: boolean;
  errors: any[];
}

export interface CaseResultDTO {
  id: string;
  transcriptId: string;
  status: string;
  prediction: ClinicalExtraction | null;
  scores: PerFieldScores | null;
  hallucinations: any[] | null;
  attempts: AttemptLog[] | null;
  attemptCount: number;
  schemaValid: boolean;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  costUsd: number;
  startedAt: string | null;
  completedAt: string | null;
  gold?: any;
}

export interface RunDTO {
  id: string;
  strategy: string;
  model: string;
  promptHash: string;
  status: string;
  avgChiefComplaint: number | null;
  avgVitals: number | null;
  avgMedicationsF1: number | null;
  avgDiagnosesF1: number | null;
  avgPlanF1: number | null;
  avgFollowUp: number | null;
  avgOverall: number | null;
  totalCases: number;
  completedCases: number;
  schemaFailures: number;
  hallucinationCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalCostUsd: number;
  wallTimeMs: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  cases?: CaseResultDTO[];
}
