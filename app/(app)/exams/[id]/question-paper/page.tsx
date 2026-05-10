import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, SectionHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { withAcademicYearParam } from "@/lib/academic-year";
import { requirePermission } from "@/lib/require-permission";
import { requireSession } from "@/lib/require";

function classLabel(name: string, section: string) {
  return section ? `${name}-${section}` : name;
}

function detectPreviewKind(url: string): "pdf" | "image" | "text" | "other" {
  const lower = url.toLowerCase();
  if (lower.startsWith("data:application/pdf")) return "pdf";
  if (lower.startsWith("data:image/")) return "image";
  if (lower.startsWith("data:text/")) return "text";

  const pathname = lower.split("?")[0] ?? lower;
  if (pathname.endsWith(".pdf")) return "pdf";
  if (/\.(png|jpg|jpeg|webp|gif|bmp|heic|heif|svg)$/.test(pathname)) return "image";
  if (/\.(txt|csv|rtf|md|json)$/i.test(pathname)) return "text";
  return "other";
}

function fileNameFromUrl(url: string) {
  const clean = (url.split("?")[0] ?? "").trim();
  if (!clean) return "question-file";
  const segments = clean.split("/");
  return segments[segments.length - 1] || "question-file";
}

async function readLocalTextPreview(url: string): Promise<string | null> {
  if (!url.startsWith("/uploads/")) return null;
  const relativePath = decodeURIComponent(url.replace(/^\/uploads\//, "").split("?")[0] ?? "");
  const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
  const resolvedPath = path.resolve(uploadsRoot, relativePath);
  if (!resolvedPath.startsWith(uploadsRoot + path.sep)) return null;

  try {
    const content = await readFile(resolvedPath, "utf8");
    return content.slice(0, 18000);
  } catch {
    return null;
  }
}

export default async function ExamQuestionPaperPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ay?: string }>;
}) {
  await requirePermission("EXAMS", "VIEW");
  const session = await requireSession();
  if (session.roleKey === "PARENT") return notFound();
  const { id } = await params;
  const { ay } = await searchParams;

  const exam = await db.schoolExam.findFirst({
    where: {
      id,
      schoolId: session.schoolId
    },
    select: {
      id: true,
      title: true,
      questionPaperUrl: true,
      class: { select: { name: true, section: true } },
      startsAt: true,
      endsAt: true,
      academicYearId: true
    }
  });
  if (!exam) return notFound();

  const questionPaperUrl = exam.questionPaperUrl;
  const previewKind = questionPaperUrl ? detectPreviewKind(questionPaperUrl) : "other";
  const textPreview = questionPaperUrl && previewKind === "text" ? await readLocalTextPreview(questionPaperUrl) : null;

  return (
    <div className="space-y-5 animate-fade-up">
      <Link
        href={withAcademicYearParam("/exams", ay ?? exam.academicYearId)}
        className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white/80 transition-colors"
      >
        ← Back to exams
      </Link>

      <Card accent="teal">
        <SectionHeader
          title={`${exam.title} · Question File Preview`}
          subtitle={`${exam.class ? classLabel(exam.class.name, exam.class.section) : "All classes"} · Starts ${exam.startsAt.toLocaleString("en-US")} · Ends ${exam.endsAt.toLocaleString("en-US")}`}
        />

        {!questionPaperUrl ? (
          <div className="rounded-[12px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            No question file uploaded for this exam.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">File: {fileNameFromUrl(questionPaperUrl)}</Badge>
              <a
                href={questionPaperUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-[10px] border border-sky-400/30 bg-sky-500/[0.12] px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/[0.2]"
              >
                Open Original File ↗
              </a>
            </div>

            {previewKind === "pdf" ? (
              <iframe
                src={questionPaperUrl}
                title="Question Paper Preview"
                className="h-[72vh] min-h-[420px] w-full rounded-[14px] border border-white/[0.08] bg-[#0f1728]/70"
              />
            ) : null}

            {previewKind === "image" ? (
              <div className="rounded-[14px] border border-white/[0.08] bg-black/20 p-2">
                <img
                  src={questionPaperUrl}
                  alt="Question file preview"
                  className="max-h-[72vh] w-full rounded-[10px] object-contain"
                />
              </div>
            ) : null}

            {previewKind === "text" ? (
              <div className="rounded-[14px] border border-white/[0.08] bg-black/20 p-3">
                {textPreview ? (
                  <pre className="max-h-[72vh] overflow-auto whitespace-pre-wrap text-xs text-white/80">{textPreview}</pre>
                ) : (
                  <iframe
                    src={questionPaperUrl}
                    title="Question Text Preview"
                    className="h-[72vh] min-h-[420px] w-full rounded-[10px] border border-white/[0.08] bg-[#0f1728]/70"
                  />
                )}
              </div>
            ) : null}

            {previewKind === "other" ? (
              <div className="rounded-[12px] border border-blue-500/28 bg-blue-500/[0.1] px-4 py-3 text-sm text-blue-100">
                Inline preview is not supported for this file type yet. Use <span className="font-semibold">Open Original File</span>.
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
