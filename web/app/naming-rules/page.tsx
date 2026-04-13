"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Zap, CheckCircle2 } from "lucide-react";

export default function AutoNamePage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");

  // Scanner state
  const [scanning, setScanning] = useState(false);
  const [mismatches, setMismatches] = useState<any[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [renamingIds, setRenamingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/config")
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        const firstBoardId = Object.keys(data.boards || {})[0];
        setSelectedBoardId(firstBoardId || "");
        setLoading(false);
      });
  }, []);

  const scanBoard = async () => {
    setScanning(true);
    setHasScanned(false);
    try {
      const res = await fetch(`/api/auto-name-tasks?boardId=${selectedBoardId}`);
      const data = await res.json();
      setMismatches(data.mismatches || []);
    } catch (err) {
      console.error(err);
    }
    setScanning(false);
    setHasScanned(true);
  };

  const renameTask = async (taskId: string, expectedName: string) => {
    setRenamingIds(prev => new Set(prev).add(taskId));
    try {
      await fetch("/api/auto-name-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId: selectedBoardId, itemId: taskId, newName: expectedName })
      });
      // Remove from mismatches on success
      setMismatches(prev => prev.filter(m => m.id !== taskId));
    } catch (err) {
      console.error(err);
    }
    setRenamingIds(prev => { const s = new Set(prev); s.delete(taskId); return s; });
  };

  const renameAll = async () => {
    for (const m of mismatches) {
      await renameTask(m.id, m.expectedName);
    }
  };

  if (loading || !config) {
    return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-5 w-5" />Loading environment...</div>;
  }

  const board = config.boards?.[selectedBoardId];
  if (!board) return <div className="p-8">No boards found.</div>;

  const autoName = board.autoName || { template: "" };
  const templateStr = autoName.template || "";

  const availableFields = ["taskName", ...Object.keys(board.columns || {}), ...Object.keys(board.fallback_values || {})];
  const uniqueFields = Array.from(new Set(availableFields));

  const updateConfig = async (newConfig: any) => {
    setConfig(newConfig);
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConfig)
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 flex gap-8">
      {/* LEFT COLUMN: Rule Builder */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Naming Rules</h1>
            <p className="text-muted-foreground text-sm">Define string formats for Monday</p>
          </div>
          <select 
            className="border border-input rounded-md px-3 py-1.5 bg-background text-sm font-medium"
            value={selectedBoardId}
            onChange={(e) => { setSelectedBoardId(e.target.value); setHasScanned(false); setMismatches([]); }}
          >
            {Object.entries(config.boards).map(([id, b]: any) => (
              <option key={id} value={id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-4 bg-muted/20 p-6 rounded-xl border border-border/50">
          <div>
            <label className="text-sm font-semibold text-foreground">Routing String Template</label>
            <p className="text-xs text-muted-foreground mb-3 mt-1">
              Use <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-[11px]">{"{{"}field{"}}"}</code> to insert dynamic values. Use <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-[11px]">{"{{"}field|fallback{"}}"}</code> to chain fallbacks.
            </p>
            <textarea 
              className="w-full h-28 p-4 text-sm font-mono border border-input rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={templateStr}
              onChange={e => {
                const newConfig = { ...config };
                if (!newConfig.boards[selectedBoardId].autoName) newConfig.boards[selectedBoardId].autoName = {};
                newConfig.boards[selectedBoardId].autoName.template = e.target.value;
                setConfig(newConfig); // Optimistic UI update
              }}
              onBlur={() => updateConfig(config)} // Save only when clicking away
              placeholder="{{product}} | {{platform|department}} | {{taskName}}"
            />
          </div>

          <div className="pt-4 border-t border-border/50">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Available Variables</h3>
            <div className="flex flex-wrap gap-2">
              {uniqueFields.map(f => (
                <span key={f} className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm"
                  title="Click to append to template"
                  onClick={() => {
                     const newConfig = { ...config };
                     const currentTemplate = newConfig.boards[selectedBoardId].autoName?.template || "";
                     newConfig.boards[selectedBoardId].autoName = { 
                       ...newConfig.boards[selectedBoardId].autoName, 
                       template: currentTemplate + (currentTemplate && !currentTemplate.endsWith(" ") ? " | " : "") + `{{${f}}}` 
                     };
                     updateConfig(newConfig);
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Execution Dashboard */}
      <div className="w-[500px] shrink-0 space-y-4">
         <Card className="p-6 bg-blue-50/30 border-blue-100 h-full flex flex-col">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Execution Engine
            </h2>
            <p className="text-sm text-muted-foreground mb-6 mt-1">Scan the active Monday.com board and force mismatched items to conform to your rules.</p>
            
            <Button 
                onClick={scanBoard} 
                disabled={scanning} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-5 shadow-sm"
            >
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {scanning ? "Scanning Monday.com..." : "Scan Board"}
            </Button>

            {hasScanned && mismatches.length === 0 && (
                <div className="mt-8 flex flex-col items-center justify-center py-12 text-center border border-dashed border-green-200 bg-green-50/50 rounded-lg">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                    <p className="font-medium text-green-800">Everything is perfect!</p>
                    <p className="text-xs text-green-600/70 mt-1 px-4">All tasks on this board perfectly match your active naming rules.</p>
                </div>
            )}

            {hasScanned && mismatches.length > 0 && (
                <div className="mt-6 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-600/80">{mismatches.length} Mismatches Found</span>
                        <button onClick={renameAll} className="text-xs font-semibold text-blue-600 hover:underline">Fix All</button>
                    </div>

                    <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                        {mismatches.map((m) => (
                            <div key={m.id} className="p-3 bg-white border border-border shadow-sm rounded-lg flex flex-col gap-2 relative group transition-all hover:bg-slate-50">
                                <span className="absolute top-3 right-3 text-[10px] font-medium bg-muted px-2 py-0.5 rounded text-muted-foreground">{m.group}</span>
                                <div>
                                    <p className="text-xs text-red-500 font-medium tracking-tight">CURRENT</p>
                                    <p className="text-sm line-through text-muted-foreground break-words pr-16">{m.currentName}</p>
                                </div>
                                <div className="mt-1">
                                    <p className="text-xs text-green-600 font-medium tracking-tight">EXPECTED</p>
                                    <p className="text-sm font-semibold break-words pr-16">{m.expectedName}</p>
                                </div>

                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="w-full mt-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                                    onClick={() => renameTask(m.id, m.expectedName)}
                                    disabled={renamingIds.has(m.id)}
                                >
                                    {renamingIds.has(m.id) ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : "Push Rename Action"}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
         </Card>
      </div>
    </div>
  );
}
