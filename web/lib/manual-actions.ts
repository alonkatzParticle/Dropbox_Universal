/**
 * lib/manual-actions.ts — Fix up ONE task picked by pasting its Monday.com URL.
 *
 * Used by the "Fix a single task" card on the homepage. The user chooses one or both:
 *   - rename: re-apply the board's Naming Rules to the task name (even if already named)
 *   - folder: create a NEW Dropbox folder and write its link to Monday (replaces any old link)
 *
 * How it fits in: same building blocks as polling (Board.getAutoName, processItem),
 * but for a single task and ignoring the "Form Requests only" / "already done" checks.
 *
 * Depends on: lib/monday-client.ts, lib/board.ts, lib/core.ts, lib/logger.ts
 * Used by: app/api/run/route.ts (mode "task")
 */

import { getItemById, updateItemName } from "./monday-client";
import { Board, BoardConfig } from "./board";
import { processItem } from "./core";
import { log } from "./logger";

/**
 * Pull the board ID and item ID out of a Monday.com task URL.
 * Input: a URL like https://x.monday.com/boards/123/views/9/pulses/456
 * Returns: { boardId, itemId } or null if the URL doesn't look like a task link.
 */
export function parseTaskUrl(url: string): { boardId: string; itemId: string } | null {
  const board = url.match(/\/boards\/(\d+)/);            // Board ID
  const item = url.match(/\/(?:pulses|items)\/(\d+)/);   // Task ID ("pulses" is Monday's old word)
  if (!board || !item) return null;
  return { boardId: board[1], itemId: item[1] };
}

/**
 * Run the selected actions on one task.
 * Inputs: the task URL, the app config, and which actions to run.
 * Returns: a human-readable log. Each action is attempted separately, so a failed
 * rename doesn't stop the folder from being created (and vice versa).
 */
export async function runTaskActions(
  url: string,
  config: Record<string, unknown>,
  actions: { rename: boolean; folder: boolean }
): Promise<string> {
  const ids = parseTaskUrl(url);
  if (!ids) return "✗ That doesn't look like a Monday.com task link (it needs /boards/… and /pulses/…).";

  const boards = config.boards as Record<string, BoardConfig>;
  const boardConfig = boards[ids.boardId];
  if (!boardConfig) return `✗ Board ${ids.boardId} isn't set up in this app.`;
  if (!actions.rename && !actions.folder) return "✗ Pick at least one thing to update.";

  const board = new Board(ids.boardId, boardConfig);
  const item = await getItemById(ids.itemId); // Fresh copy of the task from Monday
  const lines = [`Task: '${item.name}' (${board.name})`];

  // 1. Rename (done first, so the log and Monday show the new name)
  if (actions.rename) {
    try {
      const newName = board.getAutoName(item, true);
      if (!newName) lines.push("  ↷ Rename skipped — this board has no naming rule.");
      else if (newName === item.name) lines.push("  ↷ Name already matches the naming rule.");
      else {
        await updateItemName(item.id, ids.boardId, newName);
        lines.push(`  ✓ Renamed to '${newName}'`);
        await log("info", "runTaskActions", `Renamed '${item.name}' → '${newName}'`, { boardId: ids.boardId, itemId: item.id });
        item.name = newName; // Keep the local copy in sync for the folder step
      }
    } catch (e) {
      lines.push(`  ✗ Rename failed: ${e}`);
      await log("error", "runTaskActions", `Rename failed for item ${item.id}`, { boardId: ids.boardId, error: String(e) });
    }
  }

  // 2. New Dropbox folder (force=true: create even if a link already exists)
  if (actions.folder) {
    try {
      const { path, link } = await processItem(item, ids.boardId, boardConfig, config, true);
      lines.push(`→ Processing: ${item.name}`);   // These two lines let the homepage
      lines.push(`  Link: ${link}`);              // show a clickable folder card
      lines.push(`  ✓ Folder: ${path}`);
    } catch (e) {
      lines.push(`  ✗ Folder failed: ${e}`);
      await log("error", "runTaskActions", `Folder failed for item ${item.id}`, { boardId: ids.boardId, error: String(e) });
    }
  }

  return lines.join("\n");
}
