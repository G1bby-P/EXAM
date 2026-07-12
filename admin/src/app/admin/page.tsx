"use client";

import {
  BarChart3,
  Download,
  Filter,
  Percent,
  RefreshCw,
  Target,
  Timer,
  Trophy,
  Users,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput, TextInput } from "@/components/ui/Field";
import { ErrorState, LoadingState } from "@/components/ui/StatusState";
import { formatDate, numberText } from "@/lib/format";
import { adminApi } from "@/lib/resources";
import type { Course, Exam, ResultStatus, StatisticsDashboard, StatisticsRankingItem, Topic } from "@/types/api";
import styles from "./dashboard.module.css";

type FilterState = {
  from: string;
  to: string;
  courseId: string;
  topicId: string;
  examId: string;
  status: "" | ResultStatus;
  rankingLimit: string;
};

const emptyFilters: FilterState = {
  from: "",
  to: "",
  courseId: "",
  topicId: "",
  examId: "",
  status: "",
  rankingLimit: "10",
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
    rankingLimit: Number(filters.rankingLimit) || 10,
  };
}

function percentLabel(value: number) {
  return `${numberText(value)}%`;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<StatisticsDashboard | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
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

  async function load(nextFilters = filters) {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.statistics(toParams(nextFilters));
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las estadisticas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([
      adminApi.courses({ page: 1, limit: 100 }),
      adminApi.topics({ page: 1, limit: 100 }),
      adminApi.exams({ page: 1, limit: 100 }),
      adminApi.statistics(toParams(emptyFilters)),
    ])
      .then(([courseResult, topicResult, examResult, statistics]) => {
        setCourses(courseResult.items);
        setTopics(topicResult.items);
        setExams(examResult.items);
        setData(statistics);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el tablero."))
      .finally(() => setLoading(false));
  }, []);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(filters);
  }

  async function clearFilters() {
    setFilters(emptyFilters);
    await load(emptyFilters);
  }

  async function downloadReport() {
    setDownloading(true);
    setError(null);
    try {
      const csv = await adminApi.statisticsReportCsv(toParams(filters));
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `statistics-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar el reporte.");
    } finally {
      setDownloading(false);
    }
  }

  if (loading && !data) return <LoadingState label="Cargando estadisticas" />;

  const summary = data?.summary;

  return (
    <>
      <PageHeader
        eyebrow="Estadisticas"
        title="Dashboard"
        description="Indicadores academicos, rendimiento, rankings y reportes filtrables."
        actions={
          <>
            <Button variant="secondary" icon={<RefreshCw size={16} aria-hidden />} onClick={() => void load()}>
              Actualizar
            </Button>
            <Button icon={<Download size={16} aria-hidden />} onClick={() => void downloadReport()} disabled={downloading}>
              {downloading ? "Generando" : "Reporte CSV"}
            </Button>
          </>
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
        <Field label="Ranking">
          <TextInput type="number" min="1" max="50" value={filters.rankingLimit} onChange={(event) => setFilters((value) => ({ ...value, rankingLimit: event.target.value }))} />
        </Field>
        <div className={styles.filterActions}>
          <Button type="submit" icon={<Filter size={16} aria-hidden />}>
            Filtrar
          </Button>
          <Button type="button" variant="secondary" onClick={() => void clearFilters()}>
            Limpiar
          </Button>
        </div>
      </form>

      {summary ? (
        <>
          <section className={styles.metrics}>
            <Metric icon={<Target size={20} aria-hidden />} label="Resultados" value={summary.totalResults} />
            <Metric icon={<Percent size={20} aria-hidden />} label="Promedio" value={percentLabel(summary.averagePercentage)} />
            <Metric icon={<Trophy size={20} aria-hidden />} label="Aprobacion" value={percentLabel(summary.passRate)} />
            <Metric icon={<Timer size={20} aria-hidden />} label="Tiempo promedio" value={`${numberText(summary.averageDurationMinutes)} min`} />
            <Metric icon={<BarChart3 size={20} aria-hidden />} label="Puntaje promedio" value={`${numberText(summary.averageScore)} / ${numberText(summary.averageMaxScore)}`} />
            <Metric icon={<Users size={20} aria-hidden />} label="Publicados" value={summary.publishedResults} />
          </section>

          <section className={styles.grid}>
            <Panel title="Tendencia de promedio">
              <TrendChart items={data?.charts.trend ?? []} />
            </Panel>
            <Panel title="Aprobados vs no aprobados">
              <BarList items={data?.charts.passFail ?? []} mode="percentage" />
            </Panel>
            <Panel title="Estados de resultados">
              <BarList items={data?.charts.statusDistribution ?? []} mode="value" />
            </Panel>
            <Panel title="Promedio por examen">
              <RankingList items={data?.rankings.exams ?? []} secondary="course" />
            </Panel>
            <Panel title="Ranking de alumnos" wide>
              <RankingList items={data?.rankings.students ?? []} secondary="email" />
            </Panel>
          </section>

          <div className={styles.generated}>Actualizado: {data ? formatDate(data.generatedAt) : "N/A"}</div>
        </>
      ) : loading ? (
        <LoadingState />
      ) : null}
    </>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <article className={styles.metric}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Panel({ title, wide, children }: { title: string; wide?: boolean; children: ReactNode }) {
  return (
    <section className={wide ? styles.panelWide : styles.panel}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function BarList({
  items,
  mode,
}: {
  items: Array<{ label: string; value?: number; percentage?: number }>;
  mode: "value" | "percentage";
}) {
  const maxValue = Math.max(...items.map((item) => (mode === "percentage" ? item.percentage ?? 0 : item.value ?? 0)), 1);
  if (items.length === 0) return <EmptyPanel />;
  return (
    <div className={styles.barList}>
      {items.map((item) => {
        const value = mode === "percentage" ? item.percentage ?? 0 : item.value ?? 0;
        const width = mode === "percentage" ? value : (value / maxValue) * 100;
        return (
          <div key={item.label} className={styles.barRow}>
            <div>
              <span>{item.label.replaceAll("_", " ")}</span>
              <strong>{mode === "percentage" ? percentLabel(value) : numberText(value)}</strong>
            </div>
            <div className={styles.barTrack}>
              <span style={{ width: `${Math.max(width, value > 0 ? 4 : 0)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RankingList({ items, secondary }: { items: StatisticsRankingItem[]; secondary: "email" | "course" }) {
  if (items.length === 0) return <EmptyPanel />;
  return (
    <ol className={styles.ranking}>
      {items.map((item, index) => (
        <li key={item.id}>
          <span className={styles.rank}>{index + 1}</span>
          <div className={styles.rankBody}>
            <strong>{item.label}</strong>
            <span>{item.metadata?.[secondary] ?? `${item.count} resultados`}</span>
            <div className={styles.rankTrack}>
              <span style={{ width: `${Math.min(item.averagePercentage, 100)}%` }} />
            </div>
          </div>
          <div className={styles.rankValues}>
            <strong>{percentLabel(item.averagePercentage)}</strong>
            <span>{percentLabel(item.passRate)} apr.</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function TrendChart({ items }: { items: StatisticsRankingItem[] }) {
  if (items.length === 0) return <EmptyPanel />;
  const width = 640;
  const height = 220;
  const padding = 28;
  const step = items.length > 1 ? (width - padding * 2) / (items.length - 1) : 0;
  const points = items
    .map((item, index) => {
      const x = padding + index * step;
      const y = height - padding - (Math.min(item.averagePercentage, 100) / 100) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className={styles.trendWrap}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tendencia de promedio por fecha">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
        <polyline points={points} />
        {items.map((item, index) => {
          const x = padding + index * step;
          const y = height - padding - (Math.min(item.averagePercentage, 100) / 100) * (height - padding * 2);
          return <circle key={item.id} cx={x} cy={y} r="4" />;
        })}
      </svg>
      <div className={styles.trendLabels}>
        <span>{items[0]?.label}</span>
        <strong>{percentLabel(items[items.length - 1]?.averagePercentage ?? 0)}</strong>
        <span>{items[items.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function EmptyPanel() {
  return <div className={styles.empty}>Sin datos para el filtro seleccionado.</div>;
}
