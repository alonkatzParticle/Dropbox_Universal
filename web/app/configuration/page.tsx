"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Save, Loader2, Settings2, Sliders, CheckCircle2 } from "lucide-react";

export default function ConfigurationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);

  // Raw JSON mode
  const [rawJson, setRawJson] = useState("");
  const [jsonError, setJsonError] = useState("");

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        setRawJson(JSON.stringify(data, null, 2));
        setLoading(false);
      });
  }, []);

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
          <Button onClick={handleSave} disabled={saving} className="gap-2 h-10 px-6 shadow-sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Configuration
          </Button>
        </div>

        {saveStatus === "success" && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-500/10 p-3 rounded-md border border-green-500/20">
            <CheckCircle2 className="h-4 w-4" /> Successfully persisted natively to Vercel KV and filesystem.
          </div>
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
                onChange={(e) => { setRawJson(e.target.value); setJsonError(""); }}
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
