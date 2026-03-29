import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getMondayToken(): string | null {
    if (process.env.MONDAY_API_TOKEN) return process.env.MONDAY_API_TOKEN;
    try {
        const p = path.resolve(process.cwd(), "..", ".env");
        const raw = fs.readFileSync(p, "utf-8");
        for (const line of raw.split("\n")) {
            if (line.startsWith("MONDAY_API_TOKEN=")) {
                return line.replace("MONDAY_API_TOKEN=", "").trim();
            }
        }
    } catch {}
    return null;
}

export async function GET() {
    const token = getMondayToken();
    if (!token) {
        return NextResponse.json({ error: "MONDAY_API_TOKEN not found" }, { status: 500 });
    }

    const query = `
        query {
            boards (limit: 1000) {
                id
                name
                workspace {
                    name
                }
            }
        }
    `;

    try {
        const res = await fetch("https://api.monday.com/v2", {
            method: "POST",
            headers: {
                "Authorization": token,
                "Content-Type": "application/json",
                "API-Version": "2023-10"
            },
            body: JSON.stringify({ query })
        });
        
        if (!res.ok) return NextResponse.json({ error: `Monday returned ${res.status}` }, { status: 502 });
        const data = await res.json();
        if (data.errors) return NextResponse.json({ error: data.errors[0].message }, { status: 502 });
        
        const boards = data.data?.boards || [];
        const mapped = boards.map((b: any) => ({
            id: b.id,
            name: b.name,
            workspace: b.workspace?.name || "Main Workspace"
        })).sort((a: any, b: any) => a.name.localeCompare(b.name));

        return NextResponse.json({ boards: mapped });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
