import { NextResponse } from "next/server";
import { loadConfig } from "@/lib/storage";
import { Board, BoardConfig } from "@/lib/board";
import { getNewItems, updateItemName } from "@/lib/monday-client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("boardId");

    if (!boardId) {
      return NextResponse.json({ error: "Missing boardId" }, { status: 400 });
    }

    const config = await loadConfig();
    const boardConfig = config.boards?.[boardId] as BoardConfig | undefined;

    if (!boardConfig) {
      return NextResponse.json({ error: "Board not configured" }, { status: 404 });
    }

    const board = new Board(boardId, boardConfig);
    if (!board.autoName || !board.autoName.segments || board.autoName.segments.length === 0) {
      return NextResponse.json({ mismatches: [] });
    }

    // Fetch the latest items. We fetch everything recent. Let's fetch from early 2026 or a wide margin.
    const items = await getNewItems(boardId, "2024-01-01T00:00:00Z");

    const mismatches = [];

    for (const item of items) {
      const expectedName = board.getAutoName(item);
      if (expectedName && expectedName !== item.name && expectedName.length > 0) {
        mismatches.push({
          id: item.id,
          currentName: item.name,
          expectedName: expectedName,
          group: item.group?.title || "Unknown"
        });
      }
    }

    return NextResponse.json({ mismatches });
  } catch (error: any) {
    console.error("GET /api/auto-name-tasks error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { boardId, itemId, newName } = await request.json();

    if (!boardId || !itemId || !newName) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    await updateItemName(itemId, boardId, newName);

    return NextResponse.json({ success: true, updatedId: itemId });
  } catch (error: any) {
    console.error("POST /api/auto-name-tasks error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
