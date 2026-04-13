import { Board } from "./web/lib/board";
import fs from "fs";
const config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
const boardConfig = config.boards["5093001619"];
const board = new Board("5093001619", boardConfig);

// Try to parse values
const mockItem = {
    id: "123",
    name: "Original Task Title | old format",
    column_values: [
        { id: board.columns.product, text: "Blurr Device" },
        { id: board.columns.department, text: "Website" },
    ]
};
// Our rule 1 says "is exactly Website". If so it should use the default template. 
// Actually we only have the "default" rule which has empty conditions.
const result = board.getAutoName(mockItem);
console.log("BUILT NAME:", result);
