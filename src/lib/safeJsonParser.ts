
import { ZodSchema } from 'zod';

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  recovered: boolean;
  rawContent: string;
}

/**
 * SafeJsonParser provides robust JSON extraction and validation.
 * It is designed to handle common LLM formatting errors and prevent crashes.
 */
export const safeJsonParser = {
  /**
   * Parses and validates JSON from LLM output.
   */
  parse<T>(content: string, schema?: ZodSchema<T>): ParseResult<T> {
    let sanitized = content.trim();
    let recovered = false;

    try {
      // 1. Attempt direct parse
      return {
        success: true,
        data: JSON.parse(sanitized),
        recovered: false,
        rawContent: content
      };
    } catch (e) {
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
    // We look for the first '{' and the matching '}'
    let firstBrace = sanitized.indexOf('{');
    let lastBrace = sanitized.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      // Try to find the LARGEST valid JSON object within the bounds
      let possibleJson = sanitized.substring(firstBrace, lastBrace + 1);
      
      // If it still fails, try to shrink from the outside (for cases like {{...}})
      let attempts = 0;
      while (attempts < 5) {
        try {
          JSON.parse(possibleJson);
          sanitized = possibleJson;
          recovered = true;
          break;
        } catch (e) {
          // If parse fails, check if we have redundant outer braces
          if (possibleJson.startsWith('{{') && possibleJson.endsWith('}}')) {
            possibleJson = possibleJson.substring(1, possibleJson.length - 1);
            recovered = true;
            attempts++;
            continue;
          }
          
          // Or maybe there's junk outside the first/last matching pair
          // This is a bit risky but we can try to find the next { or previous }
          const nextFirst = possibleJson.indexOf('{', 1);
          const prevLast = possibleJson.lastIndexOf('}', possibleJson.length - 2);
          
          if (nextFirst !== -1 && prevLast !== -1 && prevLast > nextFirst) {
             possibleJson = possibleJson.substring(nextFirst, prevLast + 1);
             recovered = true;
             attempts++;
          } else {
            break;
          }
        }
      }
    }

    // 4. RECOVERY: Control Character Cleaning
    // LLMs often put literal newlines/tabs inside string values, which breaks JSON.parse.
    // We replace all actual control characters with spaces to ensure the JSON is valid,
    // even if it loses some formatting in the string values.
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
      
      // 5. Schema Validation
      if (schema) {
        const validation = schema.safeParse(parsed);
        if (!validation.success) {
          return {
            success: false,
            error: `Schema validation failed: ${validation.error.message}`,
            recovered,
            rawContent: content
          };
        }
        return {
          success: true,
          data: validation.data,
          recovered,
          rawContent: content
        };
      }

      return {
        success: true,
        data: parsed,
        recovered,
        rawContent: content
      };

    } catch (finalError: any) {
      return {
        success: false,
        error: `JSON parse failed after recovery: ${finalError.message}`,
        recovered,
        rawContent: content
      };
    }
  }
};
