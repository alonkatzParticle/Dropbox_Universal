/**
 * app/api/auto/route.ts — Read and write the auto_enabled flag
 *
 * GET  /api/auto  — returns { enabled: boolean }
 * POST /api/auto  — body: { enabled: boolean }, persists to state
 *
 * When auto_enabled is false, polling mode skips creating folders.
 * This lets you pause automation from the web UI.
 *
 * Depends on: lib/storage.ts
 */

import { NextResponse } from "next/server";
import { loadState, saveState, loadConfig } from "@/lib/storage";
import { runPolling } from "@/lib/core";

// Memory lock to prevent redundant synchronous runs on local
let isPolling = false;

// GET — return the current auto_enabled value and the last polled timestamp
export async function GET() {
  const state = await loadState();
  const enabled = state.auto_enabled !== false; // treat missing as true
  const lastPolledStr = state.lastPolled as string | undefined;

  // Next.js Local Dev Workaround:
  // Because `npm run dev` aggressively sleeps background setIntervals during HMR, 
  // we tie the cron loop natively to the UI's 5s heartbeat fetch.
  if (!process.env.VERCEL && enabled && lastPolledStr && !isPolling) {
    const lastPolledMs = new Date(lastPolledStr).getTime();
    const intervalMs = parseInt(process.env.POLL_INTERVAL_MINUTES ?? "5", 10) * 60 * 1000;
    
    if (Date.now() - lastPolledMs >= intervalMs) {
      isPolling = true;
      // Trigger silently in background without blocking this UI payload response
      loadConfig()
        .then((config) => runPolling(config))
        .catch((err) => console.error("[Heartbeat Poller Error]", err))
        .finally(() => { isPolling = false; });
    }
  }

  return NextResponse.json({ enabled, lastPolled: lastPolledStr });
}

// POST — update auto_enabled in state
export async function POST(request: Request) {
  const body = await request.json();
  const enabled = Boolean(body.enabled);
  const state = await loadState();
  state.auto_enabled = enabled;
  await saveState(state);
  return NextResponse.json({ enabled });
}
