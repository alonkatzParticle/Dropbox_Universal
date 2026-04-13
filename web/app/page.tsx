"use client";

/**
 * page.tsx — Home dashboard for the Dropbox Automation app.
 *
 * Sections:
 *  1. Actions — quick buttons to run a poll or full backfill, plus auto-create toggle
 *  2. Missing Links — task list with toggles and checkboxes (TaskList component)
 *  3. Output — shows created folders + raw log after any action runs
 *
 * Depends on: /api/run, /api/tasks (via TaskList), /api/auto
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, RefreshCw, Layers, FolderOpen, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import TaskList, { type Task } from "@/components/TaskList";
import LinkVerifier from "@/components/LinkVerifier";

/**
 * Parse Python output to extract { name, url } pairs for every successfully created folder.
 * The output contains lines like "→ Processing: {name}" followed by "  Link: {url}".
 */
function parseCreatedFolders(output: string): { name: string; url: string }[] {
  const results: { name: string; url: string }[] = [];
  let currentName = "";
  for (const line of output.split("\n")) {
    const nameMatch = line.match(/^→ Processing: (.+)$/);
    if (nameMatch) { currentName = nameMatch[1].trim(); continue; }
    const linkMatch = line.match(/^\s+Link: (https:\/\/\S+)$/);
    if (linkMatch && currentName) {
      results.push({ name: currentName, url: linkMatch[1] });
      currentName = "";
    }
  }
  return results;
}

export default function Home() {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [outputSuccess, setOutputSuccess] = useState<boolean | null>(null);
  const [autoEnabled, setAutoEnabled] = useState<boolean | null>(null);
  const [lastPolled, setLastPolled] = useState<string | null>(null);

  useEffect(() => {
    function fetchState() {
      fetch("/api/auto").then((r) => r.json()).then((d) => {
        setAutoEnabled(d.enabled ?? true);
        setLastPolled(d.lastPolled);
      });
    }
    fetchState();
    const intervalId = setInterval(fetchState, 5000);
    return () => clearInterval(intervalId);
  }, []);

  async function toggleAuto(enabled: boolean) {
    setAutoEnabled(enabled);
    await fetch("/api/auto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
  }

  async function runSync() {
    setIsRunning(true);
    setOutput("");
    setOutputSuccess(null);
    const res = await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "poll" }) });
    const data = await res.json();
    setOutput(data.output ?? "");
    setOutputSuccess(data.success);
    setIsRunning(false);
    
    // Update last polled
    fetch("/api/auto").then((r) => r.json()).then((d) => setLastPolled(d.lastPolled));
  }

  const created = output ? parseCreatedFolders(output) : [];

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        
        {/* Header Block */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Synchronization</h1>
            <p className="text-muted-foreground text-sm">Force an instant synchronization sweep across all Monday.com pipelines.</p>
          </div>
          
          <div className="flex flex-col items-end gap-1.5 bg-muted/40 px-4 py-3 rounded-lg border border-border/50">
            <label className="flex items-center gap-3 text-sm font-medium text-foreground cursor-pointer select-none">
              Background Automation
              <Switch checked={autoEnabled ?? false} onCheckedChange={toggleAuto} disabled={autoEnabled === null} className="scale-90" />
            </label>
            <span className="text-xs text-muted-foreground">
              {autoEnabled ? "Cron is active (runs every 5m)" : "Cron is paused"}
            </span>
          </div>
        </div>

        {/* Hero Card */}
        <Card className="border border-border/80 shadow-sm overflow-hidden bg-gradient-to-b from-card to-muted/20 relative">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <RefreshCw className="w-48 h-48" />
          </div>
          <CardContent className="p-8 pb-10 flex flex-col items-center justify-center text-center space-y-6 relative z-10">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Sync Monday.com</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Trigger an immediate sweep to find unformatted tasks, correctly rename them, and generate their Dropbox folders.
              </p>
            </div>
            
            <Button size="lg" onClick={runSync} disabled={isRunning} className="h-14 px-8 text-base shadow-md transition-all">
              <RefreshCw className={`h-5 w-5 mr-3 ${isRunning ? "animate-spin" : ""}`} />
              {isRunning ? "Synchronizing pipeline..." : "Run Instant Sync"}
            </Button>

            {lastPolled && (
              <p className="text-xs text-muted-foreground font-medium pt-2">
                Last synchronized: {new Date(lastPolled).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Results Block */}
        {output !== "" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground ml-1">Sync Results</h3>
            
            <Alert variant={outputSuccess ? "default" : "destructive"} className={`py-4 px-5 border ${outputSuccess ? 'bg-green-500/5 text-green-700 border-green-500/20' : ''}`}>
              <div className="flex items-center gap-3">
                {outputSuccess ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5" />}
                <div>
                  <AlertDescription className="font-semibold text-sm">
                    {outputSuccess ? "Synchronization Complete" : "Synchronization encountered an error"}
                  </AlertDescription>
                  <p className="text-xs opacity-80 mt-0.5">
                    {outputSuccess ? `Processed execution fully.` : 'Review the developer logs below.'}
                  </p>
                </div>
              </div>
            </Alert>

            {/* Structured Folders List */}
            {created.length > 0 && (
              <div className="grid gap-3">
                {created.map(({ name, url }) => (
                  <div key={url} className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border/60 shadow-sm transition-all hover:border-primary/30">
                    <div className="h-10 w-10 shrink-0 bg-blue-50 text-blue-600 rounded-md flex items-center justify-center">
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5">
                        Open Dropbox <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Technical Logs Accordion */}
            <details className="group border border-border/60 rounded-lg overflow-hidden bg-card">
              <summary className="px-5 py-3.5 text-sm font-medium cursor-pointer flex items-center justify-between hover:bg-muted/40 transition-colors">
                View Developer Logs
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono">raw</span>
              </summary>
              <div className="border-t border-border/60">
                <ScrollArea className="h-64 w-full bg-[#1e1e1e]">
                  <pre className="text-[13px] font-mono leading-relaxed p-5 text-zinc-300 whitespace-pre-wrap">{output}</pre>
                </ScrollArea>
              </div>
            </details>
          </div>
        )}

      </main>
    </div>
  );
}
