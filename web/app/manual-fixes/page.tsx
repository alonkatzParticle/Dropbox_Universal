"use client";

import { useState } from "react";
import TaskList, { type Task } from "@/components/TaskList";
import LinkVerifier from "@/components/LinkVerifier";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, ExternalLink, ShieldAlert } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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

export default function ManualFixesPage() {
  const [output, setOutput] = useState<string>("");
  const [processedTasks, setProcessedTasks] = useState<Task[]>([]);

  function handleTaskRunComplete(taskOutput: string, success: boolean, tasks: Task[]) {
    setOutput(taskOutput);
    setProcessedTasks(tasks);
  }

  const created = parseCreatedFolders(output);

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Manual Link Fixer</h1>
          <p className="text-muted-foreground text-sm">Review items skipped by automation and forcefully pair them with Dropbox URLs.</p>
        </div>

        <Card className="border-border/60 bg-muted/10 shadow-sm">
          <div className="px-6 py-5 border-b border-border/50">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-orange-500" />
              Advanced Single-Link Override
            </h2>
          </div>
          <div className="p-6">
            <LinkVerifier />
          </div>
        </Card>

        {/* Missing Task List Table */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight px-1">Stubborn Board Tasks</h2>
          <TaskList onRunComplete={handleTaskRunComplete} />
        </div>

        {/* Output area */}
        {output && (
          <div className="space-y-4 animate-in fade-in duration-500 pt-6 border-t border-border/40">
            {created.length > 0 && (
              <div className="grid gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-1">Folders Created</h3>
                {created.map(({ name, url }) => {
                  const mondayUrl = processedTasks.find((t) => t.name === name)?.mondayUrl;
                  return (
                    <div key={url} className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border/60 shadow-sm transition-all hover:border-primary/30">
                      <div className="h-10 w-10 shrink-0 bg-blue-50 text-blue-600 rounded-md flex items-center justify-center">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{name}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                            <FolderOpen className="h-3 w-3" /> Dropbox
                          </a>
                          {mondayUrl && (
                            <a href={mondayUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" /> Monday.com
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <details className="group border border-border/60 rounded-lg overflow-hidden bg-card mt-6">
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
