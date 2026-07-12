"use client";

import { Download, FileSpreadsheet, FileText, History, RefreshCw } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Field, SelectInput, TextInput } from "@/components/ui/Field";
import { ErrorState, LoadingState } from "@/components/ui/StatusState";
import { formatDate } from "@/lib/format";
import { adminApi } from "@/lib/resources";
import type { Course, Exam, ExportHistory, Paginated, ResultStatus, Topic } from "@/types/api";
import styles from "./exports.module.css";

type ExportResource = "results" | "report" | "history";
type ExportFormat = "xlsx" | "pdf";

type FilterState = {
  from: string;
  to: string;
  courseId: string;
  topicId: string;
  examId: string;
  status: "" | ResultStatus;
};

const emptyFilters: FilterState = {
  from: "",
  to: "",
  courseId: "",
  topicId: "",
  examId: "",
  status: "",
};

const resultStatuses: ResultStatus[] = ["PENDING_REVIEW", "READY", "PUBLISHED", "WITHHELD"];

function toParams(filters: FilterState): Record<string, string | number | undefined> {
  return {
    from: filters.from || undefined,
    to: filters.to || undefined,
    courseId: filters.courseId || undefined,
    topicId: filters.topicId || undefined,
    examId: filters.examId || undefined,
    status: filters.status || undefined,
  };
}

export default function AdminExportsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [history, setHistory] = useState<Paginated<ExportHistory> | null>(null);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredTopics = useMemo(
    () => topics.filter((topic) => !filters.courseId || topic.courseId === filters.courseId),
    [filters.courseId, topics],
  );

  const filteredExams = useMemo(
    () =>
      exams.filter(
        (exam) =>
          (!filters.courseId || exam.courseId === filters.courseId) &&
          (!filters.topicId || exam.topicId === filters.topicId),
      ),
    [exams, filters.courseId, filters.topicId],
  );

  async function loadHistory() {
    const result = await adminApi.exportHistory({ page: 1, limit: 20 });
    setHistory(result);
  }

  useEffect(() => {
    Promise.all([
      adminApi.courses({ page: 1, limit: 100 }),
      adminApi.topics({ page: 1, limit: 100 }),
      adminApi.exams({ page: 1, limit: 100 }),
      adminApi.exportHistory({ page: 1, limit: 20 }),
    ])
      .then(([courseResult, topicResult, examResult, historyResult]) => {
        setCourses(courseResult.items);
        setTopics(topicResult.items);
        setExams(examResult.items);
        setHistory(historyResult);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar exportaciones."))
      .finally(() => setLoading(false));
  }, []);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  async function download(resource: ExportResource, format: ExportFormat) {
    const key = `${resource}-${format}`;
    setDownloading(key);
    setError(null);
    try {
      const params = resource === "history" ? {} : toParams(appliedFilters);
      const result = await adminApi.exportFile(resource, format, params);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName ?? `${resource}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar la exportacion.");
    } finally {
      setDownloading(null);
    }
  }

  const columns: Column<ExportHistory>[] = [
    { key: "createdAt", header: "Fecha", render: (item) => formatDate(item.createdAt) },
    { key: "fileName", header: "Archivo", render: (item) => <strong>{item.fileName}</strong> },
    { key: "type", header: "Tipo", render: (item) => item.exportType },
    { key: "format", header: "Formato", render: (item) => item.format },
    { key: "rows", header: "Filas", render: (item) => item.rowCount },
    { key: "status", header: "Estado", render: (item) => <Badge value={item.status} /> },
    { key: "actor", header: "Usuario", render: (item) => item.actor?.email ?? "Sistema" },
  ];

  if (loading) return <LoadingState label="Cargando exportaciones" />;

  return (
    <>
      <PageHeader
        eyebrow="Exportacion"
        title="Exportaciones"
        description="Descarga resultados, reportes e historial en Excel o PDF."
        actions={
          <Button variant="secondary" icon={<RefreshCw size={16} aria-hidden />} onClick={() => void loadHistory()}>
            Actualizar historial
          </Button>
        }
      />

      {error ? <ErrorState message={error} /> : null}

      <form className={styles.filters} onSubmit={applyFilters}>
        <Field label="Desde">
          <TextInput type="date" value={filters.from} onChange={(event) => setFilters((value) => ({ ...value, from: event.target.value }))} />
        </Field>
        <Field label="Hasta">
          <TextInput type="date" value={filters.to} onChange={(event) => setFilters((value) => ({ ...value, to: event.target.value }))} />
        </Field>
        <Field label="Curso">
          <SelectInput value={filters.courseId} onChange={(event) => setFilters((value) => ({ ...value, courseId: event.target.value, topicId: "", examId: "" }))}>
            <option value="">Todos</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Tema">
          <SelectInput value={filters.topicId} onChange={(event) => setFilters((value) => ({ ...value, topicId: event.target.value, examId: "" }))}>
            <option value="">Todos</option>
            {filteredTopics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Examen">
          <SelectInput value={filters.examId} onChange={(event) => setFilters((value) => ({ ...value, examId: event.target.value }))}>
            <option value="">Todos</option>
            {filteredExams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Estado">
          <SelectInput value={filters.status} onChange={(event) => setFilters((value) => ({ ...value, status: event.target.value as FilterState["status"] }))}>
            <option value="">Todos</option>
            {resultStatuses.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className={styles.filterActions}>
          <Button type="submit">Aplicar</Button>
          <Button type="button" variant="secondary" onClick={clearFilters}>
            Limpiar
          </Button>
        </div>
      </form>

      <section className={styles.exportGrid}>
        <ExportCard
          title="Resultados"
          description="Listado detallado de resultados filtrados."
          icon={<FileSpreadsheet size={20} aria-hidden />}
          loadingKey={downloading}
          resource="results"
          onDownload={download}
        />
        <ExportCard
          title="Reportes"
          description="Resumen estadistico, promedios y rankings."
          icon={<FileText size={20} aria-hidden />}
          loadingKey={downloading}
          resource="report"
          onDownload={download}
        />
        <ExportCard
          title="Historial"
          description="Registro de exportaciones generadas."
          icon={<History size={20} aria-hidden />}
          loadingKey={downloading}
          resource="history"
          onDownload={download}
        />
      </section>

      <section className={styles.historyPanel}>
        <div className={styles.panelHeader}>
          <h2>Historial de exportaciones</h2>
          <span>{history?.total ?? 0} registros</span>
        </div>
        <DataTable
          columns={columns}
          rows={history?.items ?? []}
          getRowKey={(item) => item.id}
          emptyText="Aun no hay exportaciones registradas."
        />
      </section>
    </>
  );
}

function ExportCard({
  title,
  description,
  icon,
  resource,
  loadingKey,
  onDownload,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  resource: ExportResource;
  loadingKey: string | null;
  onDownload: (resource: ExportResource, format: ExportFormat) => Promise<void>;
}) {
  return (
    <article className={styles.exportCard}>
      <div className={styles.cardTitle}>
        {icon}
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className={styles.cardActions}>
        <Button
          variant="secondary"
          icon={<Download size={16} aria-hidden />}
          disabled={loadingKey === `${resource}-xlsx`}
          onClick={() => void onDownload(resource, "xlsx")}
        >
          Excel
        </Button>
        <Button
          variant="secondary"
          icon={<Download size={16} aria-hidden />}
          disabled={loadingKey === `${resource}-pdf`}
          onClick={() => void onDownload(resource, "pdf")}
        >
          PDF
        </Button>
      </div>
    </article>
  );
}
