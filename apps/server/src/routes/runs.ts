import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { db } from "@test-evals/db";
import { runs, runCases } from "@test-evals/db/schema/evals";
import { eq, desc } from "drizzle-orm";
import { startRun, resumeRun, runEvents } from "../services/runner.service";
import type { PromptStrategy } from "@test-evals/shared";
import fs from "fs";
import path from "path";

export const runsRouter = new Hono();

runsRouter.post("/runs", async (c) => {
  const body = await c.req.json();
  const strategy = body.strategy as PromptStrategy;
  const model = body.model || "claude-haiku-4-5-20251001";
  
  const run = await startRun(strategy, model);
  return c.json(run);
});

runsRouter.post("/runs/:id/resume", async (c) => {
  const id = c.req.param("id");
  const run = await resumeRun(id);
  return c.json(run);
});

runsRouter.get("/runs", async (c) => {
  const allRuns = await db.query.runs.findMany({
    orderBy: [desc(runs.createdAt)]
  });
  return c.json(allRuns);
});

runsRouter.get("/runs/:id", async (c) => {
  const id = c.req.param("id");
  const run = await db.query.runs.findFirst({
    where: eq(runs.id, id),
    with: {
      cases: true
    }
  });
  if (!run) return c.notFound();

  const dataDir = path.resolve(process.cwd(), "../../data/gold");
  const casesWithGold = run.cases.map(caseObj => {
    try {
      const goldPath = path.join(dataDir, `${caseObj.transcriptId}.json`);
      if (fs.existsSync(goldPath)) {
        const goldStr = fs.readFileSync(goldPath, "utf-8");
        return { ...caseObj, gold: JSON.parse(goldStr) };
      }
    } catch (e) {
      console.error(`Failed to load gold for ${caseObj.transcriptId}`, e);
    }
    return { ...caseObj, gold: null };
  });

  return c.json({ ...run, cases: casesWithGold });
});

runsRouter.get("/runs/:id/stream", async (c) => {
  const id = c.req.param("id");
  return streamSSE(c, async (stream) => {
    
    const caseUpdateHandler = async (data: any) => {
      if (data.runId === id) {
        await stream.writeSSE({
          event: "case_update",
          data: JSON.stringify(data),
          id: String(Date.now())
        });
      }
    };

    const runCompleteHandler = async (data: any) => {
      if (data.runId === id) {
        await stream.writeSSE({
          event: "run_complete",
          data: JSON.stringify(data),
          id: String(Date.now())
        });
        stream.close();
      }
    };

    runEvents.on("case_update", caseUpdateHandler);
    runEvents.on("run_complete", runCompleteHandler);

    stream.onAbort(() => {
      runEvents.off("case_update", caseUpdateHandler);
      runEvents.off("run_complete", runCompleteHandler);
    });

    // Keep alive
    while (true) {
      await stream.sleep(5000);
      if (stream.aborted) break;
      await stream.writeSSE({ event: "ping", data: "ping" });
    }
  });
});
