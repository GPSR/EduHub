import { z } from "zod";

export const KnownSchoolRoleKeySchema = z.enum([
  "ADMIN",
  "HEAD_MASTER",
  "PRINCIPAL",
  "CLASS_TEACHER",
  "TEACHER",
  "PARENT",
  "BUS_ASSISTANT",
  "CORRESPONDENT"
]);

export const SchoolSessionClaimsSchema = z.object({
  userId: z.string(),
  schoolId: z.string(),
  roleId: z.string(),
  roleKey: z.string().min(1)
});

export const PlatformSessionClaimsSchema = z.object({
  platformUserId: z.string(),
  role: z.enum(["SUPER_ADMIN", "SUPPORT_USER"])
});

export type KnownSchoolRoleKey = z.infer<typeof KnownSchoolRoleKeySchema>;
export type SchoolSessionClaims = z.infer<typeof SchoolSessionClaimsSchema>;
export type PlatformSessionClaims = z.infer<typeof PlatformSessionClaimsSchema>;
