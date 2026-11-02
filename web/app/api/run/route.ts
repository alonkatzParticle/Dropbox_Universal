/**
 * app/api/run/route.ts — Trigger automation runs from the web UI
 *
 * POST /api/run
 * Body: { mode: "poll" | "sync" | "task" | "all" | "manual" | "selected", url?, force?, items? }
 *
 * Runs the requested automation mode and returns the log output as JSON.
 * All logic lives in lib/core.ts — this route is just the HTTP entry point.
 *
 * Depends on: lib/core.ts, lib/storage.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { runPolling, runAll, runManual, runSelected } from "@/lib/core";
import { loadConfig } from "@/lib/storage";
import { runTaskActions } from "@/lib/manual-actions";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { mode, url, force, items, rename, folder } = body as {
    mode?: string;
    url?: string;
    force?: boolean;
    rename?: boolean;   // mode "task": re-apply naming rules
    folder?: boolean;   // mode "task": create a new Dropbox folder
    items?: { boardId: string; itemId: string }[];
  };

  try {
    const config = await loadConfig();
    let output = "";

    if (mode === "manual") {
      if (!url) return NextResponse.json({ error: "url is required for manual mode" }, { status: 400 });
      // Extract boardId and itemId from the Monday.com URL
      const match = url.match(/\/boards\/(\d+)\/pulses\/(\d+)/);
      if (!match) return NextResponse.json({ error: "Invalid Monday.com URL format" }, { status: 400 });
      output = await runManual(match[1], match[2], config, force ?? false);
    } else if (mode === "all") {
      output = await runAll(config);
    } else if (mode === "selected") {
      if (!items?.length) return NextResponse.json({ error: "items required for selected mode" }, { status: 400 });
      output = await runSelected(items, config, force ?? false);
    } else if (mode === "task") {
      // Homepage "Fix a single task": rename and/or new folder for one pasted URL
      if (!url) return NextResponse.json({ error: "url is required for task mode" }, { status: 400 });
      output = await runTaskActions(url, config, { rename: Boolean(rename), folder: Boolean(folder) });
    } else if (mode === "sync") {
      // Homepage Sync button: every task without a link, in any non-excluded group
      output = await runPolling(config, true);
    } else {
      // Default: poll mode (Form Requests only)
      output = await runPolling(config);
    }

    return NextResponse.json({ output, success: true });
  } catch (e) {
    return NextResponse.json({ output: String(e), success: false }, { status: 500 });
  }
}
