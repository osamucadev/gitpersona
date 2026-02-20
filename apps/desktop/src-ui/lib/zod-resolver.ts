// Simple manual zod resolver since @hookform/resolvers may not be installed.
// Install @hookform/resolvers if you prefer the full package.
import type { FieldValues, Resolver, ResolverResult } from "react-hook-form";
import { z } from "zod";

export function zodResolver<T extends FieldValues>(
  schema: z.ZodSchema<T>,
): Resolver<T> {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data as T, errors: {} } as ResolverResult<T>;
    }
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      errors[path] = { type: "manual", message: issue.message };
    }
    return { values: {} as T, errors };
  };
}
