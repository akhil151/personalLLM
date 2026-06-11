
import { ZodSchema } from 'zod';

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  recovered: boolean;
  rawContent: string;
}

const COMMON_TYPO_FIXES: Record<string, string> = {
  'ttitle': 'title',
  'desscription': 'description',
  'descritption': 'description',
  'descption': 'description',
  'estiamted_effort': 'estimated_effort',
  'estimated-effort': 'estimated_effort',
  'priority_score': 'priority',
  'milestones_list': 'milestones',
  'task_list': 'tasks',
  'tasklist': 'tasks',
  'goal_summary': 'goal_summary'
};

function fixPriorityValue(value: any): string {
  if (typeof value !== 'string') return 'medium';
  const lowerValue = value.toLowerCase().trim();
  if (['low', 'medium', 'high'].includes(lowerValue)) return lowerValue;
  if (['critical', 'urgent', 'very high', 'extreme'].includes(lowerValue)) return 'high';
  if (['minor', 'trivial', 'very low'].includes(lowerValue)) return 'low';
  return 'medium';
}

function applyTypoFixes(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => applyTypoFixes(item));
  }
  if (typeof obj === 'object') {
    const repaired: any = {};
    const expectedKeys = ['title', 'description', 'priority', 'order_index', 'estimated_effort', 'target_date', 'tasks', 'milestones', 'goal_summary', 'progress_percentage', 'active_projects_count', 'completed_milestones_summary', 'blocked_items', 'highest_priority', 'priority_reason', 'next_recommended_action', 'current_focus', 'highest_priority_action', 'tool', 'args', 'reasoning'];
    
    for (const [key, value] of Object.entries(obj)) {
      let fixedKey = key.trim();
      let handled = false;
      
      // 1. Check for exact typo match
      if (COMMON_TYPO_FIXES[fixedKey]) {
        fixedKey = COMMON_TYPO_FIXES[fixedKey];
        console.log("[JSON_REPAIR]", JSON.stringify(key), "->", JSON.stringify(fixedKey));
      } else {
          // 2. Check for extra leading/trailing characters (e.g., ttitle → title)
          let foundTypo = false;
          for (const [typo, correct] of Object.entries(COMMON_TYPO_FIXES)) {
            if (key.length === correct.length + 1) {
              if (key.startsWith(correct[0]) && key.slice(1) === correct) {
                fixedKey = correct;
                console.log("[JSON_REPAIR]", JSON.stringify(key), "->", JSON.stringify(fixedKey));
                foundTypo = true;
                break;
              }
              if (key.endsWith(correct[correct.length - 1]) && key.slice(0, -1) === correct) {
                fixedKey = correct;
                console.log("[JSON_REPAIR]", JSON.stringify(key), "->", JSON.stringify(fixedKey));
                foundTypo = true;
                break;
              }
            }
          }
          // 3. If key is not expected and value is a string (longer than 2 chars), treat it as title if no title exists
          if (!foundTypo && !expectedKeys.includes(fixedKey)) {
            if (typeof value === 'string' && value.trim().length > 2) {
              // Check if we don't already have a title in the original or repaired object
              const hasTitle = obj.title !== undefined || repaired.title !== undefined;
              if (!hasTitle) {
                repaired.title = value.trim();
                console.log("[JSON_REPAIR] Weird key with string value -> treated as title:", JSON.stringify(key));
                handled = true;
              }
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              // If value is an object, merge it into parent
              console.log("[JSON_REPAIR] Weird key with object value -> merging into parent");
              for (const [k, v] of Object.entries(value)) {
                repaired[k] = v;
              }
              handled = true;
            }
          }
      }
      
      if (!handled) {
        if (fixedKey === 'priority') {
          repaired[fixedKey] = fixPriorityValue(value);
        } else {
          repaired[fixedKey] = applyTypoFixes(value);
        }
      }
    }
    return repaired;
  }
  return obj;
}

