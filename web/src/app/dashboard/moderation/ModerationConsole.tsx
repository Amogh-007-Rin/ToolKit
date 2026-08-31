"use client";

import { useCallback, useEffect, useState } from "react";

interface ReportItem {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description: string | null;
  evidence: unknown;
  status: string;
  createdAt: string;
}

type Action = "review" | "warn" | "remove" | "suspend" | "reinstate" | "dismiss";

export default function ModerationConsole() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const response = await fetch(`/api/v1/moderation/reports${query}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load moderation reports");
    setReports(((await response.json()) as { reports: ReportItem[] }).reports);
  }, [status]);

  useEffect(() => {
    const controller = new AbortController();
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    void fetch(`/api/v1/moderation/reports${query}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load moderation reports");
        setReports(((await response.json()) as { reports: ReportItem[] }).reports);
        setError(null);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Load failed");
      });
    return () => controller.abort();
  }, [status]);

  const act = async (report: ReportItem, action: Action) => {
    const destructive = ["remove", "suspend", "reinstate"].includes(action);
    if (destructive && !window.confirm(`Confirm ${action} for this report? This action is audited.`)) return;
    const nextStatus = action === "dismiss" ? "DISMISSED" : action === "review" ? "REVIEWING" : "ACTIONED";
    const response = await fetch(`/api/v1/moderation/reports/${report.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, action, reason: `${action} from moderation console`, ...(destructive ? { confirmation: "CONFIRM" } : {}) }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { message?: string };
      setError(body.message ?? "Moderation action failed");
      return;
    }
    setError(null);
    await load();
  };

  return (
    <div data-lenis-prevent className="thin-scrollbar h-full overflow-y-auto rounded-3xl border border-border bg-card p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Moderation</h1><p className="text-sm text-muted-foreground">Reports, appeals, evidence, and immutable actions.</p></div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <option value="">All statuses</option><option>OPEN</option><option>REVIEWING</option><option>APPEALED</option><option>ACTIONED</option><option>DISMISSED</option>
        </select>
      </div>
      {error ? <p role="alert" className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="space-y-3">
        {reports.map((report) => (
          <article key={report.id} className="rounded-2xl border border-border bg-background p-4">
            <div className="flex flex-wrap justify-between gap-2"><strong>{report.targetType}: {report.reason}</strong><span className="text-xs text-muted-foreground">{report.status} · {new Date(report.createdAt).toLocaleString()}</span></div>
            {report.description ? <p className="mt-2 text-sm">{report.description}</p> : null}
            <details className="mt-3 text-xs"><summary className="cursor-pointer text-muted-foreground">Evidence snapshot</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-muted p-3">{JSON.stringify(report.evidence, null, 2)}</pre></details>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => void act(report, "review")} className="rounded-lg border px-3 py-1.5 text-xs">Review</button>
              <button onClick={() => void act(report, "warn")} className="rounded-lg border px-3 py-1.5 text-xs">Warn</button>
              <button onClick={() => void act(report, "dismiss")} className="rounded-lg border px-3 py-1.5 text-xs">Dismiss</button>
              {report.targetType === "appeal" ? <button onClick={() => void act(report, "reinstate")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white">Reinstate</button> : null}
              {report.targetType === "profile" ? <button onClick={() => void act(report, "suspend")} className="rounded-lg bg-destructive px-3 py-1.5 text-xs text-destructive-foreground">Suspend</button> : null}
              {["post", "comment", "message"].includes(report.targetType) ? <button onClick={() => void act(report, "remove")} className="rounded-lg bg-destructive px-3 py-1.5 text-xs text-destructive-foreground">Remove content</button> : null}
            </div>
          </article>
        ))}
        {reports.length === 0 ? <p className="py-16 text-center text-muted-foreground">No reports in this queue.</p> : null}
      </div>
    </div>
  );
}
