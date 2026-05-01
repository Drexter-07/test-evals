import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, integer, real, boolean, jsonb, uuid, unique } from "drizzle-orm/pg-core";

export const runs = pgTable("runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  strategy: text("strategy").notNull(),              // zero_shot | few_shot | cot
  model: text("model").notNull(),
  promptHash: text("prompt_hash").notNull(),
  status: text("status").notNull().default("pending"), // pending|running|completed|failed

  // Aggregate scores
  avgChiefComplaint: real("avg_chief_complaint"),
  avgVitals: real("avg_vitals"),
  avgMedicationsF1: real("avg_medications_f1"),
  avgDiagnosesF1: real("avg_diagnoses_f1"),
  avgPlanF1: real("avg_plan_f1"),
  avgFollowUp: real("avg_follow_up"),
  avgOverall: real("avg_overall"),

  // Counts
  totalCases: integer("total_cases").notNull().default(0),
  completedCases: integer("completed_cases").notNull().default(0),
  schemaFailures: integer("schema_failures").notNull().default(0),
  hallucinationCount: integer("hallucination_count").notNull().default(0),

  // Token usage
  totalInputTokens: integer("total_input_tokens").default(0),
  totalOutputTokens: integer("total_output_tokens").default(0),
  cacheReadTokens: integer("cache_read_tokens").default(0),
  cacheWriteTokens: integer("cache_write_tokens").default(0),

  // Cost & time
  totalCostUsd: real("total_cost_usd").default(0),
  wallTimeMs: integer("wall_time_ms"),

  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const runCases = pgTable("run_cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
  transcriptId: text("transcript_id").notNull(),
  status: text("status").notNull().default("pending"), // pending|running|completed|failed

  prediction: jsonb("prediction"),           // the AI's extraction result
  scores: jsonb("scores"),                   // per-field scores object
  hallucinations: jsonb("hallucinations"),   // array of hallucinated values
  attempts: jsonb("attempts"),               // array of {request, response, valid, errors}
  attemptCount: integer("attempt_count").default(0),
  schemaValid: boolean("schema_valid"),

  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  cacheRead: integer("cache_read").default(0),
  cacheWrite: integer("cache_write").default(0),
  costUsd: real("cost_usd").default(0),

  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => [
  unique("run_case_unique").on(table.runId, table.transcriptId),
]);

// Relations
export const runsRelations = relations(runs, ({ many }) => ({
  cases: many(runCases),
}));

export const runCasesRelations = relations(runCases, ({ one }) => ({
  run: one(runs, { fields: [runCases.runId], references: [runs.id] }),
}));
