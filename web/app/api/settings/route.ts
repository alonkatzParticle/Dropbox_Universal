import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ENV_PATH = path.resolve(process.cwd(), "..", ".env");

export async function GET() {
  try {
    let raw = "";
    try { raw = fs.readFileSync(ENV_PATH, "utf-8"); } catch {}
    const fields = { MONDAY_API_TOKEN: "", DROPBOX_APP_KEY: "", DROPBOX_APP_SECRET: "", DROPBOX_REFRESH_TOKEN: "" };
    raw.split("\n").forEach(line => {
      const [key, ...rest] = line.split("=");
      if (key && key in fields) {
         // @ts-ignore
         fields[key] = rest.join("=").trim();
      }
    });
    return NextResponse.json({ success: true, settings: fields });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let raw = "";
    try { raw = fs.readFileSync(ENV_PATH, "utf-8"); } catch {}
    const newTokens = { 
      MONDAY_API_TOKEN: body.MONDAY_API_TOKEN ?? "", 
      DROPBOX_APP_KEY: body.DROPBOX_APP_KEY ?? "", 
      DROPBOX_APP_SECRET: body.DROPBOX_APP_SECRET ?? "", 
      DROPBOX_REFRESH_TOKEN: body.DROPBOX_REFRESH_TOKEN ?? "" 
    };
    const lines = raw.split("\n").filter(Boolean);
    for (const [key, val] of Object.entries(newTokens)) {
      const idx = lines.findIndex(l => l.startsWith(`${key}=`));
      if (idx !== -1) {
          lines[idx] = `${key}=${val}`;
      } else {
          lines.push(`${key}=${val}`);
      }
    }
    fs.writeFileSync(ENV_PATH, lines.join("\n") + "\n");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