function repairJsonObject(obj: any): any {
  console.log("[TRACE] JSON Repair Invoked");
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    const repairedArray = obj.map(item => repairJsonObject(item));
    // Filter out any non-object, non-array, null, or undefined elements
    // Also filter out useless objects and objects without title (for tasks/milestones)
    return repairedArray.filter(item => {
      // Filter out null, undefined, and non-object/non-array types
      if (item == null || (typeof item !== 'object' && !Array.isArray(item))) {
        console.log("[JSON_REPAIR] Filtering out invalid array element:", JSON.stringify(item));
        return false;
      }
      // Filter out useless objects
      if (typeof item === 'object' && !Array.isArray(item)) {
        const itemKeys = Object.keys(item);
        // If object only has one key and value is just punctuation/whitespace, filter it out
        if (itemKeys.length === 1) {
          const v = item[itemKeys[0]];
          if (typeof v === 'string' && v.trim().length < 3) {
            console.log("[JSON_REPAIR] Filtering out useless object:", JSON.stringify(item));
            return false;
          }
        }
      }
      return true;
    });
  }
  if (typeof obj === 'object') {
    const expectedKeys = ['title', 'description', 'priority', 'order_index', 'estimated_effort', 'target_date', 'tasks', 'milestones', 'goal_summary', 'progress_percentage', 'active_projects_count', 'completed_milestones_summary', 'blocked_items', 'highest_priority', 'priority_reason', 'next_recommended_action', 'current_focus', 'highest_priority_action', 'tool', 'args', 'reasoning'];
    
    // First, check if this object might be a task/goal/milestone with malformed title/description
    const keys = Object.keys(obj);
    // Case 1: Only one key (could be malformed title, or key/value swapped)
    if (keys.length === 1) {
      const [key, value] = Object.entries(obj)[0];
      // Check if value is a string that could be a title (not ", " or similar)
      if (typeof value === 'string' && value.trim().length > 2) {
        // Check if key is weird (empty string, single char, not in expected keys, etc.) - assume it's supposed to be title
        if (key.trim().length === 0 || key.length === 1 || key === '"' || !expectedKeys.includes(key.trim())) {
          const repaired = { title: value.trim() };
          console.log("[JSON_REPAIR] Malformed single key/value → { title:", JSON.stringify(value.trim()), "}");
          console.log("[TRACE] Repaired JSON", JSON.stringify(repaired, null, 2));
          return repaired;
        }
      }
    }
    // Also check for any object that has a weird key and a string/object value
    for (const [key, value] of Object.entries(obj)) {
      const trimmedKey = key.trim();
      if (!expectedKeys.includes(trimmedKey)) {
        if (typeof value === 'string' && value.trim().length > 2 && !obj.title) {
          const repaired: any = { title: value.trim() };
          console.log("[JSON_REPAIR] Weird key with string value → { title:", JSON.stringify(value.trim()), "}");
          // Copy over other properties
          for (const [k, v] of Object.entries(obj)) {
            if (k !== key) {
              repaired[k] = v;
            }
          }
          console.log("[TRACE] Repaired JSON", JSON.stringify(repaired, null, 2));
          // Recursively repair the new object
          return repairJsonObject(repaired);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // If the value is an object, merge it into the parent
          console.log("[JSON_REPAIR] Weird key with object value → merging into parent");
          const repaired: any = {};
          for (const [k, v] of Object.entries(obj)) {
            if (k !== key) {
              repaired[k] = v;
            }
          }
          for (const [k, v] of Object.entries(value)) {
            repaired[k] = v;
          }
          console.log("[TRACE] Repaired JSON", JSON.stringify(repaired, null, 2));
          return repairJsonObject(repaired);
        }
      }
    }
    
    // Apply typo fixes and recursively repair nested objects/arrays
    const repaired: any = {};
    for (const [key, value] of Object.entries(obj)) {
      let fixedKey = key.trim();
      if (COMMON_TYPO_FIXES[fixedKey]) {
        fixedKey = COMMON_TYPO_FIXES[fixedKey];
        console.log("[JSON_REPAIR]", JSON.stringify(key), "->", JSON.stringify(fixedKey));
      }
      if (fixedKey === 'priority') {
        repaired[fixedKey] = fixPriorityValue(value);
      } else {
        repaired[fixedKey] = repairJsonObject(value);
      }
    }
    console.log("[TRACE] Repaired JSON", JSON.stringify(repaired, null, 2));
    return repaired;
  }
  return obj;
}

/**
 * SafeJsonParser provides robust JSON extraction and validation.
 * It is designed to handle common LLM formatting errors and prevent crashes.
 */
