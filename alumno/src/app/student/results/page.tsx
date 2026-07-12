"use client";

import { CheckCircle2, RefreshCw, Trophy } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageHeader } from "@/components/student/PageHeader";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/StatusState";
import { formatDate, numberText } from "@/lib/format";
import { studentApi } from "@/lib/resources";
import type { Result } from "@/types/api";
import styles from "./results.module.css";

function StudentResultsContent() {
  const searchParams = useSearchParams();
  const submittedId = searchParams.get("submitted");
  const reason = searchParams.get("reason");
  const [results, setResults] = useState<Result[]>([]);
  const [submittedResult, setSubmittedResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [published, submitted] = await Promise.all([
        studentApi.myResults(),
        submittedId ? studentApi.result(submittedId).catch(() => null) : Promise.resolve(null),
      ]);
      setResults(published);
      setSubmittedResult(submitted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los resultados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [submittedId]);

  return (
    <>
      <PageHeader
        title="Resultados"
        description="Consulta tus resultados publicados y el estado del examen enviado."
        actions={
          <Button variant="secondary" icon={<RefreshCw size={16} aria-hidden />} onClick={() => void refresh()}>
            Actualizar
          </Button>
        }
      />
      {error ? <ErrorState message={error} /> : null}
      {loading ? (
        <LoadingState label="Cargando resultados" />
      ) : (
        <section className={styles.stack}>
          {submittedResult ? (
            <article className={styles.submitted}>
              <CheckCircle2 size={24} aria-hidden />
              <div>
                <span>Examen finalizado{reason === "general-time" ? " por tiempo general" : reason === "question-time" ? " por tiempo de pregunta" : ""}</span>
                <strong>{numberText(submittedResult.percentage)}%</strong>
                <p>
                  Estado: {submittedResult.status.replaceAll("_", " ")} - {numberText(submittedResult.score)} de{" "}
                  {numberText(submittedResult.maxScore)} puntos
                </p>
              </div>
            </article>
          ) : null}
          <div className={styles.grid}>
            {results.length === 0 ? (
              <div className={styles.empty}>No hay resultados publicados todavia.</div>
            ) : (
              results.map((result) => (
                <article key={result.id} className={styles.card}>
                  <Trophy size={22} aria-hidden />
                  <div>
                    <h2>{result.examVersion?.title ?? "Resultado"}</h2>
                    <span>{formatDate(result.publishedAt ?? result.createdAt)}</span>
                  </div>
                  <strong>{numberText(result.percentage)}%</strong>
                  <p>
                    {numberText(result.score)} / {numberText(result.maxScore)} puntos - {result.passed ? "Aprobado" : "No aprobado"}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      )}
    </>
  );
}

export default function StudentResultsPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando resultados" />}>
      <StudentResultsContent />
    </Suspense>
  );
}
