"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, Layers, Film, Image, ExternalLink, AlertTriangle, RouteOff } from "lucide-react";

export interface Task {
  id: string;
  boardId: string;
  boardName: string;
  mediaType: "Video" | "Image";
  name: string;
  mondayUrl: string;
  previewPath?: string;
  department?: string;
  isAmbiguous?: boolean;
}

interface TaskListProps {
  onRunComplete: (output: string, success: boolean, processedTasks: Task[]) => void;
}

export default function TaskList({ onRunComplete }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showVideo, setShowVideo] = useState(true);
  const [showImage, setShowImage] = useState(true);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setSelectedIds(new Set());
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const visibleTasks = tasks.filter((t) =>
    (t.mediaType === "Video" && showVideo) || (t.mediaType === "Image" && showImage)
  );

  const ambiguousTasks = visibleTasks.filter(t => t.isAmbiguous);
  const routableTasks = visibleTasks.filter(t => !t.isAmbiguous);

  const allRoutableSelected = routableTasks.length > 0 && routableTasks.every((t) => selectedIds.has(t.id));

  function toggleTask(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllRoutable() {
    if (allRoutableSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        routableTasks.forEach((t) => next.delete(t.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        routableTasks.forEach((t) => next.add(t.id));
        return next;
      });
    }
  }

  async function processSelected() {
    const toProcess = tasks.filter((t) => selectedIds.has(t.id) && !t.isAmbiguous);
    if (!toProcess.length) return;
    setIsProcessing(true);
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "selected",
        items: toProcess.map((t) => ({ boardId: t.boardId, itemId: t.id })),
      }),
    });
    const data = await res.json();
    onRunComplete(data.output ?? "", data.success, toProcess);
    setIsProcessing(false);
    fetchTasks();
  }

  const selectedCount = [...selectedIds].filter((id) => routableTasks.some((t) => t.id === id)).length;

  const renderTableRows = (tasksArray: Task[], isAmbiguousTable: boolean) => {
    if (isLoading) {
      return [0, 1, 2].map((i) => (
        <tr key={i} className={`border-b ${isAmbiguousTable ? 'border-red-200/50' : 'border-border/40'} last:border-0`}>
          {!isAmbiguousTable && <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>}
          <td className="px-4 py-3"><Skeleton className="h-4 w-64" /></td>
          <td className="px-4 py-3 text-right"><Skeleton className="h-5 w-24 ml-auto" /></td>
        </tr>
      ));
    }

    if (tasksArray.length === 0) {
      return (
        <tr>
          <td colSpan={isAmbiguousTable ? 2 : 3} className="px-4 py-8 text-center text-xs text-muted-foreground">
            {isAmbiguousTable ? "No unmapped tasks detected." : "No routable tasks found matching filters."}
          </td>
        </tr>
      );
    }

    return tasksArray.map((task) => (
      <tr
        key={task.id}
        className={`border-b last:border-0 transition-colors ${
          isAmbiguousTable 
            ? "border-red-200/50 bg-red-50/20 hover:bg-red-50/50" 
            : "border-border/40 hover:bg-muted/30 cursor-pointer"
        }`}
        onClick={() => !isAmbiguousTable && toggleTask(task.id)}
      >
        {!isAmbiguousTable && (
          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedIds.has(task.id)}
              onCheckedChange={() => toggleTask(task.id)}
              aria-label={`Select ${task.name}`}
            />
          </td>
        )}
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {isAmbiguousTable && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0">
                        Unknown Dept
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      The department <span className="font-mono font-bold text-red-400">"{task.department}"</span> is missing from your routing config.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {!isAmbiguousTable && task.previewPath ? (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-medium truncate cursor-default">{task.name}</span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-sm text-xs font-mono">
                      {task.previewPath.split("/").filter(Boolean).map((segment, i, arr) => (
                        <span key={i}>
                          {segment}
                          {i < arr.length - 1 && <span className="text-muted-foreground mx-1">›</span>}
                        </span>
                      ))}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <span className={`font-medium truncate ${isAmbiguousTable ? 'text-red-900 font-semibold' : ''}`}>{task.name}</span>
              )}
              <a
                href={task.mondayUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 text-blue-500 hover:text-blue-600"
                title="Open in Monday.com"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            {isAmbiguousTable && (
              <span className="text-xs text-red-600/80 font-medium">
                Unmapped Department: <b className="font-bold text-red-700 mx-1">{task.department || "Blank"}</b> — Please map this config or use manual override above to fix.
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <Badge
            variant={task.mediaType === "Video" ? "default" : "secondary"}
            className="text-xs"
          >
            {task.boardName}
          </Badge>
        </td>
      </tr>
    ));
  };

  return (
    <section className="space-y-6">
      {/* Section header with toggles */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Missing Links Database
        </h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <Film className="h-3.5 w-3.5" /> Video
            <Switch checked={showVideo} onCheckedChange={setShowVideo} className="scale-75" />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <Image className="h-3.5 w-3.5" /> Image
            <Switch checked={showImage} onCheckedChange={setShowImage} className="scale-75" />
          </label>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchTasks}
            disabled={isLoading}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {ambiguousTasks.length > 0 && (
        <Card className="border-red-200 shadow-sm overflow-hidden bg-white">
          <div className="bg-red-50 px-4 py-3 border-b border-red-200 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-red-800 flex items-center gap-2">
                <RouteOff className="h-4 w-4" /> Route Unrecognized (Manual Intervention Required)
              </span>
              <span className="text-xs text-red-600 font-medium mt-0.5">The engine strictly refused to auto-route these because their Department dropdown matches no rules.</span>
            </div>
            <Badge variant="destructive" className="font-mono">{ambiguousTasks.length} Error{ambiguousTasks.length !== 1 ? 's' : ''}</Badge>
          </div>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-64">
              <table className="w-full text-sm">
                <tbody>
                  {renderTableRows(ambiguousTasks, true)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-auto max-h-80 rounded-t-xl">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                <tr className="border-b border-border/60">
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={allRoutableSelected}
                      onCheckedChange={toggleAllRoutable}
                      disabled={routableTasks.length === 0}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-2 py-3 text-left font-medium text-muted-foreground">Standard Pending Tasks</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Board</th>
                </tr>
              </thead>
              <tbody>
                {renderTableRows(routableTasks, false)}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20">
            <span className="text-xs text-muted-foreground">
              {isLoading ? "Loading…" : `${routableTasks.length} standard task${routableTasks.length !== 1 ? "s" : ""} pending`}
            </span>
            <Button
              size="sm"
              disabled={selectedCount === 0 || isProcessing}
              onClick={processSelected}
            >
              {isProcessing ? (
                <><Layers className="h-3.5 w-3.5 mr-2 animate-pulse" />Creating…</>
              ) : (
                <><Layers className="h-3.5 w-3.5 mr-2" />
                  {selectedCount > 0
                    ? `Create Dropbox Folder${selectedCount > 1 ? "s" : ""} (${selectedCount})`
                    : "Create Dropbox Folders"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
