"use client";
import { useEffect, useState } from "react";
import { fetchRuns, fetchRunDetail } from "@/lib/api";
import { type RunDTO } from "@test-evals/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@test-evals/ui/components/card";

export default function ComparePage() {
  const [runs, setRuns] = useState<RunDTO[]>([]);
  const [runAId, setRunAId] = useState<string>("");
  const [runBId, setRunBId] = useState<string>("");
  
  const [runA, setRunA] = useState<RunDTO | null>(null);
  const [runB, setRunB] = useState<RunDTO | null>(null);

  useEffect(() => {
    fetchRuns().then(data => {
      setRuns(data);
      if (data.length >= 2) {
        setRunAId(data[0].id);
        setRunBId(data[1].id);
      }
    });
  }, []);

  useEffect(() => {
    if (runAId) fetchRunDetail(runAId).then(setRunA);
    if (runBId) fetchRunDetail(runBId).then(setRunB);
  }, [runAId, runBId]);

  const fields = [
    { key: "avgChiefComplaint", label: "Chief Complaint" },
    { key: "avgVitals", label: "Vitals" },
    { key: "avgMedicationsF1", label: "Medications (F1)" },
    { key: "avgDiagnosesF1", label: "Diagnoses (F1)" },
    { key: "avgPlanF1", label: "Plan (F1)" },
    { key: "avgFollowUp", label: "Follow Up" },
    { key: "avgOverall", label: "Overall F1" },
  ] as const;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Compare Runs</h1>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Run A</label>
          <select className="w-full border p-2 rounded bg-background cursor-pointer" value={runAId} onChange={e => setRunAId(e.target.value)}>
            <option value="">Select run...</option>
            {runs.map(r => <option key={r.id} value={r.id}>{r.strategy} ({r.id.slice(0,8)})</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Run B</label>
          <select className="w-full border p-2 rounded bg-background cursor-pointer" value={runBId} onChange={e => setRunBId(e.target.value)}>
            <option value="">Select run...</option>
            {runs.map(r => <option key={r.id} value={r.id}>{r.strategy} ({r.id.slice(0,8)})</option>)}
          </select>
        </div>
      </div>

      {runA && runB && (
        <Card>
          <CardHeader><CardTitle>Comparison Results</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Field</th>
                  <th className="p-2">Run A ({runA.strategy})</th>
                  <th className="p-2">Run B ({runB.strategy})</th>
                  <th className="p-2">Delta (B - A)</th>
                  <th className="p-2">Winner</th>
                </tr>
              </thead>
              <tbody>
                {fields.map(({ key, label }) => {
                  const valA = (runA[key] as number) || 0;
                  const valB = (runB[key] as number) || 0;
                  const delta = valB - valA;
                  return (
                    <tr key={key} className="border-b">
                      <td className="p-2 font-medium">{label}</td>
                      <td className="p-2">{valA.toFixed(3)}</td>
                      <td className="p-2">{valB.toFixed(3)}</td>
                      <td className={`p-2 font-bold ${delta > 0.005 ? "text-green-500" : delta < -0.005 ? "text-red-500" : ""}`}>
                        {delta > 0 ? "+" : ""}{delta.toFixed(3)}
                      </td>
                      <td className="p-2">
                        {delta > 0.005 ? "Run B" : delta < -0.005 ? "Run A" : "Tie"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
