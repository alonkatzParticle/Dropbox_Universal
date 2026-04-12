import { loadConfig } from "./web/lib/storage";
import { Board } from "./web/lib/board";
import { runQuery } from "./web/lib/monday-api";

async function main() {
  const config = await loadConfig();
  const boardId = "5093001619"; // Assuming Video Editors Board. Let's fetch both.
  
  const query = `query {
    boards(ids: [5093001619, 5093319147]) {
      id
      items_page(limit: 500) {
        items {
          id
          name
          created_at
          group { title }
          column_values { id text value }
        }
      }
    }
  }`;

  const res = await runQuery(query, {});
  const boardsData = (res as any).boards;

  for (const b of boardsData) {
    const boardConfig = (config as any).boards[b.id];
    if (!boardConfig) continue;
    const boardObj = new Board(b.id, boardConfig);
    
    const items = b.items_page.items;
    
    const targetNames = ["AI realistic images for review section", "UGC mashup Billo"];
    
    for (const item of items) {
      if (targetNames.some(t => item.name.toLowerCase().includes(t.toLowerCase()))) {
        console.log(`\n--- FOUND ITEM ---`);
        console.log(`ID: ${item.id}`);
        console.log(`Name: ${item.name}`);
        console.log(`Board: ${b.id}`);
        
        let product = "";
        let platform = "";
        let dept = "";
        for (const col of item.column_values) {
           if (col.id === boardConfig.columns.product) product = col.text;
           if (col.id === boardConfig.columns.platform) platform = col.text;
           if (col.id === boardConfig.columns.department) dept = col.text;
        }
        console.log(`Product: "${product}"`);
        console.log(`Platform: "${platform}"`);
        console.log(`Dept: "${dept}"`);
        
        const expected = boardObj.getAutoName(item);
        console.log(`EXPECTED AUTO NAME: "${expected}"`);
      }
    }
  }
}

main().catch(console.error);