export const safeJsonParser = {
  /**
   * Parses and validates JSON from LLM output with multiple recovery layers.
   */
  parse<T>(content: string, schema?: ZodSchema<T>): ParseResult<T> {
    console.log("[TRACE] Raw LLM Response", content);
    let sanitized = content.trim();
    let recovered = false;

    try {
      // 1. Attempt direct parse and apply typo fixes
      let parsed = JSON.parse(sanitized);
      console.log("[TRACE] Parsed JSON", JSON.stringify(parsed, null, 2));
      
      // Always apply typo fixes for consistency
      let withTypoFixes = applyTypoFixes(parsed);
      
      // Validate if schema provided
      if (schema) {
        console.log("[TRACE] Schema Validation Start");
        const validation = schema.safeParse(withTypoFixes);
        if (validation.success) {
          console.log("[TRACE] Schema Validation Success");
          return {
            success: true,
            data: validation.data,
            recovered: false,
            rawContent: content
          };
        } else {
          console.log("[TRACE] Schema Validation FAILED:", validation.error.message);
          // Try full repair and validating again
          let repaired = repairJsonObject(parsed);
          const repairValidation = schema.safeParse(repaired);
          if (repairValidation.success) {
            console.log("[TRACE] Schema Validation Success after repair");
            return {
              success: true,
              data: repairValidation.data,
              recovered: true,
              rawContent: content
            };
          }
        }
      } else {
        return {
          success: true,
          data: withTypoFixes,
          recovered: false,
          rawContent: content
        };
      }
    } catch (e) {
      console.log("[TRACE] First JSON.parse FAILED:", e);
      // Continue to recovery
    }

    // 2. RECOVERY: Markdown Stripping (Aggressive - find any block)
    if (sanitized.includes('```')) {
      const match = sanitized.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        sanitized = match[1].trim();
        recovered = true;
      }
    }

    // 3. RECOVERY: Find the most likely JSON object boundaries
    let firstBrace = sanitized.indexOf('{');
    let lastBrace = sanitized.lastIndexOf('}');
    console.log("[TRACE] Step3 firstBrace, lastBrace:", firstBrace, lastBrace);
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      let possibleJson = sanitized.substring(firstBrace, lastBrace + 1);
      console.log("[TRACE] Step3 initial possibleJson length:", possibleJson.length);
      
      let attempts = 0;
      let success = false;
      
      while (attempts < 10) {
        try {
          JSON.parse(possibleJson);
          sanitized = possibleJson;
          recovered = true;
          success = true;
          console.log("[TRACE] Step3 success on attempt", attempts);
          break;
        } catch (e) {
          console.log(`[TRACE] Step3 attempt ${attempts} failed, possibleJson len: ${possibleJson.length}`);
          if (possibleJson.startsWith('{{') && possibleJson.endsWith('}}')) {
            possibleJson = possibleJson.substring(1, possibleJson.length - 1).trim();
            recovered = true;
            attempts++;
            console.log(`[TRACE] Step3 trimmed {{}}: new possibleJson len: ${possibleJson.length}`);
            continue;
          }
          
          const nextLastBrace = possibleJson.lastIndexOf('}', possibleJson.length - 2);
          const nextFirstBrace = possibleJson.indexOf('{', 1);
          console.log(`[TRACE] Step3 nextLastBrace=${nextLastBrace}, nextFirstBrace=${nextFirstBrace}`);

          if (nextLastBrace !== -1 && (nextLastBrace > nextFirstBrace || nextFirstBrace === -1)) {
            possibleJson = possibleJson.substring(0, nextLastBrace + 1).trim();
            recovered = true;
            attempts++;
            console.log(`[TRACE] Step3 trimmed right: new possibleJson len: ${possibleJson.length}`);
            continue;
          }

          if (nextFirstBrace !== -1) {
            possibleJson = possibleJson.substring(nextFirstBrace).trim();
            recovered = true;
            attempts++;
            console.log(`[TRACE] Step3 trimmed left: new possibleJson len: ${possibleJson.length}`);
            continue;
          }

          break;
        }
      }
    }

    // 4. RECOVERY: Control Character Cleaning
    const cleaned = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, (match) => {
      if (match === '\n' || match === '\r' || match === '\t') return ' ';
      return '';
    });
    
    if (cleaned !== sanitized) {
      sanitized = cleaned;
      recovered = true;
    }

    try {
      const parsed = JSON.parse(sanitized);
      console.log("[TRACE] Parsed JSON (Recovery Path)", JSON.stringify(parsed, null, 2));
      const repaired = repairJsonObject(parsed);
      
      // 5. Schema Validation with repair
      if (schema) {
        console.log("[TRACE] Schema Validation Start (Recovery Path)");
        const validation = schema.safeParse(repaired);
        if (!validation.success) {
          console.log("[TRACE] Schema Validation FAILED (Recovery Path):", validation.error.message);
          return {
            success: false,
            error: `Schema validation failed after repair: ${validation.error.message}`,
            recovered,
            rawContent: content
          };
        }
        console.log("[TRACE] Schema Validation Success (Recovery Path)");
        return {
          success: true,
          data: validation.data,
          recovered: true,
          rawContent: content
        };
      }

      return {
        success: true,
        data: repaired,
        recovered: true,
        rawContent: content
      };

    } catch (finalError: any) {
      return {
        success: false,
        error: `JSON parse failed after all recovery: ${finalError.message}`,
        recovered,
        rawContent: content
      };
    }
  }
};

