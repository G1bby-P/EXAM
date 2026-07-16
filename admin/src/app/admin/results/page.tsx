"use client";

import { Eye, RefreshCw, Send } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Field, TextArea, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/StatusState";
import { formatDate, fullName, numberText } from "@/lib/format";
import { apiRequest } from "@/lib/api";
import { adminApi, postAction, updateResource } from "@/lib/resources";
import type { Paginated, QuestionType, Result } from "@/types/api";
import styles from "./results.module.css";

type AnswerReviewStatus = "NOT_REQUIRED" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

interface OptionSnapshot {
  id: string;
  label?: string | null;
  text: string;
  sortOrder?: number;
}

interface QuestionDetail {
  id: string;
  type: QuestionType;
  prompt: string;
  optionsSnapshot?: OptionSnapshot[] | null;
  sortOrder?: number;
  points?: string | number | null;
  isRequired?: boolean;
}

interface AnswerDetail {
  id: string;
  examVersionQuestionId?: string;
  answerText?: string | null;
  selectedOptionIds?: string[] | null;
  fileAssetId?: string | null;
  score?: string | null;
  reviewStatus: AnswerReviewStatus;
  feedback?: string | null;
  examVersionQuestion?: QuestionDetail;
}

interface ResultDetail extends Result {
  examVersion?: Result["examVersion"] & {
    questions?: QuestionDetail[];
  };
  attempt?: {
    answers?: AnswerDetail[];
  };
}

const questionTypeLabels: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Opcion multiple",
  MULTIPLE_CHOICE: "Seleccion multiple",
  TRUE_FALSE: "Verdadero/Falso",
  SHORT_TEXT: "Respuesta corta",
  ESSAY: "Desarrollo",
  FILE_UPLOAD: "Archivo",
  CLINICAL_CASE: "Caso clinico",
};

const reviewStatusLabels: Record<AnswerReviewStatus, string> = {
  NOT_REQUIRED: "Revision no requerida",
  PENDING_REVIEW: "Pendiente de revision",
  APPROVED: "Revision aprobada",
  REJECTED: "Revision rechazada",
};

function getAnswerRows(result: ResultDetail) {
  const answers = result.attempt?.answers ?? [];
  const byQuestion = new Map(
    answers
      .map((answer) => [answer.examVersionQuestionId ?? answer.examVersionQuestion?.id, answer] as const)
      .filter((entry): entry is [string, AnswerDetail] => Boolean(entry[0])),
  );
  const questions = result.examVersion?.questions ?? [];
  if (questions.length > 0) {
    return questions.map((question) => ({ question, answer: byQuestion.get(question.id) }));
  }
  return answers.map((answer) => ({ question: answer.examVersionQuestion, answer }));
}

function getSelectedOptionText(answer: AnswerDetail, question?: QuestionDetail) {
  const selectedIds = Array.isArray(answer.selectedOptionIds) ? answer.selectedOptionIds : [];
  if (selectedIds.length === 0) return null;
  const options = question?.optionsSnapshot ?? answer.examVersionQuestion?.optionsSnapshot ?? [];
  return selectedIds
    .map((id) => {
      const option = options.find((item) => item.id === id);
      if (!option) return id;
      return `${option.label ? `${option.label}. ` : ""}${option.text}`;
    })
    .join("; ");
}

function getStudentAnswerText(answer?: AnswerDetail, question?: QuestionDetail) {
  if (!answer) return "Sin respuesta";
  const textAnswer = answer.answerText?.trim();
  if (textAnswer) return textAnswer;
  const selectedOptionText = getSelectedOptionText(answer, question);
  if (selectedOptionText) return selectedOptionText;
  if (answer.fileAssetId) return "Archivo adjunto";
  return "Sin respuesta";
}

