/**
 * Robustly parses JSON from a string that might contain markdown code blocks or extra text.
 */
export const robustParseJSON = <T>(text: string): T | null => {
  try {
    // 1. Try finding JSON object or array structure using regex
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    
    if (jsonMatch) {
      // Clean up potential control characters within the matched JSON block
      const cleanMatch = jsonMatch[0].trim();
      return JSON.parse(cleanMatch) as T;
    }

    // 2. Fallback: Standard cleanup if regex fails (e.g. for simple non-nested structures)
    const cleanText = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
      
    return JSON.parse(cleanText) as T;
  } catch (e) {
    console.warn("JSON Parse Warning: First attempt failed, trying aggressive cleanup.", e);
    // 3. Last resort: sometimes models output "Here is the JSON: { ... }"
    try {
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
             return JSON.parse(text.substring(firstBrace, lastBrace + 1)) as T;
        }
        const firstBracket = text.indexOf('[');
        const lastBracket = text.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1) {
            return JSON.parse(text.substring(firstBracket, lastBracket + 1)) as T;
        }
    } catch (e2) {
        console.error("Failed to parse Gemini response:", e2);
    }
    return null;
  }
};

/**
 * Creates a function that limits the concurrency of async tasks.
 * Similar to p-limit.
 */
export const createConcurrencyLimiter = (concurrency: number) => {
  const queue: (() => Promise<any>)[] = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      const task = queue.shift();
      if (task) task();
    }
  };

  const run = async <T>(fn: () => Promise<T>): Promise<T> => {
    activeCount++;
    try {
      const result = await fn();
      next();
      return result;
    } catch (err) {
      next();
      throw err;
    }
  };

  const enqueue = <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const task = async () => {
        try {
          const result = await run(fn);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };

      if (activeCount < concurrency) {
        task();
      } else {
        queue.push(task);
      }
    });
  };

  return enqueue;
};
