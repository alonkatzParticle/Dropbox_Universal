import { Board } from "./web/lib/board";
import fs from "fs";
const config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
const boardConfig = config.boards["5093001619"];
const board = new Board("5093001619", boardConfig);
console.log(board.autoName);

// Mock a Monday item
const mockItem = {
    id: "123",
    name: "Original Task Title",
    column_values: [
        { id: board.columns.product, text: "Blurr Device" },
        { id: board.columns.department, text: "Paid Social" },
        // Intentionally leaving platform missing to test fallback "department"
    ]
};
const result = board.getAutoName(mockItem);
console.log("BUILT NAME:", result);
