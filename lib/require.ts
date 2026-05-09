import { redirect } from "next/navigation";
import { queryFirst } from "@/lib/neon-db";
import { clearSessionCookie, getSession } from "@/lib/session";
import { resolveActiveSchoolSession } from "@/lib/auth-session";

type SchoolUser = {
  id: string;
  schoolId: string;
  schoolRoleId: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  phoneNumber: string | null;
  alternatePhoneNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  dateOfBirth: Date | string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  passwordHash: string;
  isActive: boolean;
  deactivatedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function dateOrNull(value: Date | string | null): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function dateOrNow(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export async function requireSession() {
  const session = await resolveActiveSchoolSession(await getSession());
  if (!session) {
    await clearSessionCookie();
    redirect("/login");
  }
  return session;
}

export async function requireUser() {
  const session = await requireSession();
  const userRow = await queryFirst<SchoolUser>(
    `SELECT
      "id",
      "schoolId",
      "schoolRoleId",
      "email",
      "name",
      "firstName",
      "lastName",
      "gender",
      "phoneNumber",
      "alternatePhoneNumber",
      "address",
      "city",
      "state",
      "country",
      "postalCode",
      "dateOfBirth",
      "emergencyContactName",
      "emergencyContactPhone",
      "notes",
      "passwordHash",
      "isActive",
      "deactivatedAt",
      "createdAt",
      "updatedAt"
     FROM "User"
     WHERE "id" = $1
     LIMIT 1`,
    [session.userId]
  );

  if (!userRow) redirect("/login");

  const user = {
    ...userRow,
    dateOfBirth: dateOrNull(userRow.dateOfBirth),
    deactivatedAt: dateOrNull(userRow.deactivatedAt),
    createdAt: dateOrNow(userRow.createdAt),
    updatedAt: dateOrNow(userRow.updatedAt)
  };

  if (!user.isActive) redirect("/login");
  return { session, user };
}
