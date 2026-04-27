import { createHash } from "node:crypto";
import { z } from "zod";
import type { Session } from "@/lib/session";
import type { PlatformSession } from "@/lib/platform-session";
import { signScopedToken, verifyScopedToken } from "@/lib/auth-token";

const SchoolBiometricClaimsSchema = z.object({
  kind: z.literal("SCHOOL_BIOMETRIC_LOGIN"),
  userId: z.string(),
  schoolId: z.string(),
  roleId: z.string(),
  roleKey: z.string(),
  passwordHashFingerprint: z.string().min(16),
});

const PlatformBiometricClaimsSchema = z.object({
  kind: z.literal("PLATFORM_BIOMETRIC_LOGIN"),
  platformUserId: z.string(),
  role: z.enum(["SUPER_ADMIN", "SUPPORT_USER"]),
  passwordHashFingerprint: z.string().min(16),
});

function passwordHashFingerprint(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("hex");
}

export function isPasswordHashFingerprintMatch(passwordHash: string, fingerprint: string): boolean {
  return passwordHashFingerprint(passwordHash) === fingerprint;
}

export async function issueSchoolBiometricToken(args: {
  session: Session;
  passwordHash: string;
}): Promise<string> {
  return signScopedToken(
    "school",
    {
      kind: "SCHOOL_BIOMETRIC_LOGIN",
      userId: args.session.userId,
      schoolId: args.session.schoolId,
      roleId: args.session.roleId,
      roleKey: args.session.roleKey,
      passwordHashFingerprint: passwordHashFingerprint(args.passwordHash),
    },
    args.session.userId
  );
}

export async function verifySchoolBiometricToken(token: string) {
  return verifyScopedToken("school", token, SchoolBiometricClaimsSchema);
}

export async function issuePlatformBiometricToken(args: {
  session: PlatformSession;
  passwordHash: string;
}): Promise<string> {
  return signScopedToken(
    "platform",
    {
      kind: "PLATFORM_BIOMETRIC_LOGIN",
      platformUserId: args.session.platformUserId,
      role: args.session.role,
      passwordHashFingerprint: passwordHashFingerprint(args.passwordHash),
    },
    args.session.platformUserId
  );
}

export async function verifyPlatformBiometricToken(token: string) {
  return verifyScopedToken("platform", token, PlatformBiometricClaimsSchema);
}
