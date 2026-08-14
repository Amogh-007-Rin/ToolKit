import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(128),
});

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const collectionCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(""),
});

export const collectionUpdateSchema = collectionCreateSchema;

export const toolCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  link: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(64).default("sparkles"),
  logoUrl: z
    .string()
    .trim()
    .url()
    .max(1000)
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    }, "Logo URL must use HTTP or HTTPS")
    .nullable()
    .optional(),
});

export const postCreateSchema = z.object({
  caption: z.string().trim().max(2200).default(""),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
});

export const commentCreateSchema = z.object({
  content: z.string().trim().min(1).max(500),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  bio: z.string().trim().max(200).default(""),
  role: z.string().trim().max(200).default(""),
  location: z.string().trim().max(200).default(""),
  skills: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  tag: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, "Tag can only contain letters, numbers, hyphens, and underscores")
    .optional()
    .nullable(),
});
