import { db } from "@test-evals/db";
import { runs, runCases } from "@test-evals/db/schema/evals";
import { eq, and } from "drizzle-orm";
import { type PromptStrategy, DEFAULT_MODEL, MAX_CONCURRENCY } from "@test-evals/shared";
import { getSystemPrompt, hashPrompt, extractClinicalData } from "@test-evals/llm";
import { evaluateCase } from "./evaluate.service";
import { loadDataset } from "./dataset.service";
import { Semaphore, sleep } from "./concurrency";

// EventEmitter simple shim for SSE updates inside the same process
import { EventEmitter } from "events";
export const runEvents = new EventEmitter();

const dataset = loadDataset();

async function processCase(
  runId: string, 
  caseId: string, 
  transcript: string, 
  gold: any, 
  strategy: PromptStrategy, 
  model: string,
  semaphore: Semaphore
) {
  await semaphore.acquire();
  let retryDelay = 1000;
  
  try {
    await db.update(runCases)
      .set({ status: "running", startedAt: new Date() })
      .where(and(eq(runCases.runId, runId), eq(runCases.transcriptId, caseId)));

    let extractionResult: any;
    
    // Retry loop for Anthropic API rate limits (429)
    while (true) {
      try {
        extractionResult = await extractClinicalData(transcript, strategy, model);
        break; // Success
      } catch (err: any) {
        if (err.status === 429) {
          console.log(`429 Rate limit hit for ${caseId}, backing off for ${retryDelay}ms...`);
          await sleep(retryDelay);
          retryDelay = Math.min(retryDelay * 2, 32000);
        } else {
          throw err;
        }
      }
    }

    const evalResult = evaluateCase(extractionResult.extraction, gold, transcript);

    // Cost computation
    const costUsd = (
      (extractionResult.inputTokens * 1.00 / 1000000) + 
      (extractionResult.outputTokens * 5.00 / 1000000) + 
      (extractionResult.cacheReadTokens * 0.10 / 1000000) + 
      (extractionResult.cacheWriteTokens * 1.25 / 1000000)
    );

    await db.update(runCases).set({
      status: "completed",
      completedAt: new Date(),
      prediction: extractionResult.extraction,
      scores: evalResult.scores,
      hallucinations: evalResult.hallucinations,
      attempts: extractionResult.attempts,
      attemptCount: extractionResult.attempts.length,
      schemaValid: extractionResult.schemaValid,
      inputTokens: extractionResult.inputTokens,
      outputTokens: extractionResult.outputTokens,
      cacheRead: extractionResult.cacheReadTokens,
      cacheWrite: extractionResult.cacheWriteTokens,
      costUsd: costUsd
    }).where(and(eq(runCases.runId, runId), eq(runCases.transcriptId, caseId)));

    runEvents.emit("case_update", { runId, caseId, status: "completed", scores: evalResult.scores });
  } catch (error) {
    console.error(`Failed to process ${caseId}:`, error);
    await db.update(runCases)
      .set({ status: "failed", completedAt: new Date() })
      .where(and(eq(runCases.runId, runId), eq(runCases.transcriptId, caseId)));
    runEvents.emit("case_update", { runId, caseId, status: "failed" });
  } finally {
    semaphore.release();
  }
}

async function updateRunAggregates(runId: string) {
  const cases = await db.query.runCases.findMany({
    where: eq(runCases.runId, runId)
  });

  const completed = cases.filter(c => c.status === "completed" && c.scores);
  
  if (completed.length === 0) return;

  const sum = (field: string) => completed.reduce((acc, c) => acc + ((c.scores as any)[field] || 0), 0);
  
  const totalInputTokens = completed.reduce((acc, c) => acc + (c.inputTokens || 0), 0);
  const totalOutputTokens = completed.reduce((acc, c) => acc + (c.outputTokens || 0), 0);
  const cacheReadTokens = completed.reduce((acc, c) => acc + (c.cacheRead || 0), 0);
  const cacheWriteTokens = completed.reduce((acc, c) => acc + (c.cacheWrite || 0), 0);
  const totalCostUsd = completed.reduce((acc, c) => acc + (c.costUsd || 0), 0);
  
  const schemaFailures = completed.filter(c => !c.schemaValid).length;
  const hallucinationCount = completed.reduce((acc, c) => acc + ((c.hallucinations as any[])?.length || 0), 0);

  await db.update(runs).set({
    status: "completed",
    completedAt: new Date(),
    avgChiefComplaint: sum("chief_complaint") / completed.length,
    avgVitals: sum("vitals") / completed.length,
    avgMedicationsF1: sum("medications") / completed.length,
    avgDiagnosesF1: sum("diagnoses") / completed.length,
    avgPlanF1: sum("plan") / completed.length,
    avgFollowUp: sum("follow_up") / completed.length,
    avgOverall: sum("overall") / completed.length,
    completedCases: completed.length,
    schemaFailures,
    hallucinationCount,
    totalInputTokens,
    totalOutputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalCostUsd
  }).where(eq(runs.id, runId));

  runEvents.emit("run_complete", { runId });
}

export async function startRun(strategy: PromptStrategy, model: string = DEFAULT_MODEL) {
  const promptHash = hashPrompt(getSystemPrompt(strategy));
  
  const [newRun] = await db.insert(runs).values({
    strategy,
    model,
    promptHash,
    status: "running",
    startedAt: new Date(),
    totalCases: dataset.size
  }).returning();

  const caseInserts = Array.from(dataset.keys()).map(transcriptId => ({
    runId: newRun.id,
    transcriptId,
    status: "pending"
  }));

  // Chunk inserts for SQLite/Postgres limits if necessary, though 50 is fine
  await db.insert(runCases).values(caseInserts);

  const semaphore = new Semaphore(MAX_CONCURRENCY);
  const promises = Array.from(dataset.values()).map(data => 
    processCase(newRun.id, data.id, data.transcript, data.gold, strategy, model, semaphore)
  );

  // Run in background
  Promise.all(promises).then(() => updateRunAggregates(newRun.id));

  return newRun;
}

export async function resumeRun(runId: string) {
  const run = await db.query.runs.findFirst({
    where: eq(runs.id, runId)
  });

  if (!run) throw new Error("Run not found");

  const pendingCases = await db.query.runCases.findMany({
    where: and(eq(runCases.runId, runId), eq(runCases.status, "pending"))
  });

  if (pendingCases.length === 0) {
    await updateRunAggregates(runId);
    return run;
  }

  await db.update(runs).set({ status: "running" }).where(eq(runs.id, runId));

  const semaphore = new Semaphore(MAX_CONCURRENCY);
  const promises = pendingCases.map(c => {
    const data = dataset.get(c.transcriptId);
    if (!data) return Promise.resolve();
    return processCase(runId, data.id, data.transcript, data.gold, run.strategy as PromptStrategy, run.model, semaphore);
  });

  Promise.all(promises).then(() => updateRunAggregates(runId));

  return run;
}
