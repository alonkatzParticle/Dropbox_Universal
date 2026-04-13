"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Zap, CheckCircle2, Copy, Trash2, Plus, GripVertical } from "lucide-react";

interface RuleCondition {
  field: string;
  operator: "equals" | "not_equals" | "is_empty" | "not_empty";
  value?: string;
}

interface NamingRule {
  id: string;
  conditions: RuleCondition[];
  template: string;
}

export default function AutoNamePage() {
  const [loading, setLoading] = useState(true);
  const [columnLoading, setColumnLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [columnOptions, setColumnOptions] = useState<Record<string, string[]>>({});

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

  useEffect(() => {
    if (!selectedBoardId || !config?.boards?.[selectedBoardId]) return;
    const board = config.boards[selectedBoardId];
    if (!board.columns || Object.keys(board.columns).length === 0) return;
    
    setColumnLoading(true);
    const colIds = Object.values(board.columns).join(",");
    fetch(`/api/monday-column-options?boardIds=${selectedBoardId}&columnIds=${colIds}`)
      .then(r => r.json())
      .then(data => {
         if (data[selectedBoardId]) {
            const optionsMap: Record<string, string[]> = {};
            for (const [fieldName, colId] of Object.entries(board.columns as Record<string, string>)) {
               optionsMap[fieldName] = data[selectedBoardId][colId as string] || [];
            }
            // Sort options alphabetically for better UI
            for (const key in optionsMap) optionsMap[key].sort();
            setColumnOptions(optionsMap);
         }
      })
      .finally(() => setColumnLoading(false));
  }, [selectedBoardId, config?.boards]);

  const updateConfig = async (newConfig: any) => {
    setConfig(newConfig);
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConfig)
    });
  };

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
      setMismatches(prev => prev.filter(m => m.id !== taskId));
    } catch (err) {
      console.error(err);
    }
    setRenamingIds(prev => { const s = new Set(prev); s.delete(taskId); return s; });
  };

  const renameAll = async () => {
    for (const m of mismatches) await renameTask(m.id, m.expectedName);
  };

  if (loading || !config) {
    return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-5 w-5" />Loading environment...</div>;
  }

  const board = config.boards?.[selectedBoardId];
  if (!board) return <div className="p-8">No boards found.</div>;

  const rules: NamingRule[] = board.autoName?.rules || [];
  const availableFields = ["taskName", ...Object.keys(board.columns || {}), ...Object.keys(board.fallback_values || {})];
  const uniqueFields = Array.from(new Set(availableFields));

  const addRule = () => {
    const newConfig = { ...config };
    if (!newConfig.boards[selectedBoardId].autoName) newConfig.boards[selectedBoardId].autoName = { rules: [] };
    if (!newConfig.boards[selectedBoardId].autoName.rules) newConfig.boards[selectedBoardId].autoName.rules = [];
    
    newConfig.boards[selectedBoardId].autoName.rules.push({
      id: "rule_" + Date.now(),
      conditions: [],
      template: "{{product}} | {{taskName}}"
    });
    updateConfig(newConfig);
  };

  const duplicateRule = (index: number) => {
    const newConfig = { ...config };
    const ruleToClone = newConfig.boards[selectedBoardId].autoName.rules[index];
    newConfig.boards[selectedBoardId].autoName.rules.splice(index + 1, 0, {
      ...JSON.parse(JSON.stringify(ruleToClone)),
      id: "rule_" + Date.now(),
    });
    updateConfig(newConfig);
  };

  const deleteRule = (index: number) => {
    const newConfig = { ...config };
    newConfig.boards[selectedBoardId].autoName.rules.splice(index, 1);
    updateConfig(newConfig);
  };

  const updateRuleTemplate = (index: number, val: string) => {
    const newConfig = { ...config };
    newConfig.boards[selectedBoardId].autoName.rules[index].template = val;
    setConfig(newConfig); // Optimistic updating during typing
  };

  const addCondition = (ruleIndex: number) => {
    const newConfig = { ...config };
    const rule = newConfig.boards[selectedBoardId].autoName.rules[ruleIndex];
    if (!rule.conditions) rule.conditions = [];
    rule.conditions.push({ field: "department", operator: "equals", value: "" });
    updateConfig(newConfig);
  };

  const updateCondition = (ruleIndex: number, condIndex: number, key: string, val: string) => {
    const newConfig = { ...config };
    newConfig.boards[selectedBoardId].autoName.rules[ruleIndex].conditions[condIndex][key] = val;
    updateConfig(newConfig);
  };

  const deleteCondition = (ruleIndex: number, condIndex: number) => {
    const newConfig = { ...config };
    newConfig.boards[selectedBoardId].autoName.rules[ruleIndex].conditions.splice(condIndex, 1);
    updateConfig(newConfig);
  };

  const moveRule = (index: number, direction: -1 | 1) => {
    const newConfig = { ...config };
    const r = newConfig.boards[selectedBoardId].autoName.rules;
    if (index + direction < 0 || index + direction >= r.length) return;
    const temp = r[index];
    r[index] = r[index + direction];
    r[index + direction] = temp;
    updateConfig(newConfig);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 flex gap-8">
      {/* LEFT COLUMN: Rule Builder */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Naming Rules</h1>
            <p className="text-muted-foreground text-sm">Design syntax templates using advanced Boolean matching</p>
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



        <div className="space-y-4">
          {rules.length === 0 && (
            <div className="p-8 border-2 border-dashed border-border/60 rounded-xl text-center text-muted-foreground">
              No routing string blocks configured yet.
            </div>
          )}

          {rules.map((rule, ruleIdx) => {
            const isDefault = !rule.conditions || rule.conditions.length === 0;

            return (
              <div key={rule.id} className="bg-white border rounded-xl shadow-sm transition-all relative group flex flex-col overflow-hidden">
                <div className="bg-muted/30 px-3 py-2 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      Rule Block {ruleIdx + 1}
                    </span>
                    {isDefault && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        Default Fallback
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveRule(ruleIdx, -1)} disabled={ruleIdx === 0}><GripVertical className="h-3 w-3 rotate-90" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveRule(ruleIdx, 1)} disabled={ruleIdx === rules.length - 1}><GripVertical className="h-3 w-3 rotate-90" /></Button>
                    <div className="w-px h-4 bg-border mx-1"></div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" title="Duplicate rule block" onClick={() => duplicateRule(ruleIdx)}><Copy className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteRule(ruleIdx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                <div className="p-4 grid gap-4">
                  {/* Conditions Engine */}
                  <div className="space-y-2 bg-muted/10 p-3 rounded-lg border border-border/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        Execution Conditions
                        {columnLoading && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase font-bold" onClick={() => addCondition(ruleIdx)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Condition
                      </Button>
                    </div>

                    {isDefault && (
                      <div className="text-sm text-foreground/70 italic p-2 border border-dashed rounded-md text-center bg-white">
                        If the task reached this block, it will always evaluate true.
                      </div>
                    )}

                    {!isDefault && rule.conditions.map((cond, condIdx) => (
                      <div key={condIdx} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground w-8 text-right shrink-0">
                          {condIdx === 0 ? "IF" : "AND"}
                        </span>
                        <select className="border border-input rounded-md px-2 py-1.5 text-sm bg-white" value={cond.field} onChange={e => updateCondition(ruleIdx, condIdx, "field", e.target.value)}>
                          {Object.keys(board.columns || {}).map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <select className="border border-input rounded-md px-2 py-1.5 text-sm bg-white shrink-0" value={cond.operator} onChange={e => updateCondition(ruleIdx, condIdx, "operator", e.target.value)}>
                          <option value="equals">is exactly</option>
                          <option value="not_equals">is not</option>
                          <option value="is_empty">is empty</option>
                          <option value="not_empty">is not empty</option>
                        </select>
                        
                        {(cond.operator === "equals" || cond.operator === "not_equals") && (
                          <select 
                            className="border border-input rounded-md px-2 py-1.5 text-sm flex-1 bg-white" 
                            value={cond.value || ""} 
                            onChange={e => updateCondition(ruleIdx, condIdx, "value", e.target.value)}
                          >
                            <option value="">(Select value...)</option>
                            {(columnOptions[cond.field] || []).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 shrink-0 hover:bg-red-50" onClick={() => deleteCondition(ruleIdx, condIdx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Template Editor */}
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Yield Name As:</label>
                        <div className="flex flex-wrap gap-1.5 justify-end">
                            {uniqueFields.map(f => (
                                <span 
                                    key={f} 
                                    className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm"
                                    onClick={() => {
                                        const currentVal = rule.template || "";
                                        updateRuleTemplate(ruleIdx, currentVal + (currentVal && !currentVal.endsWith(" ") ? " | " : "") + `{{${f}}}`);
                                        updateConfig(config);
                                    }}
                                >
                                    {f}
                                </span>
                            ))}
                        </div>
                    </div>
                    
                    <input 
                      type="text"
                      className="w-full p-3 font-mono text-sm border rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={rule.template}
                      onChange={(e) => updateRuleTemplate(ruleIdx, e.target.value)}
                      onBlur={() => updateConfig(config)}
                      placeholder="{{product}} | {{platform}} | {{taskName}}"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <Button 
            variant="outline" 
            className="w-full border-dashed py-8 bg-blue-50/20 text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all"
            onClick={addRule}
          >
            <Plus className="h-5 w-5 mr-2" /> Append New Rule Block
          </Button>
        </div>
      </div>

      {/* RIGHT COLUMN: Execution Dashboard */}
      <div className="w-[500px] shrink-0 space-y-4 sticky top-8">
         <Card className="p-6 bg-blue-50 border-blue-200/60 shadow-sm flex flex-col sticky top-8 h-[calc(100vh-4rem)]">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Execution Simulator
            </h2>
            <p className="text-sm text-muted-foreground mb-6 mt-1">Force evaluate all active active Monday.com tasks against your rules pipeline.</p>
            
            <Button 
                onClick={scanBoard} 
                disabled={scanning} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-5 shadow-md"
            >
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {scanning ? "Evaluating Pipeline..." : "Scan Board"}
            </Button>

            {hasScanned && mismatches.length === 0 && (
                <div className="mt-8 flex flex-col items-center justify-center py-12 text-center border border-dashed border-green-200 bg-green-50/50 rounded-lg">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                    <p className="font-medium text-green-800">Perfect Formatting!</p>
                    <p className="text-xs text-green-600/70 mt-1 px-4">All tasks pass through the firewall successfully.</p>
                </div>
            )}

            {hasScanned && mismatches.length > 0 && (
                <div className="mt-6 flex flex-col h-full min-h-0">
                    <div className="flex items-center justify-between mb-3 px-1 shrink-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-600/80 bg-amber-100/50 px-2 py-1 rounded">{mismatches.length} Mismatches</span>
                        <button onClick={renameAll} className="text-xs font-semibold text-blue-600 hover:underline">Fix All Tasks</button>
                    </div>

                    <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
                        {mismatches.map((m) => (
                            <div key={m.id} className="p-3 bg-white border border-border shadow-sm rounded-lg flex flex-col gap-2 relative group transition-all hover:border-blue-200">
                                <span className="absolute top-3 right-3 text-[10px] font-medium bg-muted px-2 py-0.5 rounded text-muted-foreground">{m.group}</span>
                                <div>
                                    <p className="text-[10px] font-bold text-red-500 tracking-wider">CURRENT</p>
                                    <p className="text-sm line-through text-muted-foreground break-words pr-16">{m.currentName}</p>
                                </div>
                                <div className="mt-1">
                                    <p className="text-[10px] font-bold text-green-600 tracking-wider">EXPECTED</p>
                                    <p className="text-sm font-semibold break-words pr-16">{m.expectedName}</p>
                                </div>

                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="w-full mt-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                                    onClick={() => renameTask(m.id, m.expectedName)}
                                    disabled={renamingIds.has(m.id)}
                                >
                                    {renamingIds.has(m.id) ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : "Approve Formatting"}
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
