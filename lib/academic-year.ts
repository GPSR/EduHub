import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { execute, queryFirst, queryRows } from "@/lib/neon-db";

export const ACADEMIC_YEAR_QUERY_PARAM = "ay";
export const ACADEMIC_YEAR_COOKIE = "eduhub_ay";

const DEFAULT_YEAR_START_MONTH = 5; // June (0-indexed)
const DEFAULT_YEAR_START_DAY = 1;

type AcademicYearStatus = "ACTIVE" | "CLOSED";

type AcademicYearLite = {
  id: string;
  schoolId: string;
  name: string;
  startsOn: Date;
  endsOn: Date;
  status: AcademicYearStatus;
  isActive: boolean;
};

type AcademicYearRow = {
  id: string;
  schoolId: string;
  name: string;
  startsOn: Date | string;
  endsOn: Date | string;
  status: AcademicYearStatus | string;
  isActive: boolean;
};

function normalizeId(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function mapAcademicYear(row: AcademicYearRow): AcademicYearLite {
  return {
    id: row.id,
    schoolId: row.schoolId,
    name: row.name,
    startsOn: parseDate(row.startsOn),
    endsOn: parseDate(row.endsOn),
    status: row.status === "CLOSED" ? "CLOSED" : "ACTIVE",
    isActive: Boolean(row.isActive)
  };
}

function deriveDefaultAcademicYearStartYear(referenceDate: Date) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  return month >= DEFAULT_YEAR_START_MONTH ? year : year - 1;
}

function buildAcademicYearDates(startYear: number) {
  const startsOn = new Date(startYear, DEFAULT_YEAR_START_MONTH, DEFAULT_YEAR_START_DAY, 0, 0, 0, 0);
  const endsOn = new Date(startYear + 1, DEFAULT_YEAR_START_MONTH, DEFAULT_YEAR_START_DAY, 0, 0, 0, 0);
  endsOn.setMilliseconds(endsOn.getMilliseconds() - 1);
  return { startsOn, endsOn };
}

function buildAcademicYearName(startYear: number) {
  return `${startYear}-${startYear + 1}`;
}

async function findAcademicYearByIdAndSchool(id: string, schoolId: string) {
  const row = await queryFirst<AcademicYearRow>(
    `SELECT "id", "schoolId", "name", "startsOn", "endsOn", "status", "isActive"
     FROM "AcademicYear"
     WHERE "id" = $1 AND "schoolId" = $2
     LIMIT 1`,
    [id, schoolId]
  );
  return row ? mapAcademicYear(row) : null;
}

async function findActiveAcademicYear(schoolId: string) {
  const row = await queryFirst<AcademicYearRow>(
    `SELECT "id", "schoolId", "name", "startsOn", "endsOn", "status", "isActive"
     FROM "AcademicYear"
     WHERE "schoolId" = $1 AND "isActive" = TRUE
     ORDER BY "startsOn" DESC, "createdAt" DESC
     LIMIT 1`,
    [schoolId]
  );
  return row ? mapAcademicYear(row) : null;
}

async function deactivateOtherYears(schoolId: string, keepYearId: string) {
  await execute(
    `UPDATE "AcademicYear"
     SET "isActive" = FALSE,
         "updatedAt" = NOW()
     WHERE "schoolId" = $1 AND "id" <> $2`,
    [schoolId, keepYearId]
  );
}

async function updateSchoolActiveAcademicYear(schoolId: string, academicYearId: string) {
  await execute(
    `UPDATE "School"
     SET "activeAcademicYearId" = $2,
         "updatedAt" = NOW()
     WHERE "id" = $1`,
    [schoolId, academicYearId]
  );
}

async function activateAcademicYearById(id: string) {
  const row = await queryFirst<AcademicYearRow>(
    `UPDATE "AcademicYear"
     SET "isActive" = TRUE,
         "status" = 'ACTIVE',
         "closedAt" = NULL,
         "closedByUserId" = NULL,
         "updatedAt" = NOW()
     WHERE "id" = $1
     RETURNING "id", "schoolId", "name", "startsOn", "endsOn", "status", "isActive"`,
    [id]
  );

  if (!row) {
    throw new Error("Academic year not found while activating.");
  }

  return mapAcademicYear(row);
}

async function createAcademicYear(args: {
  schoolId: string;
  name: string;
  startsOn: Date;
  endsOn: Date;
  isActive: boolean;
}) {
  const row = await queryFirst<AcademicYearRow>(
    `INSERT INTO "AcademicYear"
      ("id", "schoolId", "name", "startsOn", "endsOn", "status", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6, NOW(), NOW())
     RETURNING "id", "schoolId", "name", "startsOn", "endsOn", "status", "isActive"`,
    [randomUUID(), args.schoolId, args.name, args.startsOn, args.endsOn, args.isActive]
  );

  if (!row) {
    throw new Error("Failed to create academic year.");
  }

  return mapAcademicYear(row);
}

