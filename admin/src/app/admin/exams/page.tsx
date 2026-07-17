"use client";

import { ClipboardPlus, Plus, RefreshCw, Send, Settings2, Upload, Users } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/StatusState";
import { adminApi, createResource, postAction } from "@/lib/resources";
import type { Course, Exam, Paginated, Question, Topic, User } from "@/types/api";
import styles from "./exams.module.css";

export default function ExamsPage() {
  const [data, setData] = useState<Paginated<Exam> | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [examPayload, setExamPayload] = useState({
    courseId: "",
    topicId: "",
    title: "",
    slug: "",
    description: "",
    instructions: "",
    timeLimitMinutes: "30",
    passingScore: "70",
    maxAttempts: "1",
    resultVisibility: "AFTER_REVIEW",
  });
  const [sectionPayload, setSectionPayload] = useState({ title: "", description: "", sortOrder: "1" });
  const [questionPayload, setQuestionPayload] = useState({ sectionId: "", questionId: "", sortOrder: "1", points: "1" });
  const [assignmentPayload, setAssignmentPayload] = useState({
    userIds: [] as string[],
    allStudents: false,
    startsAt: "",
    dueAt: "",
  });
  const studentUsers = users.filter((user) => user.status === "ACTIVE" && user.roles.includes("STUDENT"));

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.exams({ page: 1, limit: 50 });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los examenes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    adminApi.courses({ page: 1, limit: 100 }).then((result) => setCourses(result.items)).catch(() => undefined);
    adminApi.topics({ page: 1, limit: 100 }).then((result) => setTopics(result.items)).catch(() => undefined);
    adminApi.questions({ page: 1, limit: 100 }).then((result) => setQuestions(result.items)).catch(() => undefined);
    adminApi.users({ page: 1, limit: 100 }).then((result) => setUsers(result.items)).catch(() => undefined);
  }, []);

  async function openBuilder(exam: Exam) {
    setError(null);
    try {
      const fullExam = await adminApi.exam(exam.id);
      setSelectedExam(fullExam);
      setBuilderOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir el constructor.");
    }
  }

  async function createExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await createResource("/exams", {
        ...examPayload,
        courseId: examPayload.courseId || undefined,
        topicId: examPayload.topicId || undefined,
        slug: examPayload.slug || undefined,
        timeLimitMinutes: Number(examPayload.timeLimitMinutes),
        passingScore: Number(examPayload.passingScore),
        maxAttempts: Number(examPayload.maxAttempts),
      });
      setCreateOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el examen.");
    }
  }

  async function addSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedExam) return;
    await createResource(`/exams/${selectedExam.id}/sections`, {
      ...sectionPayload,
      sortOrder: Number(sectionPayload.sortOrder),
    });
    await openBuilder(selectedExam);
  }

  async function addQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedExam) return;
    await createResource(`/exams/${selectedExam.id}/questions`, {
      ...questionPayload,
      sectionId: questionPayload.sectionId || undefined,
      sortOrder: Number(questionPayload.sortOrder),
      points: Number(questionPayload.points),
    });
    await openBuilder(selectedExam);
  }

  async function publishExam() {
    if (!selectedExam) return;
    setError(null);
    try {
      await postAction(`/exams/${selectedExam.id}/publish`);
      await openBuilder(selectedExam);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo publicar el examen.");
    }
  }

  function openAssignModal() {
    setAssignmentPayload({ userIds: [], allStudents: false, startsAt: "", dueAt: "" });
    setAssignOpen(true);
  }

  function toggleAssignmentUser(userId: string, checked: boolean) {
    setAssignmentPayload((value) => ({
      ...value,
      userIds: checked ? Array.from(new Set([...value.userIds, userId])) : value.userIds.filter((id) => id !== userId),
    }));
  }

  async function assignExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedExam) return;
    setError(null);
    const startsAt = assignmentPayload.startsAt ? new Date(assignmentPayload.startsAt) : undefined;
    const dueAt = assignmentPayload.dueAt ? new Date(assignmentPayload.dueAt) : undefined;
    if (startsAt && dueAt && dueAt <= startsAt) {
      setError("La fecha de vencimiento debe ser posterior a la fecha de inicio.");
      return;
    }
    if (!assignmentPayload.allStudents && assignmentPayload.userIds.length === 0) {
      setError("Selecciona al menos un alumno o activa la opcion de todos los alumnos.");
      return;
    }
    try {
      await postAction(`/exams/${selectedExam.id}/assign`, {
        userIds: assignmentPayload.allStudents ? undefined : assignmentPayload.userIds,
        allStudents: assignmentPayload.allStudents,
        startsAt: startsAt?.toISOString(),
        dueAt: dueAt?.toISOString(),
      });
      setAssignOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar el examen.");
    }
  }

  const columns: Column<Exam>[] = [
    { key: "title", header: "Examen", render: (exam) => <strong>{exam.title}</strong> },
    { key: "course", header: "Curso", render: (exam) => exam.course?.title ?? "Sin curso" },
    { key: "topic", header: "Tema", render: (exam) => exam.topic?.title ?? "Sin tema" },
    { key: "status", header: "Estado", render: (exam) => <Badge value={exam.status} /> },
    { key: "versions", header: "Versiones", render: (exam) => exam.versions?.length ?? 0 },
    {
      key: "actions",
      header: "Acciones",
      render: (exam) => (
        <Button variant="secondary" size="sm" icon={<Settings2 size={15} aria-hidden />} onClick={() => void openBuilder(exam)}>
          Gestionar
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Evaluacion"
        title="Examenes"
        description="Administracion de examenes, secciones, preguntas, publicacion y asignaciones."
        actions={
          <>
            <Button variant="secondary" icon={<RefreshCw size={16} aria-hidden />} onClick={() => void refresh()}>
              Actualizar
            </Button>
            <Button icon={<Plus size={16} aria-hidden />} onClick={() => setCreateOpen(true)}>
              Crear examen
            </Button>
          </>
        }
      />
      {error ? <ErrorState message={error} /> : null}
      {loading || !data ? <LoadingState /> : <DataTable columns={columns} rows={data.items} getRowKey={(exam) => exam.id} />}
      <Modal title="Crear examen" open={createOpen} onClose={() => setCreateOpen(false)}>
        <form className={styles.form} onSubmit={createExam}>
          <Field label="Curso">
            <SelectInput value={examPayload.courseId} onChange={(event) => setExamPayload((value) => ({ ...value, courseId: event.target.value }))}>
              <option value="">Sin curso</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Tema">
            <SelectInput value={examPayload.topicId} onChange={(event) => setExamPayload((value) => ({ ...value, topicId: event.target.value }))}>
              <option value="">Sin tema</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>{topic.title}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Titulo">
            <TextInput required value={examPayload.title} onChange={(event) => setExamPayload((value) => ({ ...value, title: event.target.value }))} />
          </Field>
          <Field label="Descripcion">
            <TextArea value={examPayload.description} onChange={(event) => setExamPayload((value) => ({ ...value, description: event.target.value }))} />
          </Field>
          <Field label="Instrucciones">
            <TextArea value={examPayload.instructions} onChange={(event) => setExamPayload((value) => ({ ...value, instructions: event.target.value }))} />
          </Field>
          <div className={styles.threeCols}>
            <Field label="Minutos">
              <TextInput type="number" min="1" value={examPayload.timeLimitMinutes} onChange={(event) => setExamPayload((value) => ({ ...value, timeLimitMinutes: event.target.value }))} />
            </Field>
            <Field label="Aprobacion">
              <TextInput type="number" min="0" max="100" value={examPayload.passingScore} onChange={(event) => setExamPayload((value) => ({ ...value, passingScore: event.target.value }))} />
            </Field>
            <Field label="Intentos">
              <TextInput type="number" min="1" value={examPayload.maxAttempts} onChange={(event) => setExamPayload((value) => ({ ...value, maxAttempts: event.target.value }))} />
            </Field>
          </div>
          <Button type="submit">Guardar</Button>
        </form>
      </Modal>
      <Modal title="Gestionar examen" open={builderOpen} onClose={() => setBuilderOpen(false)}>
        {selectedExam ? (
          <div className={styles.builder}>
            <header className={styles.builderHeader}>
              <div>
                <strong>{selectedExam.title}</strong>
                <span>{selectedExam.questions?.length ?? 0} preguntas - {selectedExam.sections?.length ?? 0} secciones</span>
              </div>
              <div className={styles.builderActions}>
                <Button variant="secondary" size="sm" icon={<Upload size={15} aria-hidden />} onClick={() => void publishExam()}>
                  Publicar
                </Button>
                <Button size="sm" icon={<Send size={15} aria-hidden />} onClick={openAssignModal}>
                  Asignar
                </Button>
              </div>
            </header>
            <form className={styles.inlineForm} onSubmit={addSection}>
              <TextInput placeholder="Nueva seccion" value={sectionPayload.title} onChange={(event) => setSectionPayload((value) => ({ ...value, title: event.target.value }))} required />
              <TextInput placeholder="Orden" type="number" min="1" value={sectionPayload.sortOrder} onChange={(event) => setSectionPayload((value) => ({ ...value, sortOrder: event.target.value }))} required />
              <Button type="submit" icon={<ClipboardPlus size={15} aria-hidden />}>Seccion</Button>
            </form>
            <form className={styles.inlineForm} onSubmit={addQuestion}>
              <SelectInput value={questionPayload.sectionId} onChange={(event) => setQuestionPayload((value) => ({ ...value, sectionId: event.target.value }))}>
                <option value="">Sin seccion</option>
                {selectedExam.sections?.map((section) => (
                  <option key={section.id} value={section.id}>{section.title}</option>
                ))}
              </SelectInput>
              <SelectInput required value={questionPayload.questionId} onChange={(event) => setQuestionPayload((value) => ({ ...value, questionId: event.target.value }))}>
                <option value="">Pregunta</option>
                {questions.map((question) => (
                  <option key={question.id} value={question.id}>{question.prompt.slice(0, 80)}</option>
                ))}
              </SelectInput>
              <TextInput placeholder="Orden" type="number" min="1" value={questionPayload.sortOrder} onChange={(event) => setQuestionPayload((value) => ({ ...value, sortOrder: event.target.value }))} required />
              <TextInput placeholder="Puntos" type="number" min="0" value={questionPayload.points} onChange={(event) => setQuestionPayload((value) => ({ ...value, points: event.target.value }))} required />
              <Button type="submit" icon={<Plus size={15} aria-hidden />}>Pregunta</Button>
            </form>
            <ul className={styles.examItems}>
              {(selectedExam.questions ?? []).map((item) => (
                <li key={item.id}>
                  <strong>{item.question?.prompt ?? item.questionId}</strong>
                  <span>{item.section?.title ?? "Sin seccion"} - {item.points} pts</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Modal>
      <Modal title="Asignar examen" open={assignOpen} onClose={() => setAssignOpen(false)}>
        <form className={styles.form} onSubmit={assignExam}>
          <div className={styles.assignmentSummary}>
            <Users size={18} aria-hidden />
            <div>
              <strong>{assignmentPayload.allStudents ? "Todos los alumnos activos" : `${assignmentPayload.userIds.length} alumno(s) seleccionado(s)`}</strong>
              <span>Las asignaciones existentes se omiten automaticamente.</span>
            </div>
          </div>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={assignmentPayload.allStudents}
              onChange={(event) =>
                setAssignmentPayload((value) => ({
                  ...value,
                  allStudents: event.target.checked,
                  userIds: event.target.checked ? studentUsers.map((user) => user.id) : [],
                }))
              }
            />
            <span>Seleccionar todos los alumnos activos</span>
          </label>
          <div className={styles.studentList} aria-disabled={assignmentPayload.allStudents}>
            {studentUsers.map((user) => (
              <label key={user.id} className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={assignmentPayload.allStudents || assignmentPayload.userIds.includes(user.id)}
                  disabled={assignmentPayload.allStudents}
                  onChange={(event) => toggleAssignmentUser(user.id, event.target.checked)}
                />
                <span>{user.email}</span>
              </label>
            ))}
            {studentUsers.length === 0 ? <span className={styles.emptyText}>No hay alumnos activos disponibles.</span> : null}
          </div>
          <div className={styles.twoCols}>
            <Field label="Inicio">
              <TextInput type="datetime-local" value={assignmentPayload.startsAt} onChange={(event) => setAssignmentPayload((value) => ({ ...value, startsAt: event.target.value }))} />
            </Field>
            <Field label="Vence">
              <TextInput type="datetime-local" value={assignmentPayload.dueAt} onChange={(event) => setAssignmentPayload((value) => ({ ...value, dueAt: event.target.value }))} />
            </Field>
          </div>
          <Button type="submit" disabled={!assignmentPayload.allStudents && assignmentPayload.userIds.length === 0}>
            Asignar
          </Button>
        </form>
      </Modal>
    </>
  );
}
