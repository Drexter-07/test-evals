"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchRuns, startRun } from "@/lib/api";
import { type RunDTO, STRATEGIES } from "@test-evals/shared";
import { Button } from "@test-evals/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@test-evals/ui/components/card";

export default function Dashboard() {
  const [runs, setRuns] = useState<RunDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState(STRATEGIES[0]);

  useEffect(() => {
    loadRuns();
  }, []);

  async function loadRuns() {
    setLoading(true);
    try {
      const data = await fetchRuns();
      setRuns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    setStarting(true);
    try {
      await startRun(selectedStrategy);
      await loadRuns();
    } catch (e) {
      console.error(e);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Start New Evaluation</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <select 
            value={selectedStrategy} 
            onChange={(e) => setSelectedStrategy(e.target.value as any)}
            className="border rounded p-2 bg-background cursor-pointer"
          >
            {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button onClick={handleStart} disabled={starting} className="cursor-pointer">
            {starting ? "Starting..." : "Start Run"}
          </Button>
          <Link href="/dashboard/compare">
            <Button variant="outline" className="cursor-pointer">Compare Runs</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Previous Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p>Loading...</p> : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="p-2">ID</th>
                    <th className="p-2">Strategy</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">F1 Overall</th>
                    <th className="p-2">Cost</th>
                    <th className="p-2">Cases</th>
                    <th className="p-2">Created</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map(run => (
                    <tr key={run.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-mono text-xs">{run.id.slice(0, 8)}</td>
                      <td className="p-2">{run.strategy}</td>
                      <td className="p-2">{run.status}</td>
                      <td className="p-2">{run.avgOverall?.toFixed(2) ?? "-"}</td>
                      <td className="p-2">${run.totalCostUsd?.toFixed(4) ?? "-"}</td>
                      <td className="p-2">{run.completedCases} / {run.totalCases}</td>
                      <td className="p-2">{new Date(run.createdAt).toLocaleString()}</td>
                      <td className="p-2">
                        <Link href={`/dashboard/runs/${run.id}`}>
                          <Button variant="link" size="sm">View Details</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {runs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-muted-foreground">No runs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
