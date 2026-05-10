"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { requireWritableAcademicYear, withAcademicYearParam } from "@/lib/academic-year";
import { resolveSchoolAppBaseUrl } from "@/lib/app-env";
import { sendTransactionalEmail } from "@/lib/mailer";
import { saveUploadedFile } from "@/lib/uploads";

const OPTION_VALUES = ["A", "B", "C", "D"] as const;
type OptionValue = (typeof OPTION_VALUES)[number];

type ParsedExamQuestion = {
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: OptionValue;
  marks: number;
  sortOrder: number;
};

const CreateExamSchema = z.object({
  classId: z.string().optional(),
  title: z.string().trim().min(2).max(160),
  instructions: z.string().trim().max(3000).optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  durationMinutes: z.coerce.number().int().min(5).max(300),
  questionsText: z.string().trim().optional(),
  academicYearId: z.string().optional()
});

const StartAttemptSchema = z.object({
  examId: z.string().min(1),
  studentId: z.string().min(1)
});

const SubmitAttemptSchema = z.object({
  attemptId: z.string().min(1),
  examId: z.string().min(1)
});

const SendExamReportSchema = z.object({
  attemptId: z.string().min(1),
  examId: z.string().min(1)
});

const UpdateExamQuestionPaperSchema = z.object({
  examId: z.string().min(1),
  academicYearId: z.string().optional()
});

const DeleteSchoolExamSchema = z.object({
  examId: z.string().min(1),
  academicYearId: z.string().optional()
});

type StoredAnswer = {
  questionId: string;
  selectedOption: OptionValue | null;
  correctOption: OptionValue;
  marks: number;
};

