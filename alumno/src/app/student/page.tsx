"use client";

import { Clock, Play, RefreshCw, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/student/PageHeader";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/StatusState";
import { formatDate } from "@/lib/format";
import { studentApi } from "@/lib/resources";
import type { ExamAssignment } from "@/types/api";
import styles from "./student-home.module.css";

export default function StudentHomePage() {
  const [assignments, setAssignments] = useState<ExamAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const result = await studentApi.availableExams();
      setAssignments(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los examenes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function startExam(assignmentId: string) {
    setStartingId(assignmentId);
    setError(null);
    try {
      router.push(`/student/exams/${assignmentId}`);
    } finally {
      setStartingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Examenes asignados"
        description="Selecciona un examen disponible para iniciar el intento."
        actions={
          <>
            <Link href="/student/results" className={styles.linkButton}>
              <Trophy size={16} aria-hidden />
              Resultados
            </Link>
            <Button variant="secondary" icon={<RefreshCw size={16} aria-hidden />} onClick={() => void refresh()}>
              Actualizar
            </Button>
          </>
        }
      />
      {error ? <ErrorState message={error} /> : null}
      {loading ? (
        <LoadingState label="Cargando examenes" />
      ) : (
        <section className={styles.grid}>
          {assignments.length === 0 ? (
            <div className={styles.empty}>No tienes examenes disponibles.</div>
          ) : (
            assignments.map((assignment) => (
              <article key={assignment.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h2>{assignment.examVersion.title}</h2>
                    <p>{assignment.examVersion.description ?? assignment.exam.description ?? "Sin descripcion"}</p>
                  </div>
                  <span>{assignment.status}</span>
                </div>
                <dl>
                  <div>
                    <dt>Tiempo</dt>
                    <dd>{assignment.examVersion.timeLimitMinutes ?? "Sin limite"} min</dd>
                  </div>
                  <div>
                    <dt>Intentos usados</dt>
                    <dd>{assignment.attempts.length}</dd>
                  </div>
                  <div>
                    <dt>Disponible hasta</dt>
                    <dd>{formatDate(assignment.dueAt)}</dd>
                  </div>
                </dl>
                <Button
                  icon={<Play size={16} aria-hidden />}
                  onClick={() => void startExam(assignment.id)}
                  disabled={startingId === assignment.id}
                >
                  {startingId === assignment.id ? "Abriendo" : "Iniciar examen"}
                </Button>
              </article>
            ))
          )}
        </section>
      )}
      <aside className={styles.note}>
        <Clock size={18} aria-hidden />
        <span>Al iniciar, el tiempo general comienza en el servidor. El avance se guarda automaticamente durante el intento.</span>
      </aside>
    </>
  );
}
