"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Save, KeyRound, Loader2, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<"success" | "error" | null>(null);
  
  const [tokens, setTokens] = useState({
    MONDAY_API_TOKEN: "",
    DROPBOX_APP_KEY: "",
    DROPBOX_APP_SECRET: "",
    DROPBOX_REFRESH_TOKEN: "",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) setTokens(data.settings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokens)
      });
      if (res.ok) setSaveResult("success");
      else setSaveResult("error");
    } catch {
      setSaveResult("error");
    }
    setSaving(false);
    setTimeout(() => setSaveResult(null), 3000);
  }

  if (loading) return <div className="p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-primary" /> API Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your standard Monday.com and Dropbox keys here. These will be securely saved to the .env file.
        </p>
      </div>

      <Card className="p-6 space-y-5">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Monday.com API Token</label>
            <input 
              type="password"
              value={tokens.MONDAY_API_TOKEN} 
              onChange={e => setTokens({...tokens, MONDAY_API_TOKEN: e.target.value})}
              placeholder="ey..."
              className="w-full h-9 rounded-md border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Dropbox App Key</label>
            <input 
              type="text"
              value={tokens.DROPBOX_APP_KEY} 
              onChange={e => setTokens({...tokens, DROPBOX_APP_KEY: e.target.value})}
              placeholder="..."
              className="w-full h-9 rounded-md border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Dropbox App Secret</label>
            <input 
              type="password"
              value={tokens.DROPBOX_APP_SECRET} 
              onChange={e => setTokens({...tokens, DROPBOX_APP_SECRET: e.target.value})}
              placeholder="..."
              className="w-full h-9 rounded-md border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Dropbox Refresh Token</label>
            <input 
              type="password"
              value={tokens.DROPBOX_REFRESH_TOKEN} 
              onChange={e => setTokens({...tokens, DROPBOX_REFRESH_TOKEN: e.target.value})}
              placeholder="..."
              className="w-full h-9 rounded-md border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-border/40">
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Keys
          </Button>
          {saveResult === "success" && <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium"><CheckCircle2 className="h-4 w-4" /> Saved successfully to .env</span>}
          {saveResult === "error" && <span className="text-xs text-destructive">Failed to save keys</span>}
        </div>
      </Card>
    </div>
  );
}