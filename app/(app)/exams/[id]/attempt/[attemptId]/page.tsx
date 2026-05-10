import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card, Label, SectionHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { requireSession } from "@/lib/require";
import { getAcademicYearContext, withAcademicYearParam } from "@/lib/academic-year";
import { ExamQuestionFilePreview } from "@/components/exam-question-file-preview";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;
type OptionKey = (typeof OPTION_KEYS)[number];

type StoredAnswer = {
  questionId: string;
  selectedOption: OptionKey | null;
  correctOption: OptionKey;
  marks: number;
};

function classLabel(name: string, section: string) {
  return section ? `${name}-${section}` : name;
}

function statusTone(status: "UPCOMING" | "OPEN" | "CLOSED") {
  return status === "OPEN" ? "success" : status === "UPCOMING" ? "info" : "danger";
}

function examWindowStatus(now: Date, startsAt: Date, endsAt: Date): "UPCOMING" | "OPEN" | "CLOSED" {
  if (now < startsAt) return "UPCOMING";
  if (now > endsAt) return "CLOSED";
  return "OPEN";
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

function parseNumberParam(value?: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function optionText(question: {
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}, key: OptionKey) {
  if (key === "A") return question.optionA;
  if (key === "B") return question.optionB;
  if (key === "C") return question.optionC;
  return question.optionD;
}

export default async function SchoolExamAttemptPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string; attemptId: string }>;
  searchParams: Promise<{
    ay?: string;
    submitted?: string;
    report?: string;
    sent?: string;
    total?: string;
    score?: string;
    max?: string;
    correct?: string;
    wrong?: string;
    totalQuestions?: string;
    percentage?: string;
  }>;
}) {
  await requirePermission("EXAMS", "VIEW");
  const session = await requireSession();
  const { id: examId, attemptId } = await params;
  const { ay, submitted, report, sent, total, score, max, correct, wrong, totalQuestions, percentage } = await searchParams;

  const yearContext = await getAcademicYearContext({ schoolId: session.schoolId, requestedYearId: ay });
  const selectedYear = yearContext.selectedYear;

  const attempt = await db.schoolExamAttempt.findFirst({
    where: {
      id: attemptId,
      examId,
      schoolId: session.schoolId,
      ...(session.roleKey === "PARENT" ? { student: { parents: { some: { userId: session.userId } } } } : {})
    },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          studentId: true,
          class: { select: { name: true, section: true } }
        }
      },
      exam: {
        select: {
          id: true,
          title: true,
          instructions: true,
          questionPaperUrl: true,
          startsAt: true,
          endsAt: true,
          durationMinutes: true,
          class: { select: { name: true, section: true } },
          questions: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              prompt: true,
              optionA: true,
              optionB: true,
              optionC: true,
              optionD: true,
              correctOption: true,
              marks: true
            }
          }
        }
      }
    }
  });

  if (!attempt) return notFound();

  const now = new Date();
  const windowStatus = examWindowStatus(now, attempt.exam.startsAt, attempt.exam.endsAt);
  const hasMcqQuestions = attempt.exam.questions.length > 0;
  const canSubmit =
    session.roleKey === "PARENT" &&
    attempt.status === "IN_PROGRESS" &&
    windowStatus === "OPEN" &&
    hasMcqQuestions;
  const submittedAnswers = parseStoredAnswers(attempt.answersJson);
  const submittedScore = parseNumberParam(score);
  const submittedMax = parseNumberParam(max);
  const submittedCorrect = parseNumberParam(correct);
  const submittedWrong = parseNumberParam(wrong);
  const submittedTotalQuestions = parseNumberParam(totalQuestions);
  const submittedPercentage = parseNumberParam(percentage);
  const showScorePopup =
    submitted === "1" &&
    submittedScore !== null &&
    submittedMax !== null &&
    submittedCorrect !== null &&
    submittedWrong !== null &&
    submittedTotalQuestions !== null &&
    submittedPercentage !== null;
  const closePopupHref = withAcademicYearParam(`/exams/${examId}/attempt/${attemptId}`, selectedYear.id);

  return (
    <div className="space-y-5 animate-fade-up">
      {showScorePopup ? (
        <div className="fixed inset-0 z-[620] flex items-center justify-center bg-[#020814]/90 px-4">
          <div className="w-full max-w-[460px] rounded-[20px] border border-emerald-400/35 bg-[#081529] p-5 shadow-[0_35px_90px_-45px_rgba(0,0,0,0.95)]">
            <h3 className="text-[20px] font-semibold text-white/95">Exam Submitted</h3>
            <p className="mt-1 text-[13px] text-white/62">Score summary for {attempt.exam.title}</p>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-[12px] border border-white/[0.1] bg-black/20 px-3 py-2.5">
                <p className="text-[11px] text-white/55">Score</p>
                <p className="text-[17px] font-semibold text-emerald-200">{submittedScore}/{submittedMax}</p>
              </div>
              <div className="rounded-[12px] border border-white/[0.1] bg-black/20 px-3 py-2.5">
                <p className="text-[11px] text-white/55">Percentage</p>
                <p className="text-[17px] font-semibold text-blue-200">{submittedPercentage.toFixed(1)}%</p>
              </div>
              <div className="rounded-[12px] border border-white/[0.1] bg-black/20 px-3 py-2.5">
                <p className="text-[11px] text-white/55">Correct</p>
                <p className="text-[17px] font-semibold text-emerald-200">{submittedCorrect}</p>
              </div>
              <div className="rounded-[12px] border border-white/[0.1] bg-black/20 px-3 py-2.5">
                <p className="text-[11px] text-white/55">Wrong</p>
                <p className="text-[17px] font-semibold text-rose-200">{submittedWrong}</p>
              </div>
            </div>

            <p className="mt-3 text-[12px] text-white/60">
              Attempted questions: {submittedTotalQuestions} · Parent report card has been processed automatically.
            </p>

            <div className="mt-4 flex justify-end">
              <Link
                href={closePopupHref}
                className="inline-flex min-h-[38px] items-center justify-center rounded-[11px] border border-white/[0.15] bg-[#0d172b] px-4 text-sm font-medium text-white/88 hover:bg-[#16233a]"
              >
                Continue
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <Link href={withAcademicYearParam("/exams", selectedYear.id)} className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white/80 transition-colors">
        ← Back to exams
      </Link>

      {submitted === "1" ? (
        <div className="rounded-[14px] border border-emerald-500/30 bg-emerald-500/12 px-4 py-3 text-sm text-emerald-100">
          Exam submitted successfully.
        </div>
      ) : null}

      {report === "sent" ? (
        <div className="rounded-[14px] border border-emerald-500/30 bg-emerald-500/12 px-4 py-3 text-sm text-emerald-100">
          Exam report sent to parent email{Number(total ?? "0") === 1 ? "" : "s"} ({sent ?? "0"}/{total ?? "0"}).
        </div>
      ) : null}

      {report === "partial" ? (
        <div className="rounded-[14px] border border-amber-500/30 bg-amber-500/12 px-4 py-3 text-sm text-amber-100">
          Exam report sent partially ({sent ?? "0"}/{total ?? "0"}). Please retry to send remaining emails.
        </div>
      ) : null}

      {report === "failed" ? (
        <div className="rounded-[14px] border border-rose-500/30 bg-rose-500/12 px-4 py-3 text-sm text-rose-100">
          Could not send exam report email. Please check email provider settings.
        </div>
      ) : null}

      {report === "no_parent_email" ? (
        <div className="rounded-[14px] border border-amber-500/30 bg-amber-500/12 px-4 py-3 text-sm text-amber-100">
          Parent email is not available for this student.
        </div>
      ) : null}

      {report === "not_submitted" ? (
        <div className="rounded-[14px] border border-amber-500/30 bg-amber-500/12 px-4 py-3 text-sm text-amber-100">
          Submit the exam first, then send the report to parent.
        </div>
      ) : null}

      <Card accent="teal">
        <SectionHeader
          title={attempt.exam.title}
          subtitle={`${attempt.student.fullName} (${attempt.student.studentId}) · ${selectedYear.name}`}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(windowStatus)}>{windowStatus}</Badge>
          <Badge tone="neutral">{attempt.exam.class ? classLabel(attempt.exam.class.name, attempt.exam.class.section) : "All classes"}</Badge>
          <Badge tone={attempt.status === "SUBMITTED" ? "success" : "warning"}>{attempt.status}</Badge>
          <Badge tone="info">{attempt.exam.questions.length} MCQ</Badge>
          <Badge tone="neutral">Duration {attempt.exam.durationMinutes} mins</Badge>
        </div>

        <p className="mt-2 text-[12px] text-white/58">
          Starts {formatDateTime(attempt.exam.startsAt)} · Ends {formatDateTime(attempt.exam.endsAt)}
        </p>

        {attempt.exam.instructions ? (
          <p className="mt-3 whitespace-pre-wrap rounded-[12px] border border-white/[0.08] bg-black/20 px-3.5 py-2.5 text-[13px] text-white/70">
            {attempt.exam.instructions}
          </p>
        ) : null}

        {attempt.exam.questionPaperUrl && session.roleKey !== "PARENT" ? (
          <div className="mt-3">
            <ExamQuestionFilePreview
              fileUrl={attempt.exam.questionPaperUrl}
              title={`${attempt.exam.title} · Question File`}
              buttonText="Open Question File"
            />
          </div>
        ) : null}

        {attempt.status === "SUBMITTED" ? (
          <div className="mt-4 rounded-[12px] border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-3 text-[13px] text-emerald-100">
            Score: {attempt.score ?? 0} / {attempt.maxScore ?? 0}
            {attempt.submittedAt ? ` · Submitted ${formatDateTime(attempt.submittedAt)}` : ""}
            {session.roleKey !== "PARENT" ? <SendExamReportForm examId={attempt.exam.id} attemptId={attempt.id} /> : null}
          </div>
        ) : null}

        {canSubmit ? (
          <AttemptForm examId={attempt.exam.id} attemptId={attempt.id} questions={attempt.exam.questions} />
        ) : (
          <div className="mt-4 rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 text-[12px] text-white/60">
            {attempt.status === "SUBMITTED"
              ? "You have already submitted this exam."
              : !hasMcqQuestions
                ? "This exam has question file only. MCQ submission is not configured for this exam."
              : windowStatus === "UPCOMING"
                ? "Exam is not open yet."
                : windowStatus === "CLOSED"
                  ? "Exam window is closed."
                  : "Only student/parent exam user can submit this attempt."}
          </div>
        )}
      </Card>

      {hasMcqQuestions && session.roleKey !== "PARENT" ? (
        <Card
          title="Question & Answer Preview"
          description={
            attempt.status === "SUBMITTED"
              ? "Review your selected options and correct answers"
              : "Preview questions and answers for better understanding"
          }
          accent="indigo"
        >
          <details className="rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-3" open={attempt.status === "SUBMITTED"}>
            <summary className="cursor-pointer select-none text-[13px] font-semibold text-white/85">
              Preview all questions and answers
            </summary>

            <div className="mt-3 space-y-3">
              {attempt.exam.questions.map((question, index) => {
                const answer = submittedAnswers.get(question.id);
                return (
                  <article key={question.id} className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[14px] font-semibold text-white/92">
                        Q{index + 1}. {question.prompt}
                      </p>
                      <Badge tone="neutral">{question.marks} mark(s)</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {OPTION_KEYS.map((optionKey) => {
                        const selected = answer?.selectedOption === optionKey;
                        const correct = question.correctOption === optionKey;
                        return (
                          <div
                            key={`${question.id}-${optionKey}`}
                            className={[
                              "rounded-[10px] border px-3 py-2 text-[13px]",
                              correct
                                ? "border-emerald-400/35 bg-emerald-500/[0.12] text-emerald-100"
                                : selected
                                  ? "border-amber-400/35 bg-amber-500/[0.12] text-amber-100"
                                  : "border-white/[0.08] bg-black/20 text-white/75"
                            ].join(" ")}
                          >
                            <span className="font-semibold">{optionKey}.</span> {optionText(question, optionKey)}
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[12px] text-emerald-200/92">
                      Correct answer: {question.correctOption}
                    </p>
                  </article>
                );
              })}
            </div>
          </details>
        </Card>
      ) : null}
    </div>
  );
}

async function AttemptForm({
  examId,
  attemptId,
  questions
}: {
  examId: string;
  attemptId: string;
  questions: Array<{
    id: string;
    prompt: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    marks: number;
  }>;
}) {
  const { submitExamAttemptAction } = await import("../../../actions");

  return (
    <form action={submitExamAttemptAction} className="mt-4 space-y-3">
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="attemptId" value={attemptId} />

      {questions.map((question, index) => (
        <article key={question.id} className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-3.5">
          <div className="flex items-start justify-between gap-3">
            <Label required>Q{index + 1}. {question.prompt}</Label>
            <Badge tone="neutral">{question.marks} mark(s)</Badge>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {OPTION_KEYS.map((optionKey) => (
              <label
                key={`${question.id}-${optionKey}`}
                className="flex items-start gap-2 rounded-[10px] border border-white/[0.08] bg-black/20 px-3 py-2 text-[13px] text-white/82"
              >
                <input
                  type="radio"
                  name={`q:${question.id}`}
                  value={optionKey}
                  className="mt-0.5 h-4 w-4 accent-blue-400"
                />
                <span>
                  <span className="font-semibold">{optionKey}.</span> {optionText(question, optionKey)}
                </span>
              </label>
            ))}
          </div>
        </article>
      ))}

      <div className="flex justify-end">
        <Button type="submit">Submit Exam</Button>
      </div>
    </form>
  );
}

async function SendExamReportForm({
  examId,
  attemptId
}: {
  examId: string;
  attemptId: string;
}) {
  const { sendExamReportToParentsAction } = await import("../../../actions");

  return (
    <form action={sendExamReportToParentsAction} className="mt-3 flex justify-end">
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="attemptId" value={attemptId} />
      <Button type="submit" size="sm" variant="secondary">
        Send Report to Parent
      </Button>
    </form>
  );
}
