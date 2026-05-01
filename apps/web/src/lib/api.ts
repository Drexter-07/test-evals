import { env } from "@test-evals/env/web";
import type { PromptStrategy, RunDTO } from "@test-evals/shared";

const API_URL = env.NEXT_PUBLIC_SERVER_URL + "/api/v1";

export async function fetchRuns(): Promise<RunDTO[]> {
  const res = await fetch(`${API_URL}/runs`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error("Failed to fetch runs");
  return res.json();
}

export async function fetchRunDetail(id: string): Promise<RunDTO> {
  const res = await fetch(`${API_URL}/runs/${id}`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error("Failed to fetch run details");
  return res.json();
}

export async function startRun(strategy: PromptStrategy, model?: string): Promise<RunDTO> {
  const res = await fetch(`${API_URL}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ strategy, model })
  });
  if (!res.ok) throw new Error("Failed to start run");
  return res.json();
}

export async function resumeRun(id: string): Promise<RunDTO> {
  const res = await fetch(`${API_URL}/runs/${id}/resume`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to resume run");
  return res.json();
}
