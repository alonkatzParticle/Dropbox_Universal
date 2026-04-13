/**
 * lib/board.ts — Board configuration and Dropbox path building
 *
 * The Board class holds a Monday.com board's settings, department rules,
 * and all logic for constructing the Dropbox folder path for a given task.
 *
 * Depends on: lib/monday-client.ts (for getColumnValue)
 * Used by: lib/task.ts, lib/core.ts, lib/auto-creator.ts, lib/folder-mover.ts
 */

import { getColumnValue, MondayItem } from "./monday-client";

// Remove characters Dropbox doesn't allow in folder names
function sanitize(name: string): string {
  return name.replace(/[\\*?"<>]/g, "").trim();
}

/**
 * Compute the current date folder name using a running month index.
 * January 2026 = "01_January 2026", February 2026 = "02_February 2026", etc.
 */
export function getDateFolder(now: Date = new Date()): string {
  const baseYear = 2026, baseMonth = 1;
  const monthsElapsed = (now.getFullYear() - baseYear) * 12 + (now.getMonth() + 1 - baseMonth);
  const index = monthsElapsed + 1;
  const month = now.toLocaleString("en-US", { month: "long" });
  const year = now.getFullYear();
  return `${String(index).padStart(2, "0")}_${month} ${year}`;
}

export interface AutoNameSegment {
  field: string;
  fallback?: string;
  valueMap?: Record<string, string>;
  onlyValues?: string[];
  skipValues?: string[];
  onlyWhenField?: string;
  onlyWhenValue?: string;
}

export interface BoardConfig {
  name: string;
  media_type?: string;
  dropbox_link_column: string;
  status_column?: string;
  approved_label?: string;
  completed_labels?: string[];
  form_requests_group?: string;
  columns?: Record<string, string>;
  bundle_keywords?: string[];
  other_keywords?: string[];
  ignored_folder_keywords?: string[];
  fallback_values?: Record<string, string>;
  department_rules?: Record<string, DeptRule>;
  fixed_level_values?: Record<string, string>;
  autoName?: { segments: AutoNameSegment[] };
}

export interface DeptRule {
  dropbox_folder?: string;
  path_template?: string[];
  fixed_values?: Record<string, string>;
}

export class Board {
  boardId: string;
  name: string;
  mediaType: string;
  dropboxLinkColumn: string;
  statusColumn: string;
  approvedLabel: string;
  completedLabels: string[];
  formRequestsGroup: string;
  columns: Record<string, string>;
  bundleKeywords: string[];
  otherKeywords: string[];
  ignoredFolderKeywords: string[];
  fallback: Record<string, string>;
  departmentRules: Record<string, DeptRule>;
  fixedLevelValues: Record<string, string>;
  autoName?: { segments: AutoNameSegment[] };

  constructor(boardId: string, config: BoardConfig) {
    this.boardId = boardId;
    this.name = config.name ?? "Unknown Board";
    this.mediaType = config.media_type ?? "";
    this.dropboxLinkColumn = config.dropbox_link_column ?? "";
    this.statusColumn = config.status_column ?? "status";
    this.approvedLabel = (config.approved_label ?? "Approved").toLowerCase();
    this.completedLabels = (config.completed_labels ?? ["Done"]).map((l) => l.toLowerCase());
    this.formRequestsGroup = (config.form_requests_group ?? "Form Requests").toLowerCase();
    this.columns = config.columns ?? {};
    this.bundleKeywords = config.bundle_keywords ?? [];
    this.otherKeywords = config.other_keywords ?? [];
    this.ignoredFolderKeywords = config.ignored_folder_keywords ?? [];
    this.fallback = config.fallback_values ?? {};
    this.departmentRules = config.department_rules ?? {};
    this.fixedLevelValues = config.fixed_level_values ?? {};
    this.autoName = config.autoName;
  }

  /** Determine category (Products / Bundles / Other) from a product name. */
  getCategory(product: string): string {
    if (this.otherKeywords.some((kw) => product.toLowerCase() === kw.toLowerCase())) return "Other";
    if (this.bundleKeywords.some((kw) => product.toLowerCase().includes(kw.toLowerCase()))) return "Bundles";
    return "Products";
  }

  /** Get the department rule for a department label, or a default fallback rule. */
  getDepartmentRule(dept: string): DeptRule {
    if (this.departmentRules[dept]) return this.departmentRules[dept];
    const key = Object.keys(this.departmentRules).find((k) => k.toLowerCase() === dept.toLowerCase());
    if (key) return this.departmentRules[key];
    return {
      dropbox_folder: undefined,
      path_template: ["dept_folder", "category", "product", "media_type", "platform", "date", "task_name"],
    };
  }

  /** True if the department has no matching rule (needs manual path choice). */
  isAmbiguous(dept: string): boolean {
    if (this.departmentRules[dept]) return false;
    return !Object.keys(this.departmentRules).some((k) => k.toLowerCase() === dept.toLowerCase());
  }

  /** Resolve one path segment to its string value for a given item. */
  resolveSegment(segment: string, item: MondayItem, rule: DeptRule, productRaw: string, deptRaw: string): string {
    if (segment === "dept_folder") return rule.dropbox_folder ? sanitize(rule.dropbox_folder) : sanitize(deptRaw);
    if (segment === "category") return this.getCategory(productRaw);
    if (segment === "media_type") return this.mediaType;
    if (segment === "date") return getDateFolder();
    if (segment === "task_name") {
      let baseName = item.name ?? "Untitled Task";
      if (baseName.includes(" | ")) baseName = baseName.split(" | ").pop()!;
      return sanitize(baseName);
    }
    const fixed = rule.fixed_values?.[segment];
    if (fixed) return sanitize(fixed);
    const boardFixed = this.fixedLevelValues[segment];
    if (boardFixed) return sanitize(boardFixed);
    const colId = this.columns[segment] ?? "";
    if (!colId) return this.fallback[segment] ?? "";
    const raw = getColumnValue(item, colId) || (this.fallback[segment] ?? "");
    
    // Explicit exclusions mapping (returns empty string to omit from hierarchy)
    if (this.ignoredFolderKeywords.some(kw => raw.toLowerCase() === kw.toLowerCase())) {
        return "";
    }
    
    if (segment === "department" && rule.dropbox_folder) return sanitize(rule.dropbox_folder);
    return sanitize(raw);
  }

  /** Build the full Dropbox path for a task item. */
  buildPath(item: MondayItem, dropboxRoot: string): string {
    const deptRaw = getColumnValue(item, this.columns.department ?? "") || (this.fallback.department ?? "Unknown Dept");
    const productRaw = getColumnValue(item, this.columns.product ?? "") || (this.fallback.product ?? "Unknown Product");
    const rule = this.getDepartmentRule(deptRaw);
    const template = rule.path_template ?? [];
    const parts = [dropboxRoot];
    for (const seg of template) {
      const val = this.resolveSegment(seg, item, rule, productRaw, deptRaw);
      if (val) parts.push(val);
    }
    return parts.join("/");
  }

  /** Calculate the physical expected task name based on autoName rules for Monday.com */
  getAutoName(item: MondayItem): string | null {
    if (!this.autoName || !this.autoName.segments || this.autoName.segments.length === 0) return null;

    let baseName = item.name ?? "Untitled Task";
    
    // Skip if there is at least one vertical divider
    if ((baseName.match(/\|/g) || []).length >= 1) return null;

    const built = this.autoName.segments
      .map((seg) => {
        let val = "";
        if (seg.field === "taskName") {
          val = baseName;
        } else {
          const colId = this.columns[seg.field] ?? "";
          val = getColumnValue(item, colId) || (this.fallback[seg.field] ?? "");
        }

        // Specifically treat "Other" as an empty string natively so it naturally triggers fallbacks!
        if (val.toLowerCase() === "other") {
          val = "";
        }

        if (!val && seg.fallback) {
          if (seg.fallback === "taskName") val = baseName;
          else {
            const fallbackColId = this.columns[seg.fallback] ?? "";
            val = getColumnValue(item, fallbackColId) || (this.fallback[seg.fallback] ?? "");
          }
        }
        if (!val) return null;

        if (seg.onlyWhenField) {
          const condColId = this.columns[seg.onlyWhenField] ?? "";
          const condVal = getColumnValue(item, condColId) || (this.fallback[seg.onlyWhenField] ?? "");
          if (condVal !== seg.onlyWhenValue) return null;
        }

        if (seg.onlyValues && !seg.onlyValues.includes(val)) return null;
        if (seg.skipValues && seg.skipValues.includes(val)) return null;
        if (seg.valueMap && seg.valueMap[val]) val = seg.valueMap[val];

        return val;
      })
      .filter(Boolean)
      .join(" | ");

    return built;
  }
}

