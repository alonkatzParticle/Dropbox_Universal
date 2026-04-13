import { Board } from "./web/lib/board";
import fs from "fs";

async function main() {
  const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;
  
  const query = `query {
    items(ids: [2835466690]) {
      id
      name
      column_values {
        id
        text
        value
      }
    }
  }`;

  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: MONDAY_API_TOKEN,
      "API-Version": "2024-04"
    },
    body: JSON.stringify({ query })
  });

  const data = await res.json();
  const item = data.data.items[0];
  
  if (!item) {
    console.error("Item not found!");
    return;
  }

  console.log("ITEM FETCHED:", item.name);
  
  const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
  const boardId = "5093001619";
  const board = new Board(boardId, config.boards[boardId]);

  console.log("\nRAW COLUMN VALUES:");
  console.log("Department column (", board.columns.department, "):", item.column_values.find((c: any) => c.id === board.columns.department)?.text);
  console.log("Product column (", board.columns.product, "):", item.column_values.find((c: any) => c.id === board.columns.product)?.text);
  console.log("Platform column (", board.columns.platform, "):", item.column_values.find((c: any) => c.id === board.columns.platform)?.text);

  const path = board.buildPath(item, config.dropbox_root);
  console.log("\n---- FINAL PATH ----");
  console.log(path);
}

main().catch(console.error);
