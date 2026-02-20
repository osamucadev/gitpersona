import { z } from "zod";

export const profileSchema = z.object({
  label: z
    .string()
    .min(1, "Label is required")
    .max(20, "Label must be 20 characters or fewer")
    .regex(/^[A-Z0-9_\- ]+$/i, "Use letters, numbers, hyphens, or spaces"),
  gitName: z
    .string()
    .min(1, "Git name is required")
    .max(100, "Name too long"),
  gitEmail: z
    .string()
    .email("Must be a valid email address"),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
