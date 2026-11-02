"use client";

/**
 * SingleTaskFix.tsx — Homepage card: paste one Monday.com task URL and choose what to update.
 *
 * Options (tick one or both):
 *   - Rename task          → re-applies the board's Naming Rules, even if the task was named before
 *   - Create new Dropbox folder → makes a fresh folder and replaces the link on Monday
 *
 * The result text is handed back to the homepage, which shows it in the same
 * "Results" area as the Sync button.
 *
 * Depends on: /api/run (mode "task"), ui/card, ui/button, ui/checkbox
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Wrench } from "lucide-react";

/**
 * Props: onResult(output, success) is called when the server answers,
 * so the parent page can display the log.
 */
export default function SingleTaskFix({ onResult }: { onResult: (output: string, success: boolean) => void }) {
  const [url, setUrl] = useState("");            // The pasted Monday.com link
  const [rename, setRename] = useState(true);    // "Rename task" ticked?
  const [folder, setFolder] = useState(false);   // "Create new Dropbox folder" ticked?
  const [running, setRunning] = useState(false); // True while the server is working

  // Button is only clickable with a URL and at least one option ticked
  const canRun = url.trim() !== "" && (rename || folder) && !running;

  /** Sends the URL + chosen options to the server and reports the result. */
  async function run() {
    setRunning(true);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "task", url: url.trim(), rename, folder }),
      });
      const data = await res.json();
      const output: string = data.output ?? data.error ?? "";
      // A line starting with ✗ means at least one action failed
      onResult(output, Boolean(data.success) && !output.includes("✗"));
      if (data.success) setUrl(""); // Clear the box after a run
    } catch (e) {
      onResult(`✗ Could not reach the server: ${e}`, false);
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card className="border border-border/80 shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Fix a single task</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Paste a Monday.com task link and choose what to update.
        </p>

        {/* URL box — Enter key runs it too */}
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && canRun) run(); }}
          placeholder="https://…monday.com/boards/…/pulses/…"
          disabled={running}
          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
        />

        {/* The two options */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox checked={rename} onCheckedChange={(v) => setRename(v === true)} disabled={running} />
            Rename task (apply naming rules)
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox checked={folder} onCheckedChange={(v) => setFolder(v === true)} disabled={running} />
            Create new Dropbox folder
          </label>
        </div>

        <Button onClick={run} disabled={!canRun}>
          {running ? "Updating…" : "Update task"}
        </Button>
      </CardContent>
    </Card>
  );
}
