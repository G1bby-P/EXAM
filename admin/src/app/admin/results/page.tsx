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
import type { Paginated, Result } from "@/types/api";
import styles from "./results.module.css";

interface AnswerDetail {
  id: string;
  answerText?: string | null;
  selectedOptionIds?: string[] | null;
  score?: string | null;
  reviewStatus: string;
  feedback?: string | null;
}

interface ResultDetail extends Result {
  attempt?: {
    answers?: AnswerDetail[];
  };
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
              {(selected.attempt?.answers ?? []).map((answer) => (
                <form key={answer.id} className={styles.answer} onSubmit={(event) => void reviewAnswer(event, answer.id)}>
                  <div>
                    <strong>{answer.answerText || answer.selectedOptionIds?.join(", ") || "Sin respuesta textual"}</strong>
                    <span>{answer.reviewStatus} - puntaje actual {numberText(answer.score)}</span>
                  </div>
                  <Field label="Puntaje">
                    <TextInput
                      type="number"
                      min="0"
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
              ))}
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