function normalizeFileExtension(name: string) {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex < 0) return "";
  return name
    .slice(dotIndex + 1)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseLocalDateTime(input: string, fieldLabel: string) {
  const value = input.trim();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldLabel} is invalid.`);
  }
  return parsed;
}

function appendQuery(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function splitEmailCsv(raw?: string | null) {
  return String(raw ?? "")
    .split(/[,\n;]+/)
    .map((item) => normalizeEmail(item))
    .filter((item) => item.length > 0 && isValidEmail(item));
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateTime(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function parseStoredAnswers(raw: string | null): Map<string, StoredAnswer> {
  if (!raw) return new Map();
  try {
    const parsed = JSON.parse(raw) as StoredAnswer[];
    return new Map(parsed.map((entry) => [entry.questionId, entry]));
  } catch {
    return new Map();
  }
}

function classLabel(name: string, section: string) {
  return section ? `${name}-${section}` : name;
}

async function getTeacherClassIds(schoolId: string, userId: string) {
  const rows = await db.teacherClassAssignment.findMany({
    where: { schoolId, userId },
    select: { classId: true }
  });
  return [...new Set(rows.map((row) => row.classId))];
}

function examsListHref(args: {
  academicYearId: string;
  status?: string;
  examId?: string;
}) {
  let href = withAcademicYearParam("/exams", args.academicYearId);
  if (args.status) href = appendQuery(href, "file", args.status);
  if (args.examId) href = appendQuery(href, "examId", args.examId);
  return href;
}

function parseQuestionLines(raw: string): ParsedExamQuestion[] {
  const input = raw.trim();
  if (!input) return [];

  const normalizeMarks = (value: string | number | undefined) => {
    const numeric = typeof value === "number" ? value : Number(value ?? 1);
    return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric * 100) / 100 : 1;
  };

  const parseCorrectOption = (value: string, blockLabel: string): OptionValue => {
    const normalized = value.toUpperCase().trim();
    if (OPTION_VALUES.includes(normalized as OptionValue)) {
      return normalized as OptionValue;
    }
    const tokenMatch = normalized.match(/\b([ABCD])\b/);
    if (tokenMatch && OPTION_VALUES.includes(tokenMatch[1] as OptionValue)) {
      return tokenMatch[1] as OptionValue;
    }
    throw new Error(`${blockLabel} must set correct option as A/B/C/D.`);
  };

  const parsePipeLine = (line: string, index: number): ParsedExamQuestion => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 6) {
      throw new Error(`Question ${index + 1} is invalid. Use: Question | A | B | C | D | Correct | Optional marks`);
    }
    const prompt = parts[0]?.slice(0, 600) ?? "";
    const optionA = parts[1]?.slice(0, 300) ?? "";
    const optionB = parts[2]?.slice(0, 300) ?? "";
    const optionC = parts[3]?.slice(0, 300) ?? "";
    const optionD = parts[4]?.slice(0, 300) ?? "";
    const correctOption = parseCorrectOption(parts[5] ?? "", `Question ${index + 1}`);
    const marks = normalizeMarks(parts[6]);

    if (!prompt || !optionA || !optionB || !optionC || !optionD) {
      throw new Error(`Question ${index + 1} has empty prompt/options.`);
    }

    return {
      prompt,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      marks,
      sortOrder: index + 1
    };
  };

  const parseStructuredBlock = (block: string, index: number): ParsedExamQuestion => {
    const lines = block
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    let prompt = "";
    const options: Partial<Record<OptionValue, string>> = {};
    let correctRaw = "";
    let marks = 1;

    for (const line of lines) {
      const questionMatch = line.match(/^(?:q(?:uestion)?\s*\d*[\).:\-]?\s*)(.+)$/i);
      if (questionMatch) {
        prompt = questionMatch[1]?.trim() ?? prompt;
        continue;
      }

      const optionMatch =
        line.match(/^option\s*([ABCD])\s*[:)\-\.]\s*(.+)$/i) ??
        line.match(/^([ABCD])\s*[:)\-\.]\s*(.+)$/i);
      if (optionMatch) {
        options[optionMatch[1].toUpperCase() as OptionValue] = optionMatch[2]?.trim() ?? "";
        continue;
      }

      const answerMatch = line.match(/^(?:answer|correct(?:\s*option)?|ans)\s*[:\-]\s*(.+)$/i);
      if (answerMatch) {
        correctRaw = answerMatch[1]?.trim() ?? "";
        continue;
      }

      const marksMatch = line.match(/^marks?\s*[:\-]\s*([0-9]+(?:\.[0-9]+)?)$/i);
      if (marksMatch) {
        marks = normalizeMarks(marksMatch[1]);
        continue;
      }

      if (!prompt) {
        prompt = line.replace(/^\d+[\).:\-]\s*/, "").trim();
      } else {
        prompt = `${prompt} ${line}`.trim();
      }
    }

    const blockLabel = `Question ${index + 1}`;
    const optionA = (options.A ?? "").slice(0, 300);
    const optionB = (options.B ?? "").slice(0, 300);
    const optionC = (options.C ?? "").slice(0, 300);
    const optionD = (options.D ?? "").slice(0, 300);
    if (!prompt || !optionA || !optionB || !optionC || !optionD) {
      throw new Error(`${blockLabel} is incomplete. Include question text and options A/B/C/D.`);
    }
    const correctOption = parseCorrectOption(correctRaw, blockLabel);

    return {
      prompt: prompt.slice(0, 600),
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      marks,
      sortOrder: index + 1
    };
  };

  const allNonEmptyLines = input
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const isPipeOnly = allNonEmptyLines.length > 0 && allNonEmptyLines.every((line) => line.includes("|"));
  if (isPipeOnly) {
    return allNonEmptyLines.map((line, index) => parsePipeLine(line, index));
  }

  let blocks = input
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 1) {
    const questionMarkerSplit = input
      .split(/\n(?=\s*q(?:uestion)?\s*\d*[\).:\-])/i)
      .map((block) => block.trim())
      .filter(Boolean);
    if (questionMarkerSplit.length > 1) {
      blocks = questionMarkerSplit;
    }
  }

  return blocks.map((block, index) => {
    if (!block.includes("\n") && block.includes("|")) {
      return parsePipeLine(block, index);
    }
    return parseStructuredBlock(block, index);
  });
}

function parseInlineMcqSequence(raw: string): ParsedExamQuestion[] {
  const text = raw.replace(/\r/g, "\n").replace(/\n+/g, " ");
  const pattern =
    /(?:q(?:uestion)?\s*\d*[\).:\-]?\s*)(.+?)\s+A[\).:\-]\s*(.+?)\s+B[\).:\-]\s*(.+?)\s+C[\).:\-]\s*(.+?)\s+D[\).:\-]\s*(.+?)\s+(?:answer|ans|correct(?:\s*option)?)\s*[:\-]\s*([ABCD])(?:\s+marks?\s*[:\-]\s*([0-9]+(?:\.[0-9]+)?))?/gis;

  const questions: ParsedExamQuestion[] = [];
  let match: RegExpExecArray | null = pattern.exec(text);
  while (match) {
    const prompt = (match[1] ?? "").trim().slice(0, 600);
    const optionA = (match[2] ?? "").trim().slice(0, 300);
    const optionB = (match[3] ?? "").trim().slice(0, 300);
    const optionC = (match[4] ?? "").trim().slice(0, 300);
    const optionD = (match[5] ?? "").trim().slice(0, 300);
    const correct = ((match[6] ?? "").trim().toUpperCase()) as OptionValue;
    const marksRaw = Number(match[7] ?? "1");
    const marks = Number.isFinite(marksRaw) && marksRaw > 0 ? Math.round(marksRaw * 100) / 100 : 1;

    if (
      prompt &&
      optionA &&
      optionB &&
      optionC &&
      optionD &&
      OPTION_VALUES.includes(correct)
    ) {
      questions.push({
        prompt,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption: correct,
        marks,
        sortOrder: questions.length + 1
      });
    }

    match = pattern.exec(text);
  }

  return questions;
}

async function extractQuestionTextFromFile(file: File): Promise<string> {
  const ext = normalizeFileExtension(file.name);
  const mime = (file.type || "").toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());

  if (mime.startsWith("text/") || ["txt", "csv", "md", "json"].includes(ext)) {
    return bytes.toString("utf8");
  }

  if (mime === "application/pdf" || ext === "pdf") {
    try {
      const pdfModule = await import("pdf-parse");
      const parser = (pdfModule as unknown as { default?: (dataBuffer: Buffer) => Promise<{ text?: string }> }).default;
      if (!parser) return "";
      const parsed = await parser(bytes);
      return String(parsed.text ?? "");
    } catch (error) {
      console.warn("PDF auto-conversion unavailable in current runtime.", error);
      return "";
    }
  }

  return "";
}

function attemptHref(examId: string, attemptId: string, academicYearId: string, submitted = false) {
  const path = submitted
    ? `/exams/${examId}/attempt/${attemptId}?submitted=1`
    : `/exams/${examId}/attempt/${attemptId}`;
  return withAcademicYearParam(path, academicYearId);
}

export async function createSchoolExamAction(formData: FormData) {
  const { session } = await requirePermission("EXAMS", "EDIT");

  const parsed = CreateExamSchema.safeParse({
    classId: String(formData.get("classId") ?? "").trim() || undefined,
    title: formData.get("title"),
    instructions: String(formData.get("instructions") ?? "").trim() || undefined,
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    durationMinutes: formData.get("durationMinutes"),
    questionsText: String(formData.get("questionsText") ?? "").trim() || undefined,
    academicYearId: String(formData.get("academicYearId") ?? "").trim() || undefined
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Unable to process exam creation request.");
  }

  const year = await requireWritableAcademicYear({
    schoolId: session.schoolId,
    requestedYearId: parsed.data.academicYearId
  });

  const startsAt = parseLocalDateTime(parsed.data.startsAt, "Exam start date");
  const endsAt = parseLocalDateTime(parsed.data.endsAt, "Exam end date");
  if (endsAt <= startsAt) {
    throw new Error("Exam end date/time should be after start date/time.");
  }

  const classId = parsed.data.classId ?? null;
  if (classId) {
    const cls = await db.class.findFirst({ where: { id: classId, schoolId: session.schoolId }, select: { id: true } });
    if (!cls) throw new Error("Selected class is invalid.");
  }

  if (session.roleKey === "TEACHER" || session.roleKey === "CLASS_TEACHER") {
    const teacherClassIds = await getTeacherClassIds(session.schoolId, session.userId);
    if (!classId) throw new Error("Teachers must assign the exam to one class.");
    if (!teacherClassIds.includes(classId)) {
      throw new Error("You can only create exams for your assigned classes.");
    }
  }

  const questionPaper = formData.get("questionPaper");
  let questionPaperUrl: string | undefined;
  const hasQuestionPaper = questionPaper instanceof File && questionPaper.size > 0;
  if (questionPaper instanceof File && questionPaper.size > 0) {
    const saved = await saveUploadedFile({
      file: questionPaper,
      folder: `schools/${session.schoolId}/exams/question-papers`,
      prefix: "exam-paper"
    });
    if (!saved.ok) throw new Error(saved.message);
    questionPaperUrl = saved.url;
  }

  const manualQuestions = parseQuestionLines(parsed.data.questionsText ?? "");
  if (manualQuestions.length === 0 && !hasQuestionPaper) {
    throw new Error("Add MCQ questions or upload a question file to publish exam.");
  }
  let extractedQuestions: ParsedExamQuestion[] = [];
  if (manualQuestions.length === 0 && questionPaper instanceof File && questionPaper.size > 0) {
    const extractedText = await extractQuestionTextFromFile(questionPaper);
    if (extractedText.trim()) {
      try {
        extractedQuestions = parseQuestionLines(extractedText);
      } catch {
        extractedQuestions = parseInlineMcqSequence(extractedText);
      }
      if (extractedQuestions.length === 0) {
        extractedQuestions = parseInlineMcqSequence(extractedText);
      }
    }

    if (extractedQuestions.length === 0) {
      // Keep creation flow stable across server runtimes where PDF parsing may be unavailable.
      redirect(withAcademicYearParam("/exams?compose=1&file=mcq_parse_failed", year.id));
    }
  }
  const questions = manualQuestions.length > 0 ? manualQuestions : extractedQuestions;

  const exam = await db.$transaction(async (tx) => {
    const created = await tx.schoolExam.create({
      data: {
        schoolId: session.schoolId,
        academicYearId: year.id,
        classId,
        title: parsed.data.title,
        instructions: parsed.data.instructions,
        startsAt,
        endsAt,
        durationMinutes: parsed.data.durationMinutes,
        questionPaperUrl,
        createdByUserId: session.userId,
        isPublished: true
      }
    });

    if (questions.length > 0) {
      await tx.schoolExamQuestion.createMany({
        data: questions.map((question) => ({
          schoolId: session.schoolId,
          examId: created.id,
          prompt: question.prompt,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          correctOption: question.correctOption,
          marks: question.marks,
          sortOrder: question.sortOrder
        }))
      });
    }

    return created;
  });

  redirect(withAcademicYearParam(`/exams?examId=${encodeURIComponent(exam.id)}`, year.id));
}

export async function startExamAttemptAction(formData: FormData) {
  const { session } = await requirePermission("EXAMS", "VIEW");

  const parsed = StartAttemptSchema.safeParse({
    examId: formData.get("examId"),
    studentId: formData.get("studentId")
  });
  if (!parsed.success) throw new Error("Unable to start exam.");

  const exam = await db.schoolExam.findFirst({
    where: {
      id: parsed.data.examId,
      schoolId: session.schoolId,
      isPublished: true
    },
    select: {
      id: true,
      classId: true,
      startsAt: true,
      endsAt: true,
      academicYearId: true
    }
  });
  if (!exam) throw new Error("Exam not found.");

  const now = new Date();
  if (now < exam.startsAt) throw new Error("Exam is not open yet.");
  if (now > exam.endsAt) throw new Error("Exam is already closed.");

  const student = await db.student.findFirst({
    where: {
      id: parsed.data.studentId,
      schoolId: session.schoolId,
      ...(session.roleKey === "PARENT" ? { parents: { some: { userId: session.userId } } } : {})
    },
    select: { id: true, classId: true }
  });
  if (!student) throw new Error("Student access not found for this exam.");
  if (exam.classId && student.classId !== exam.classId) {
    throw new Error("This exam is not assigned to the selected student class.");
  }

  let attempt = await db.schoolExamAttempt.findUnique({
    where: { examId_studentId: { examId: exam.id, studentId: student.id } },
    select: { id: true, status: true }
  });

  if (!attempt) {
    attempt = await db.schoolExamAttempt.create({
      data: {
        schoolId: session.schoolId,
        examId: exam.id,
        studentId: student.id,
        status: "IN_PROGRESS"
      },
      select: { id: true, status: true }
    });
  }

  redirect(attemptHref(exam.id, attempt.id, exam.academicYearId, attempt.status === "SUBMITTED"));
}

export async function submitExamAttemptAction(formData: FormData) {
  const { session } = await requirePermission("EXAMS", "VIEW");

  const parsed = SubmitAttemptSchema.safeParse({
    attemptId: formData.get("attemptId"),
    examId: formData.get("examId")
  });
  if (!parsed.success) throw new Error("Unable to submit exam.");

  const attempt = await db.schoolExamAttempt.findFirst({
    where: {
      id: parsed.data.attemptId,
      examId: parsed.data.examId,
      schoolId: session.schoolId,
      ...(session.roleKey === "PARENT" ? { student: { parents: { some: { userId: session.userId } } } } : {})
    },
    include: {
      exam: {
        select: {
          id: true,
          academicYearId: true,
          startsAt: true,
          endsAt: true,
          questions: {
            select: {
              id: true,
              correctOption: true,
              marks: true
            },
            orderBy: { sortOrder: "asc" }
          }
        }
      }
    }
  });
  if (!attempt) throw new Error("Exam attempt not found.");

  if (attempt.status === "SUBMITTED") {
    redirect(attemptHref(attempt.exam.id, attempt.id, attempt.exam.academicYearId, true));
  }

  const now = new Date();
  if (now < attempt.exam.startsAt) throw new Error("Exam is not open yet.");
  if (now > attempt.exam.endsAt) throw new Error("Exam submission window is closed.");

  let score = 0;
  let maxScore = 0;
  const answers: Array<{ questionId: string; selectedOption: OptionValue | null; correctOption: OptionValue; marks: number }> = [];

  for (const question of attempt.exam.questions) {
    const selectedRaw = String(formData.get(`q:${question.id}`) ?? "").toUpperCase();
    const selectedOption = OPTION_VALUES.includes(selectedRaw as OptionValue)
      ? (selectedRaw as OptionValue)
      : null;

    const marks = Number.isFinite(question.marks) && question.marks > 0 ? question.marks : 1;
    maxScore += marks;
    if (selectedOption && selectedOption === question.correctOption) {
      score += marks;
    }

    answers.push({
      questionId: question.id,
      selectedOption,
      correctOption: question.correctOption as OptionValue,
      marks
    });
  }

  await db.schoolExamAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "SUBMITTED",
      submittedAt: now,
      score: Math.round(score * 100) / 100,
      maxScore: Math.round(maxScore * 100) / 100,
      answersJson: JSON.stringify(answers)
    }
  });

  redirect(attemptHref(attempt.exam.id, attempt.id, attempt.exam.academicYearId, true));
}

export async function sendExamReportToParentsAction(formData: FormData) {
  const { session } = await requirePermission("EXAMS", "VIEW");

  const parsed = SendExamReportSchema.safeParse({
    attemptId: formData.get("attemptId"),
    examId: formData.get("examId")
  });
  if (!parsed.success) throw new Error("Unable to send exam report.");

  const attempt = await db.schoolExamAttempt.findFirst({
    where: {
      id: parsed.data.attemptId,
      examId: parsed.data.examId,
      schoolId: session.schoolId,
      ...(session.roleKey === "PARENT" ? { student: { parents: { some: { userId: session.userId } } } } : {})
    },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          studentId: true,
          parentEmails: true,
          class: { select: { name: true, section: true } },
          parents: {
            select: {
              userId: true,
              user: { select: { email: true } }
            }
          }
        }
      },
      exam: {
        select: {
          id: true,
          title: true,
          academicYearId: true,
          questions: {
            select: {
              id: true,
              prompt: true,
              correctOption: true,
              marks: true
            },
            orderBy: { sortOrder: "asc" }
          }
        }
      }
    }
  });
  if (!attempt) throw new Error("Exam attempt not found.");

  const baseAttemptHref = attemptHref(attempt.exam.id, attempt.id, attempt.exam.academicYearId, true);

  if (attempt.status !== "SUBMITTED") {
    redirect(appendQuery(baseAttemptHref, "report", "not_submitted"));
  }

  const recipientSet = new Set<string>();
  for (const link of attempt.student.parents) {
    const email = normalizeEmail(link.user.email);
    if (isValidEmail(email)) recipientSet.add(email);
  }
  for (const email of splitEmailCsv(attempt.student.parentEmails)) {
    recipientSet.add(email);
  }
  const recipients = Array.from(recipientSet);

  if (recipients.length === 0) {
    redirect(appendQuery(baseAttemptHref, "report", "no_parent_email"));
  }

  const answersByQuestionId = parseStoredAnswers(attempt.answersJson);
  const perQuestion = attempt.exam.questions.map((question, index) => {
    const answer = answersByQuestionId.get(question.id);
    const marks = Number.isFinite(question.marks) && question.marks > 0 ? question.marks : 1;
    const selected = answer?.selectedOption ?? null;
    const gained = selected && selected === question.correctOption ? marks : 0;
    return {
      number: index + 1,
      prompt: question.prompt,
      selected,
      correctOption: question.correctOption as OptionValue,
      gained,
      marks
    };
  });
  const answeredCount = perQuestion.filter((item) => item.selected).length;
  const correctCount = perQuestion.filter((item) => item.selected && item.selected === item.correctOption).length;
  const totalQuestions = perQuestion.length;
  const score = attempt.score ?? 0;
  const maxScore =
    attempt.maxScore ??
    perQuestion.reduce((sum, item) => sum + item.marks, 0);
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const className = attempt.student.class
    ? classLabel(attempt.student.class.name, attempt.student.class.section)
    : "No class";
  const attemptUrl = `${resolveSchoolAppBaseUrl()}${withAcademicYearParam(
    `/exams/${attempt.exam.id}/attempt/${attempt.id}`,
    attempt.exam.academicYearId
  )}`;

  const subject = `Exam Report | ${attempt.student.fullName} | ${attempt.exam.title}`;
  const text = [
    `Exam Report`,
    `Student: ${attempt.student.fullName} (${attempt.student.studentId})`,
    `Class: ${className}`,
    `Exam: ${attempt.exam.title}`,
    `Score: ${score} / ${maxScore} (${percentage.toFixed(1)}%)`,
    `Correct answers: ${correctCount} / ${totalQuestions}`,
    `Answered questions: ${answeredCount} / ${totalQuestions}`,
    `Submitted at: ${attempt.submittedAt ? formatDateTime(attempt.submittedAt) : "-"}`,
    "",
    `Open detailed report: ${attemptUrl}`,
    "",
    ...perQuestion.map(
      (item) =>
        `Q${item.number}: selected ${item.selected ?? "-"}, correct ${item.correctOption}, marks ${item.gained}/${item.marks}`
    )
  ].join("\n");

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.45;color:#0f172a;max-width:760px;margin:0 auto;">
    <h2 style="margin:0 0 10px;">Exam Report</h2>
    <table style="width:100%;border-collapse:collapse;margin:0 0 14px;">
      <tr><td style="padding:6px 0;color:#475569;">Student</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(attempt.student.fullName)} (${escapeHtml(attempt.student.studentId)})</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Class</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(className)}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Exam</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(attempt.exam.title)}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Score</td><td style="padding:6px 0;font-weight:700;">${escapeHtml(`${score} / ${maxScore} (${percentage.toFixed(1)}%)`)}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Correct</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(`${correctCount} / ${totalQuestions}`)}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Answered</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(`${answeredCount} / ${totalQuestions}`)}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Submitted</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(attempt.submittedAt ? formatDateTime(attempt.submittedAt) : "-")}</td></tr>
    </table>

    <p style="margin:0 0 12px;">
      <a href="${escapeHtml(attemptUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">
        Open Detailed Report
      </a>
    </p>

    <div style="overflow:auto;">
      <table style="width:100%;border-collapse:collapse;border:1px solid #dbe2ea;">
        <thead>
          <tr>
            <th style="padding:8px;border-bottom:1px solid #dbe2ea;background:#f8fafc;text-align:left;">Q#</th>
            <th style="padding:8px;border-bottom:1px solid #dbe2ea;background:#f8fafc;text-align:left;">Question</th>
            <th style="padding:8px;border-bottom:1px solid #dbe2ea;background:#f8fafc;text-align:left;">Selected</th>
            <th style="padding:8px;border-bottom:1px solid #dbe2ea;background:#f8fafc;text-align:left;">Correct</th>
            <th style="padding:8px;border-bottom:1px solid #dbe2ea;background:#f8fafc;text-align:left;">Marks</th>
          </tr>
        </thead>
        <tbody>
          ${perQuestion
            .map(
              (item) => `
            <tr>
              <td style="padding:8px;border-bottom:1px solid #eef2f7;">${item.number}</td>
              <td style="padding:8px;border-bottom:1px solid #eef2f7;">${escapeHtml(item.prompt)}</td>
              <td style="padding:8px;border-bottom:1px solid #eef2f7;">${escapeHtml(item.selected ?? "-")}</td>
              <td style="padding:8px;border-bottom:1px solid #eef2f7;">${escapeHtml(item.correctOption)}</td>
              <td style="padding:8px;border-bottom:1px solid #eef2f7;">${escapeHtml(`${item.gained}/${item.marks}`)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </div>`;

  const delivery = await Promise.all(
    recipients.map(async (to) => ({
      to,
      result: await sendTransactionalEmail({
        to,
        subject,
        text,
        html
      })
    }))
  );

  const sentCount = delivery.filter((item) => item.result.sent).length;
  const failCount = recipients.length - sentCount;

  if (sentCount > 0 && attempt.student.parents.length > 0) {
    await db.notification.createMany({
      data: attempt.student.parents.map((parent) => ({
        schoolId: session.schoolId,
        userId: parent.userId,
        title: `Exam report shared: ${attempt.exam.title}`,
        body: `${attempt.student.fullName} score ${score}/${maxScore}.\nLINK:${withAcademicYearParam(`/exams/${attempt.exam.id}/attempt/${attempt.id}`, attempt.exam.academicYearId)}`
      })),
      skipDuplicates: true
    });
  }

  await db.auditLog.create({
    data: {
      schoolId: session.schoolId,
      actorType: "SCHOOL_USER",
      actorId: session.userId,
      action: "EXAM_REPORT_EMAIL_SENT",
      entityType: "SchoolExamAttempt",
      entityId: attempt.id,
      metadataJson: JSON.stringify({
        examId: attempt.exam.id,
        studentId: attempt.student.id,
        recipients,
        sentCount,
        failCount
      })
    }
  });

  let nextHref = baseAttemptHref;
  if (sentCount === 0) nextHref = appendQuery(nextHref, "report", "failed");
  else if (failCount > 0) nextHref = appendQuery(nextHref, "report", "partial");
  else nextHref = appendQuery(nextHref, "report", "sent");
  nextHref = appendQuery(nextHref, "sent", String(sentCount));
  nextHref = appendQuery(nextHref, "total", String(recipients.length));

  redirect(nextHref);
}

export async function updateExamQuestionPaperAction(formData: FormData) {
  const { session } = await requirePermission("EXAMS", "EDIT");

  const parsed = UpdateExamQuestionPaperSchema.safeParse({
    examId: String(formData.get("examId") ?? "").trim(),
    academicYearId: String(formData.get("academicYearId") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to update question file.");

  const exam = await db.schoolExam.findFirst({
    where: {
      id: parsed.data.examId,
      schoolId: session.schoolId
    },
    select: {
      id: true,
      classId: true,
      academicYearId: true
    }
  });
  if (!exam) throw new Error("Exam not found.");

  await requireWritableAcademicYear({
    schoolId: session.schoolId,
    requestedYearId: exam.academicYearId
  });

  if (session.roleKey === "TEACHER" || session.roleKey === "CLASS_TEACHER") {
    const teacherClassIds = await getTeacherClassIds(session.schoolId, session.userId);
    if (!exam.classId || !teacherClassIds.includes(exam.classId)) {
      throw new Error("You can only modify question files for your assigned class exams.");
    }
  }

  const questionPaper = formData.get("questionPaper");
  if (!(questionPaper instanceof File) || questionPaper.size <= 0) {
    redirect(examsListHref({ academicYearId: exam.academicYearId, status: "no_file", examId: exam.id }));
  }

  const saved = await saveUploadedFile({
    file: questionPaper,
    folder: `schools/${session.schoolId}/exams/question-papers`,
    prefix: "exam-paper"
  });
  if (!saved.ok) {
    redirect(examsListHref({ academicYearId: exam.academicYearId, status: "upload_failed", examId: exam.id }));
  }

  await db.schoolExam.update({
    where: { id: exam.id },
    data: { questionPaperUrl: saved.url }
  });

  await db.auditLog.create({
    data: {
      schoolId: session.schoolId,
      actorType: "SCHOOL_USER",
      actorId: session.userId,
      action: "EXAM_QUESTION_FILE_UPDATED",
      entityType: "SchoolExam",
      entityId: exam.id
    }
  });

  redirect(examsListHref({ academicYearId: exam.academicYearId, status: "updated", examId: exam.id }));
}

export async function deleteSchoolExamAction(formData: FormData) {
  const { session } = await requirePermission("EXAMS", "EDIT");
  if (session.roleKey !== "ADMIN") {
    throw new Error("Only school admin can delete exams.");
  }

  const parsed = DeleteSchoolExamSchema.safeParse({
    examId: String(formData.get("examId") ?? "").trim(),
    academicYearId: String(formData.get("academicYearId") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to delete exam.");

  const exam = await db.schoolExam.findFirst({
    where: {
      id: parsed.data.examId,
      schoolId: session.schoolId
    },
    select: {
      id: true,
      academicYearId: true
    }
  });
  if (!exam) throw new Error("Exam not found.");

  await requireWritableAcademicYear({
    schoolId: session.schoolId,
    requestedYearId: exam.academicYearId
  });

  await db.schoolExam.delete({
    where: { id: exam.id }
  });

  await db.auditLog.create({
    data: {
      schoolId: session.schoolId,
      actorType: "SCHOOL_USER",
      actorId: session.userId,
      action: "SCHOOL_EXAM_DELETED",
      entityType: "SchoolExam",
      entityId: exam.id
    }
  });

  redirect(examsListHref({ academicYearId: exam.academicYearId, status: "deleted" }));
}