async function updateAcademicYearBasics(args: {
  id: string;
  startsOn: Date;
  endsOn: Date;
  isActive: boolean;
}) {
  const row = await queryFirst<AcademicYearRow>(
    `UPDATE "AcademicYear"
     SET "startsOn" = $2,
         "endsOn" = $3,
         "status" = 'ACTIVE',
         "isActive" = $4,
         "closedAt" = NULL,
         "closedByUserId" = NULL,
         "updatedAt" = NOW()
     WHERE "id" = $1
     RETURNING "id", "schoolId", "name", "startsOn", "endsOn", "status", "isActive"`,
    [args.id, args.startsOn, args.endsOn, args.isActive]
  );

  if (!row) {
    throw new Error("Failed to update academic year.");
  }

  return mapAcademicYear(row);
}

export function withAcademicYearParam(path: string, academicYearId?: string | null) {
  const normalizedYearId = normalizeId(academicYearId);
  if (!normalizedYearId) return path;

  const hashIndex = path.indexOf("#");
  const basePath = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const [pathname, queryString = ""] = basePath.split("?");
  const params = new URLSearchParams(queryString);
  params.set(ACADEMIC_YEAR_QUERY_PARAM, normalizedYearId);
  const nextQuery = params.toString();
  return `${pathname}${nextQuery ? `?${nextQuery}` : ""}${hash}`;
}

export async function ensureActiveAcademicYearForSchool(schoolId: string): Promise<AcademicYearLite> {
  const school = await queryFirst<{ activeAcademicYearId: string | null }>(
    `SELECT "activeAcademicYearId"
     FROM "School"
     WHERE "id" = $1
     LIMIT 1`,
    [schoolId]
  );

  if (!school) {
    throw new Error("School not found while resolving academic year.");
  }

  if (school.activeAcademicYearId) {
    const selected = await findAcademicYearByIdAndSchool(school.activeAcademicYearId, schoolId);
    if (selected) {
      if (!selected.isActive || selected.status !== "ACTIVE") {
        const updated = await activateAcademicYearById(selected.id);
        await deactivateOtherYears(schoolId, updated.id);
        return updated;
      }
      return selected;
    }
  }

  const existingActive = await findActiveAcademicYear(schoolId);

  if (existingActive) {
    await deactivateOtherYears(schoolId, existingActive.id);
    await updateSchoolActiveAcademicYear(schoolId, existingActive.id);

    if (existingActive.status !== "ACTIVE") {
      return activateAcademicYearById(existingActive.id);
    }

    return existingActive;
  }

  const startYear = deriveDefaultAcademicYearStartYear(new Date());
  const defaultName = buildAcademicYearName(startYear);
  const { startsOn, endsOn } = buildAcademicYearDates(startYear);

  const existingDefault = await queryFirst<AcademicYearRow>(
    `SELECT "id", "schoolId", "name", "startsOn", "endsOn", "status", "isActive"
     FROM "AcademicYear"
     WHERE "schoolId" = $1 AND "name" = $2
     LIMIT 1`,
    [schoolId, defaultName]
  );

  const activeYear = existingDefault
    ? await updateAcademicYearBasics({
        id: existingDefault.id,
        startsOn,
        endsOn,
        isActive: true
      })
    : await createAcademicYear({
        schoolId,
        name: defaultName,
        startsOn,
        endsOn,
        isActive: true
      });

  await deactivateOtherYears(schoolId, activeYear.id);
  await updateSchoolActiveAcademicYear(schoolId, activeYear.id);

  return activeYear;
}

export async function getAcademicYearContext(args: { schoolId: string; requestedYearId?: string | null }) {
  const activeYear = await ensureActiveAcademicYearForSchool(args.schoolId);

  const rows = await queryRows<AcademicYearRow>(
    `SELECT "id", "schoolId", "name", "startsOn", "endsOn", "status", "isActive"
     FROM "AcademicYear"
     WHERE "schoolId" = $1
     ORDER BY "startsOn" DESC, "createdAt" DESC`,
    [args.schoolId]
  );
  const years = rows.map(mapAcademicYear);

  const cookieStore = await cookies();
  const cookieYearId = normalizeId(cookieStore.get(ACADEMIC_YEAR_COOKIE)?.value ?? null);
  const selectedId = normalizeId(args.requestedYearId) ?? cookieYearId ?? activeYear.id;

  const selectedYear = years.find((year) => year.id === selectedId) ?? activeYear;

  return { activeYear, selectedYear, years };
}

export async function requireWritableAcademicYear(args: { schoolId: string; requestedYearId?: string | null }) {
  const context = await getAcademicYearContext(args);
  if (context.selectedYear.status === "CLOSED") {
    throw new Error(`Academic year ${context.selectedYear.name} is closed and read-only.`);
  }
  return context.selectedYear;
}
