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
  logoUrl: z.string().trim().url().max(1000).nullable().optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  bio: z.string().trim().max(200).default(""),
  role: z.string().trim().max(200).default(""),
  location: z.string().trim().max(200).default(""),
  skills: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
});
