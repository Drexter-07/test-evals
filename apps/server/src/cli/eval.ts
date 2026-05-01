import { parseArgs } from "util";
import { db } from "@test-evals/db";
import { runs } from "@test-evals/db/schema/evals";
import { eq } from "drizzle-orm";
import { startRun, runEvents } from "../services/runner.service";
import type { PromptStrategy } from "@test-evals/shared";

async function main() {
  const { values } = parseArgs({
    args: Bun.argv,
    options: {
      strategy: { type: "string" },
      model: { type: "string" },
    },
    strict: true,
    allowPositionals: true,
  });

  if (!values.strategy) {
    console.error("Usage: bun run eval -- --strategy=<zero_shot|few_shot|cot> [--model=<model>]");
    process.exit(1);
  }

  const strategy = values.strategy as PromptStrategy;
  const model = values.model || "claude-haiku-4-5-20251001";

  console.log(`Starting eval run for strategy: ${strategy}, model: ${model}`);

  const run = await startRun(strategy, model);
  console.log(`Run started with ID: ${run.id}. Waiting for completion...`);

  // Wait for run complete event
  await new Promise<void>((resolve) => {
    runEvents.on("run_complete", (data) => {
      if (data.runId === run.id) resolve();
    });
  });

  // Fetch final stats
  const finalRun = await db.query.runs.findFirst({
    where: eq(runs.id, run.id),
    with: { cases: true }
  });

  if (!finalRun) throw new Error("Run disappeared");

  console.log("\n====================================");
  console.log("            RUN RESULTS");
  console.log("====================================");
  console.log(`Strategy:         ${finalRun.strategy}`);
  console.log(`Status:           ${finalRun.status}`);
  console.log(`Cases:            ${finalRun.completedCases} / ${finalRun.totalCases}`);
  console.log(`Overall F1:       ${finalRun.avgOverall?.toFixed(3)}`);
  console.log(`Chief Complaint:  ${finalRun.avgChiefComplaint?.toFixed(3)}`);
  console.log(`Vitals:           ${finalRun.avgVitals?.toFixed(3)}`);
  console.log(`Medications F1:   ${finalRun.avgMedicationsF1?.toFixed(3)}`);
  console.log(`Diagnoses F1:     ${finalRun.avgDiagnosesF1?.toFixed(3)}`);
  console.log(`Plan F1:          ${finalRun.avgPlanF1?.toFixed(3)}`);
  console.log(`Follow Up:        ${finalRun.avgFollowUp?.toFixed(3)}`);
  console.log(`Total Cost:       $${finalRun.totalCostUsd?.toFixed(4)}`);
  console.log(`Hallucinations:   ${finalRun.hallucinationCount}`);
  console.log(`Schema Failures:  ${finalRun.schemaFailures}`);
  console.log("====================================\n");

  process.exit(0);
}

main().catch(err => {
  console.error("Eval failed:", err);
  process.exit(1);
});
