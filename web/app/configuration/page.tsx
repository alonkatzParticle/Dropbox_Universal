"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Save, Loader2, Settings2, Sliders, CheckCircle2, Tag, Trash2, Plus, Ban, PackageOpen, Download } from "lucide-react";

export default function ConfigurationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);

  const [config, setConfig] = useState<any>(null);
  const [rawJson, setRawJson] = useState("");
  const [jsonError, setJsonError] = useState("");
  
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [newKeywordInputs, setNewKeywordInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        setRawJson(JSON.stringify(data, null, 2));
        if (data.boards && Object.keys(data.boards).length > 0) {
          setSelectedBoardId(Object.keys(data.boards)[0]);
        }
        setLoading(false);
      });
  }, []);

  // Update visual config when raw JSON is edited
  const handleRawJsonChange = (val: string) => {
    setRawJson(val);
    setJsonError("");
    try {
      const parsed = JSON.parse(val);
      setConfig(parsed);
    } catch {
      // Don't override config state if JSON is invalid, just let them fix it
    }
  };

  // Sync visual updates back to Raw JSON
  const setVisualConfig = (newConfig: any) => {
    setConfig(newConfig);
    setRawJson(JSON.stringify(newConfig, null, 2));
  };

  async function handleSave() {
    try {
      const parsed = JSON.parse(rawJson);
      setJsonError("");
      setSaving(true);
      setSaveStatus(null);
      
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed)
      });
      
      if (res.ok) setSaveStatus("success");
      else setSaveStatus("error");
    } catch(e) {
      setJsonError("Invalid JSON structure. Please fix JSON syntax before saving.");
      setSaveStatus("error");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  }

  // Download the current live config as config.json so it can be committed to git.
  // This is the safeguard against Vercel redeploys wiping KV-stored changes.
  const handleExport = () => {
    const blob = new Blob([rawJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const removeKeyword = (boardId: string, listKey: string, index: number) => {
    const newConfig = { ...config };
    newConfig.boards[boardId][listKey].splice(index, 1);
    setVisualConfig(newConfig);
  };

  const addKeyword = (boardId: string, listKey: string) => {
    const val = newKeywordInputs[`${boardId}_${listKey}`]?.trim();
    if (!val) return;
    
    const newConfig = { ...config };
    if (!newConfig.boards[boardId][listKey]) {
      newConfig.boards[boardId][listKey] = [];
    }
    if (!newConfig.boards[boardId][listKey].includes(val)) {
      newConfig.boards[boardId][listKey].push(val);
    }
    
    setVisualConfig(newConfig);
    setNewKeywordInputs(prev => ({ ...prev, [`${boardId}_${listKey}`]: "" }));
  };

  const KeywordList = ({ boardId, listKey, title, description, icon: Icon, colorClass }: any) => {
    const items = config?.boards?.[boardId]?.[listKey] || [];
    const inputVal = newKeywordInputs[`${boardId}_${listKey}`] || "";

    return (
      <div className={`p-4 rounded-xl border bg-card shadow-sm ${colorClass}`}>
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{description}</p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {items.map((kw: string, i: number) => (
            <div key={i} className="flex items-center gap-1.5 bg-background border px-2.5 py-1 rounded-md text-xs font-medium shadow-sm">
              {kw}
              <button onClick={() => removeKeyword(boardId, listKey, i)} className="text-muted-foreground hover:text-red-500 ml-1">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {items.length === 0 && <span className="text-xs text-muted-foreground italic py-1">No keywords defined.</span>}
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Add new keyword..." 
            className="flex-1 text-xs border rounded-md px-3 py-1.5 focus:outline-primary"
            value={inputVal}
            onChange={(e) => setNewKeywordInputs(prev => ({ ...prev, [`${boardId}_${listKey}`]: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword(boardId, listKey)}
          />
          <Button size="sm" variant="secondary" onClick={() => addKeyword(boardId, listKey)} className="h-auto py-1.5 px-3">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Configuration Rules</h1>
            <p className="text-muted-foreground text-sm max-w-lg">
              Manage core operating variables like pipeline group targets, physical Dropbox root routing, and auto-naming segment engines.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" disabled={!config} className="gap-2 h-10 px-4 shadow-sm text-sm">
              <Download className="h-4 w-4" />
              Export config.json
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2 h-10 px-6 shadow-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Configuration
            </Button>
          </div>
        </div>

        {saveStatus === "success" && (
          <div className="flex flex-col gap-1 bg-green-500/10 p-3 rounded-md border border-green-500/20">
            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> Saved to Vercel KV successfully.
            </div>
            <p className="text-xs text-green-700/80 pl-6">
              ⚠ To prevent this being lost on the next deploy, click <strong>Export config.json</strong> and commit the file to git.
            </p>
          </div>
        )}

        {/* Visual Editors */}
        {config && config.boards && (
          <Card className="border border-border/80 shadow-sm overflow-hidden bg-muted/10">
            <div className="px-5 py-4 border-b border-border/50 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-semibold tracking-wide">Keyword Classifiers & Exclusions</h2>
              </div>
              <select 
                className="border border-input rounded-md px-3 py-1 text-xs font-medium bg-background"
                value={selectedBoardId}
                onChange={(e) => setSelectedBoardId(e.target.value)}
              >
                {Object.entries(config.boards).map(([id, b]: any) => (
                  <option key={id} value={id}>{b.name}</option>
                ))}
              </select>
            </div>
            
            <CardContent className="p-6 grid md:grid-cols-3 gap-4">
              <KeywordList 
                boardId={selectedBoardId} 
                listKey="other_keywords" 
                title="Other Classifiers" 
                description="Products that match these exact strings will dynamically route to the 'Other' category."
                icon={Tag}
                colorClass="border-blue-100/50"
              />
              <KeywordList 
                boardId={selectedBoardId} 
                listKey="bundle_keywords" 
                title="Bundle Classifiers" 
                description="Products containing these words drop neatly into the 'Bundles' category."
                icon={PackageOpen}
                colorClass="border-purple-100/50"
              />
              <KeywordList 
                boardId={selectedBoardId} 
                listKey="ignored_folder_keywords" 
                title="Path Exclusions" 
                description="Critically erase any folder segment matching these strings from the final Dropbox path entirely."
                icon={Ban}
                colorClass="border-red-100/50"
              />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6">
          <Card className="border border-border/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold tracking-wide">Primary Configuration Schema</h2>
            </div>
            
            <div className="p-0">
              <textarea 
                value={rawJson}
                onChange={(e) => handleRawJsonChange(e.target.value)}
                className={`w-full h-[600px] bg-[#1e1e1e] text-zinc-300 font-mono text-sm p-5 focus:outline-none focus:ring-0 resize-y border-0 ${jsonError ? 'border-b-2 border-red-500' : ''}`}
                spellCheck={false}
              />
            </div>
            {jsonError && (
              <div className="px-5 py-3 bg-red-500/10 text-red-500 text-xs font-semibold">
                {jsonError}
              </div>
            )}
          </Card>
        </div>

      </main>
    </div>
  );
}