export default function ResultsPage() {
  const [data, setData] = useState<Paginated<Result> | null>(null);
  const [selected, setSelected] = useState<ResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewPayload, setReviewPayload] = useState<Record<string, { score: string; feedback: string }>>({});

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.results({ page: 1, limit: 50 });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los resultados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function openResult(result: Result) {
    setError(null);
    try {
      const response = await fetchResult(result.id);
      setSelected(response);
      setDetailOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el resultado.");
    }
  }

  async function fetchResult(id: string): Promise<ResultDetail> {
    return apiRequest<ResultDetail>(`/results/${id}`);
  }

  async function reviewAnswer(event: FormEvent<HTMLFormElement>, answerId: string) {
    event.preventDefault();
    const payload = reviewPayload[answerId];
    if (!payload) return;
    await updateResource(`/results/answers/${answerId}/review`, {
      score: Number(payload.score),
      feedback: payload.feedback || undefined,
    });
    if (selected) await openResult(selected);
  }

  async function publishResult() {
    if (!selected) return;
    await postAction(`/results/${selected.id}/publish`);
    setDetailOpen(false);
    await refresh();
  }

  const columns: Column<Result>[] = [
    { key: "user", header: "Usuario", render: (result) => result.user?.email ?? result.userId },
    { key: "exam", header: "Examen", render: (result) => result.examVersion?.title ?? result.examVersionId },
    { key: "score", header: "Puntaje", render: (result) => `${numberText(result.score)} / ${numberText(result.maxScore)}` },
    { key: "percentage", header: "Porcentaje", render: (result) => `${numberText(result.percentage)}%` },
    { key: "status", header: "Estado", render: (result) => <Badge value={result.status} /> },
    { key: "date", header: "Fecha", render: (result) => formatDate(result.createdAt) },
    {
      key: "actions",
      header: "Acciones",
      render: (result) => (
        <Button variant="secondary" size="sm" icon={<Eye size={15} aria-hidden />} onClick={() => void openResult(result)}>
          Revisar
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Evaluacion"
        title="Resultados"
        description="Revision, calificacion manual y publicacion de resultados de examenes."
        actions={
          <Button variant="secondary" icon={<RefreshCw size={16} aria-hidden />} onClick={() => void refresh()}>
            Actualizar
          </Button>
        }
      />
      {error ? <ErrorState message={error} /> : null}
      {loading || !data ? <LoadingState /> : <DataTable columns={columns} rows={data.items} getRowKey={(result) => result.id} />}
      <Modal title="Detalle del resultado" open={detailOpen} onClose={() => setDetailOpen(false)}>
        {selected ? (
          <div className={styles.detail}>
            <div className={styles.summary}>
              <div>
                <strong>{selected.user ? fullName(selected.user.firstName, selected.user.lastName) : selected.userId}</strong>
                <span>{selected.user?.email}</span>
              </div>
              <Badge value={selected.status} />
            </div>
            <div className={styles.scoreLine}>
              <strong>{numberText(selected.percentage)}%</strong>
              <span>{numberText(selected.score)} de {numberText(selected.maxScore)} puntos</span>
            </div>
            <div className={styles.answers}>
              {getAnswerRows(selected).map(({ question, answer }, index) => {
                const canReview = Boolean(answer && answer.reviewStatus !== "NOT_REQUIRED");
                const answerKey = question?.id ?? answer?.id ?? `answer-${index}`;
                return (
                  <article key={answerKey} className={styles.answer}>
                    <div className={styles.answerHeader}>
                      <div>
                        <strong>{question?.prompt ?? "Pregunta sin texto disponible"}</strong>
                        <span>
                          {question
                            ? `${questionTypeLabels[question.type]} - ${numberText(question.points)} punto(s) - ${
                                question.isRequired ? "Obligatoria" : "Opcional"
                              }`
                            : "Pregunta no disponible"}
                        </span>
                      </div>
                      <span className={styles.reviewStatus}>
                        {answer ? reviewStatusLabels[answer.reviewStatus] : "Sin respuesta guardada"}
                      </span>
                    </div>
                    <div className={styles.responseBox}>
                      <span>Respuesta del alumno</span>
                      <strong>{getStudentAnswerText(answer, question)}</strong>
                    </div>
                    <div className={styles.answerMeta}>
                      <span>Puntaje actual: {numberText(answer?.score)}</span>
                    </div>
                    {canReview && answer ? (
                      <form className={styles.reviewForm} onSubmit={(event) => void reviewAnswer(event, answer.id)}>
                        <Field label="Puntaje">
                          <TextInput
                            type="number"
                            min="0"
                            max={question?.points ? Number(question.points) : undefined}
                            value={reviewPayload[answer.id]?.score ?? ""}
                            onChange={(event) =>
                              setReviewPayload((value) => ({
                                ...value,
                                [answer.id]: { score: event.target.value, feedback: value[answer.id]?.feedback ?? "" },
                              }))
                            }
                          />
                        </Field>
                        <Field label="Retroalimentacion">
                          <TextArea
                            value={reviewPayload[answer.id]?.feedback ?? ""}
                            onChange={(event) =>
                              setReviewPayload((value) => ({
                                ...value,
                                [answer.id]: { score: value[answer.id]?.score ?? "", feedback: event.target.value },
                              }))
                            }
                          />
                        </Field>
                        <Button type="submit" variant="secondary">Guardar revision</Button>
                      </form>
                    ) : (
                      <p className={styles.reviewNote}>Esta respuesta se califica automaticamente y no requiere revision manual.</p>
                    )}
                  </article>
                );
              })}
            </div>
            <Button icon={<Send size={16} aria-hidden />} onClick={() => void publishResult()}>
              Publicar resultado
            </Button>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
