"use client";
import { useEffect, useState, use } from "react";
import { fetchRunDetail, resumeRun } from "@/lib/api";
import { type RunDTO, type CaseResultDTO } from "@test-evals/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@test-evals/ui/components/card";
import { Button } from "@test-evals/ui/components/button";
import { env } from "@test-evals/env/web";

export default function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [run, setRun] = useState<RunDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<CaseResultDTO | null>(null);

  useEffect(() => {
    loadRun();
    
    // Connect to SSE for live updates
    const API_URL = env.NEXT_PUBLIC_SERVER_URL + "/api/v1";
    const es = new EventSource(`${API_URL}/runs/${id}/stream`);
    
    es.addEventListener("case_update", (e) => {
      // Optimistically we could update individual cases, but reloading run is simpler for now
      loadRun(false);
    });
    
    es.addEventListener("run_complete", () => {
      loadRun(false);
      es.close();
    });

    return () => es.close();
  }, [id]);

  async function loadRun(showLoader = true) {
    if (showLoader) setLoading(true);
    try {
      const data = await fetchRunDetail(id);
      setRun(data);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  async function handleResume() {
    try {
      await resumeRun(id);
    } catch (e) {
      console.error(e);
    }
  }

  if (loading && !run) return <div className="p-8">Loading...</div>;
  if (!run) return <div className="p-8">Run not found</div>;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Run Details: {run.id.slice(0, 8)}</h1>
        {run.status === "failed" || run.status === "partial" ? (
          <Button onClick={handleResume}>Resume Incomplete</Button>
        ) : run.status === "running" ? (
          <span className="text-blue-500 font-bold animate-pulse">Running...</span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Strategy</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{run.strategy}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Overall F1</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{run.avgOverall?.toFixed(3) ?? "-"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Cost</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">${run.totalCostUsd?.toFixed(4) ?? "-"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Hallucinations</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-500">{run.hallucinationCount}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Case Results ({run.completedCases}/{run.totalCases})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Case ID</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Complaint</th>
                  <th className="p-2">Vitals</th>
                  <th className="p-2">Meds F1</th>
                  <th className="p-2">Diag F1</th>
                  <th className="p-2">Plan F1</th>
                  <th className="p-2">Follow-up</th>
                  <th className="p-2">Overall</th>
                  <th className="p-2">Hall.</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(run.cases || []).sort((a,b) => a.transcriptId.localeCompare(b.transcriptId)).map(c => (
                  <tr key={c.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-mono">{c.transcriptId}</td>
                    <td className="p-2">{c.status}</td>
                    <td className="p-2">{c.scores?.chief_complaint?.toFixed(2) ?? "-"}</td>
                    <td className="p-2">{c.scores?.vitals?.toFixed(2) ?? "-"}</td>
                    <td className="p-2">{c.scores?.medications?.toFixed(2) ?? "-"}</td>
                    <td className="p-2">{c.scores?.diagnoses?.toFixed(2) ?? "-"}</td>
                    <td className="p-2">{c.scores?.plan?.toFixed(2) ?? "-"}</td>
                    <td className="p-2">{c.scores?.follow_up?.toFixed(2) ?? "-"}</td>
                    <td className="p-2 font-bold">{c.scores?.overall?.toFixed(2) ?? "-"}</td>
                    <td className="p-2 text-red-500">{c.hallucinations?.length || 0}</td>
                    <td className="p-2">
                      <Button variant="link" size="sm" className="cursor-pointer" onClick={() => setSelectedCase(c)}>View Details</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedCase && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex flex-row justify-between items-center border-b">
              <CardTitle>Case Detail: {selectedCase.transcriptId}</CardTitle>
              <Button variant="ghost" className="cursor-pointer" onClick={() => setSelectedCase(null)}>Close</Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-4 flex gap-4 flex-col md:flex-row">
              <div className="flex-1 border rounded p-4 overflow-auto">
                <h3 className="font-bold mb-2">Prediction vs Gold</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Gold</h4>
                    <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-[60vh] whitespace-pre-wrap break-words border">{JSON.stringify(selectedCase.gold, null, 2)}</pre>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Prediction</h4>
                    <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-[60vh] whitespace-pre-wrap break-words border">{JSON.stringify(selectedCase.prediction, null, 2)}</pre>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/3 border rounded p-4 overflow-auto">
                <h3 className="font-bold mb-2">LLM Trace ({selectedCase.attemptCount} attempts)</h3>
                {selectedCase.attempts?.map((attempt, i) => (
                  <div key={i} className="mb-4 border-b pb-2">
                    <p className="text-sm font-bold">Attempt {i + 1}</p>
                    <p className="text-xs text-muted-foreground">Valid: {attempt.valid ? "Yes" : "No"}</p>
                    {!attempt.valid && (
                      <pre className="text-xs text-red-500 mt-1">{JSON.stringify(attempt.errors, null, 2)}</pre>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
