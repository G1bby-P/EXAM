"use client";

import { FileUp, ImagePlus, Paperclip, Plus, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/StatusState";
import { adminApi, createResource, deleteResource } from "@/lib/resources";
import type {
  Alternative,
  Paginated,
  Question,
  QuestionImportResult,
  QuestionMediaType,
  QuestionType,
  Topic,
} from "@/types/api";
import styles from "./questions.module.css";

const questionTypes: Array<{ value: QuestionType; label: string }> = [
  { value: "SINGLE_CHOICE", label: "Opcion multiple" },
  { value: "TRUE_FALSE", label: "Verdadero/Falso" },
  { value: "MULTIPLE_CHOICE", label: "Seleccion multiple" },
  { value: "ESSAY", label: "Desarrollo" },
  { value: "SHORT_TEXT", label: "Respuesta corta" },
  { value: "FILE_UPLOAD", label: "Carga de archivo" },
  { value: "CLINICAL_CASE", label: "Caso clinico" },
];

const mediaTypes: Array<{ value: QuestionMediaType; label: string }> = [
  { value: "IMAGE", label: "Imagen" },
  { value: "VIDEO", label: "Video" },
  { value: "AUDIO", label: "Audio" },
  { value: "PDF", label: "PDF" },
];

const objectiveQuestionTypes = new Set<QuestionType>(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"]);

function emptyQuestionPayload() {
  return {
    topicId: "",
    type: "SINGLE_CHOICE" as QuestionType,
    status: "DRAFT",
    prompt: "",
    explanation: "",
    defaultPoints: "1",
    difficulty: "1",
    allowPartialCredit: "false",
    clinicalCaseTitle: "",
    clinicalCaseText: "",
    clinicalCaseSummary: "",
    clinicalCaseDiagnosis: "",
    mediaType: "IMAGE" as QuestionMediaType,
    mediaTitle: "",
    mediaDescription: "",
    mediaUrl: "",
  };
}

function defaultAlternatives() {
  return ["A", "B", "C", "D"].map((label, index) => ({
    label,
    text: "",
    isCorrect: index === 0 ? "true" : "false",
    sortOrder: String(index + 1),
  }));
}

function trueFalseAlternatives() {
  return [
    { label: "V", text: "Verdadero", isCorrect: "true", sortOrder: "1" },
    { label: "F", text: "Falso", isCorrect: "false", sortOrder: "2" },
  ];
}

function typeLabel(type: QuestionType) {
  return questionTypes.find((item) => item.value === type)?.label ?? type.replaceAll("_", " ");
}

export default function QuestionsPage() {
  const [data, setData] = useState<Paginated<Question> | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<QuestionImportResult | null>(null);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [alternativeOpen, setAlternativeOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [questionPayload, setQuestionPayload] = useState(emptyQuestionPayload);
  const [draftAlternatives, setDraftAlternatives] = useState(defaultAlternatives);
  const [alternativePayload, setAlternativePayload] = useState({
    label: "",
    text: "",
    isCorrect: "false",
    sortOrder: "1",
    feedback: "",
  });
  const [mediaPayload, setMediaPayload] = useState({
    mediaType: "IMAGE" as QuestionMediaType,
    title: "",
    description: "",
    url: "",
    sortOrder: "1",
  });

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.questions({ page: 1, limit: 50 });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las preguntas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    adminApi
      .topics({ page: 1, limit: 100 })
      .then((result) => setTopics(result.items))
      .catch(() => undefined);
  }, []);

  function resetQuestionForm() {
    setQuestionPayload(emptyQuestionPayload());
    setDraftAlternatives(defaultAlternatives());
  }

  function changeQuestionType(type: QuestionType) {
    setQuestionPayload((value) => ({
      ...value,
      type,
      allowPartialCredit: type === "MULTIPLE_CHOICE" ? value.allowPartialCredit : "false",
    }));
    setDraftAlternatives(type === "TRUE_FALSE" ? trueFalseAlternatives() : defaultAlternatives());
  }

  function updateDraftAlternative(index: number, field: "text" | "isCorrect", value: string) {
    setDraftAlternatives((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)));
  }

  async function createQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const hasClinicalCase =
        questionPayload.clinicalCaseTitle.trim() !== "" || questionPayload.clinicalCaseText.trim() !== "";
      const hasMedia = questionPayload.mediaUrl.trim() !== "" || questionPayload.mediaTitle.trim() !== "";
      await createResource("/questions", {
        topicId: questionPayload.topicId || undefined,
        type: questionPayload.type,
        status: questionPayload.status,
        prompt: questionPayload.prompt,
        explanation: questionPayload.explanation || undefined,
        defaultPoints: Number(questionPayload.defaultPoints),
        difficulty: questionPayload.difficulty ? Number(questionPayload.difficulty) : undefined,
        allowPartialCredit: questionPayload.allowPartialCredit === "true",
        alternatives: objectiveQuestionTypes.has(questionPayload.type)
          ? draftAlternatives
              .filter((alternative) => alternative.text.trim() !== "")
              .map((alternative) => ({
                label: alternative.label,
                text: alternative.text,
                isCorrect: alternative.isCorrect === "true",
                sortOrder: Number(alternative.sortOrder),
              }))
          : undefined,
        clinicalCase: hasClinicalCase
          ? {
              title: questionPayload.clinicalCaseTitle,
              patientContext: questionPayload.clinicalCaseText,
              summary: questionPayload.clinicalCaseSummary || undefined,
              diagnosis: questionPayload.clinicalCaseDiagnosis || undefined,
            }
          : undefined,
        media: hasMedia
          ? [
              {
                mediaType: questionPayload.mediaType,
                title: questionPayload.mediaTitle || undefined,
                description: questionPayload.mediaDescription || undefined,
                url: questionPayload.mediaUrl || undefined,
                sortOrder: 1,
              },
            ]
          : undefined,
      });
      setQuestionOpen(false);
      resetQuestionForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la pregunta.");
    }
  }

  async function createAlternative(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedQuestion) return;
    setError(null);
    try {
      await createResource(`/questions/${selectedQuestion.id}/alternatives`, {
        ...alternativePayload,
        isCorrect: alternativePayload.isCorrect === "true",
        sortOrder: Number(alternativePayload.sortOrder),
      });
      setAlternativePayload({ label: "", text: "", isCorrect: "false", sortOrder: "1", feedback: "" });
      setAlternativeOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la alternativa.");
    }
  }

  async function createMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedQuestion) return;
    setError(null);
    try {
      await createResource(`/questions/${selectedQuestion.id}/media`, {
        ...mediaPayload,
        sortOrder: Number(mediaPayload.sortOrder),
      });
      setMediaPayload({ mediaType: "IMAGE", title: "", description: "", url: "", sortOrder: "1" });
      setMediaOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar el medio.");
    }
  }

  async function importExcel(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const result = await adminApi.importQuestionsExcel(file);
      setImportResult(result);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo importar el archivo.");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  async function archiveQuestion(question: Question) {
    const confirmed = window.confirm(
      "La pregunta se eliminara del banco activo, pero quedara archivada para conservar el historial. ¿Deseas continuar?",
    );
    if (!confirmed) return;
    setError(null);
    try {
      await deleteResource(`/questions/${question.id}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la pregunta.");
    }
  }

  const columns: Column<Question>[] = [
    {
      key: "prompt",
      header: "Pregunta",
      render: (question) => (
        <div className={styles.questionCell}>
          <strong>{question.prompt}</strong>
          {question.clinicalCase ? <span>{question.clinicalCase.title}</span> : null}
        </div>
      ),
    },
    { key: "type", header: "Tipo", render: (question) => typeLabel(question.type) },
    { key: "topic", header: "Tema", render: (question) => question.topic?.title ?? "Sin tema" },
    { key: "status", header: "Estado", render: (question) => <Badge value={question.status} /> },
    { key: "points", header: "Puntos", render: (question) => question.defaultPoints },
    { key: "options", header: "Alternativas", render: (question) => question.options?.length ?? 0 },
    { key: "media", header: "Medios", render: (question) => question.media?.length ?? 0 },
    {
      key: "actions",
      header: "Acciones",
      render: (question) => (
        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Settings2 size={15} aria-hidden />}
            onClick={() => {
              setSelectedQuestion(question);
              setAlternativeOpen(true);
            }}
          >
            Alternativas
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Paperclip size={15} aria-hidden />}
            onClick={() => {
              setSelectedQuestion(question);
              setMediaOpen(true);
            }}
          >
            Medios
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 size={15} aria-hidden />}
            onClick={() => void archiveQuestion(question)}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Evaluacion"
        title="Banco de preguntas"
        description="Preguntas, alternativas, casos clinicos, adjuntos e importacion Excel."
        actions={
          <>
            <label className={styles.fileButton}>
              <FileUp size={16} aria-hidden />
              {importing ? "Importando..." : "Importar Excel"}
              <input type="file" accept=".xlsx,.xls" onChange={importExcel} disabled={importing} />
            </label>
            <Button variant="secondary" icon={<RefreshCw size={16} aria-hidden />} onClick={() => void refresh()}>
              Actualizar
            </Button>
            <Button icon={<Plus size={16} aria-hidden />} onClick={() => setQuestionOpen(true)}>
              Crear pregunta
            </Button>
          </>
        }
      />
      {error ? <ErrorState message={error} /> : null}
      {importResult ? (
        <div className={styles.importResult}>
          <strong>{importResult.created} creadas</strong>
          <span>{importResult.failed} filas con error</span>
          {importResult.errors.slice(0, 3).map((item) => (
            <span key={`${item.row}-${item.message}`}>Fila {item.row}: {item.message}</span>
          ))}
        </div>
      ) : null}
      {loading || !data ? <LoadingState /> : <DataTable columns={columns} rows={data.items} getRowKey={(question) => question.id} />}
      <Modal title="Crear pregunta" open={questionOpen} onClose={() => setQuestionOpen(false)}>
        <form className={styles.form} onSubmit={createQuestion}>
          <div className={styles.twoCols}>
            <Field label="Tema">
              <SelectInput value={questionPayload.topicId} onChange={(event) => setQuestionPayload((value) => ({ ...value, topicId: event.target.value }))}>
                <option value="">Sin tema</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Tipo">
              <SelectInput value={questionPayload.type} onChange={(event) => changeQuestionType(event.target.value as QuestionType)}>
                {questionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <Field label="Texto de pregunta">
            <TextArea required value={questionPayload.prompt} onChange={(event) => setQuestionPayload((value) => ({ ...value, prompt: event.target.value }))} />
          </Field>
          <Field label="Explicacion">
            <TextArea value={questionPayload.explanation} onChange={(event) => setQuestionPayload((value) => ({ ...value, explanation: event.target.value }))} />
          </Field>
          <div className={styles.threeCols}>
            <Field label="Puntos">
              <TextInput type="number" min="0" value={questionPayload.defaultPoints} onChange={(event) => setQuestionPayload((value) => ({ ...value, defaultPoints: event.target.value }))} />
            </Field>
            <Field label="Dificultad">
              <TextInput type="number" min="1" max="5" value={questionPayload.difficulty} onChange={(event) => setQuestionPayload((value) => ({ ...value, difficulty: event.target.value }))} />
            </Field>
            <Field label="Credito parcial">
              <SelectInput value={questionPayload.allowPartialCredit} onChange={(event) => setQuestionPayload((value) => ({ ...value, allowPartialCredit: event.target.value }))}>
                <option value="false">No</option>
                <option value="true">Si</option>
              </SelectInput>
            </Field>
          </div>
          {objectiveQuestionTypes.has(questionPayload.type) ? (
            <div className={styles.formSection}>
              <span>Alternativas</span>
              {draftAlternatives.map((alternative, index) => (
                <div className={styles.alternativeRow} key={alternative.label}>
                  <strong>{alternative.label}</strong>
                  <TextInput value={alternative.text} onChange={(event) => updateDraftAlternative(index, "text", event.target.value)} />
                  <SelectInput value={alternative.isCorrect} onChange={(event) => updateDraftAlternative(index, "isCorrect", event.target.value)}>
                    <option value="false">No</option>
                    <option value="true">Correcta</option>
                  </SelectInput>
                </div>
              ))}
            </div>
          ) : null}
          <div className={styles.formSection}>
            <span>Caso clinico</span>
            <Field label="Titulo del caso">
              <TextInput value={questionPayload.clinicalCaseTitle} onChange={(event) => setQuestionPayload((value) => ({ ...value, clinicalCaseTitle: event.target.value }))} />
            </Field>
            <Field label="Contexto del paciente">
              <TextArea value={questionPayload.clinicalCaseText} onChange={(event) => setQuestionPayload((value) => ({ ...value, clinicalCaseText: event.target.value }))} />
            </Field>
            <div className={styles.twoCols}>
              <Field label="Resumen">
                <TextArea value={questionPayload.clinicalCaseSummary} onChange={(event) => setQuestionPayload((value) => ({ ...value, clinicalCaseSummary: event.target.value }))} />
              </Field>
              <Field label="Diagnostico">
                <TextArea value={questionPayload.clinicalCaseDiagnosis} onChange={(event) => setQuestionPayload((value) => ({ ...value, clinicalCaseDiagnosis: event.target.value }))} />
              </Field>
            </div>
          </div>
          <div className={styles.formSection}>
            <span>Medio adjunto</span>
            <div className={styles.twoCols}>
              <Field label="Tipo de medio">
                <SelectInput value={questionPayload.mediaType} onChange={(event) => setQuestionPayload((value) => ({ ...value, mediaType: event.target.value as QuestionMediaType }))}>
                  {mediaTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="URL">
                <TextInput type="url" value={questionPayload.mediaUrl} onChange={(event) => setQuestionPayload((value) => ({ ...value, mediaUrl: event.target.value }))} />
              </Field>
            </div>
            <Field label="Titulo">
              <TextInput value={questionPayload.mediaTitle} onChange={(event) => setQuestionPayload((value) => ({ ...value, mediaTitle: event.target.value }))} />
            </Field>
            <Field label="Descripcion">
              <TextArea value={questionPayload.mediaDescription} onChange={(event) => setQuestionPayload((value) => ({ ...value, mediaDescription: event.target.value }))} />
            </Field>
          </div>
          <Button type="submit">Guardar</Button>
        </form>
      </Modal>
      <Modal title="Agregar alternativa" open={alternativeOpen} onClose={() => setAlternativeOpen(false)}>
        <form className={styles.form} onSubmit={createAlternative}>
          {selectedQuestion ? (
            <div className={styles.context}>
              <strong>{selectedQuestion.prompt}</strong>
              <ul>
                {(selectedQuestion.options ?? []).map((option: Alternative) => (
                  <li key={option.id}>
                    {option.label ?? option.sortOrder}. {option.text} {option.isCorrect ? "(correcta)" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className={styles.twoCols}>
            <Field label="Etiqueta">
              <TextInput value={alternativePayload.label} onChange={(event) => setAlternativePayload((value) => ({ ...value, label: event.target.value }))} />
            </Field>
            <Field label="Orden">
              <TextInput type="number" min="1" value={alternativePayload.sortOrder} onChange={(event) => setAlternativePayload((value) => ({ ...value, sortOrder: event.target.value }))} />
            </Field>
          </div>
          <Field label="Texto">
            <TextArea required value={alternativePayload.text} onChange={(event) => setAlternativePayload((value) => ({ ...value, text: event.target.value }))} />
          </Field>
          <Field label="Correcta">
            <SelectInput value={alternativePayload.isCorrect} onChange={(event) => setAlternativePayload((value) => ({ ...value, isCorrect: event.target.value }))}>
              <option value="false">No</option>
              <option value="true">Si</option>
            </SelectInput>
          </Field>
          <Field label="Retroalimentacion">
            <TextArea value={alternativePayload.feedback} onChange={(event) => setAlternativePayload((value) => ({ ...value, feedback: event.target.value }))} />
          </Field>
          <Button type="submit">Guardar alternativa</Button>
        </form>
      </Modal>
      <Modal title="Agregar medio" open={mediaOpen} onClose={() => setMediaOpen(false)}>
        <form className={styles.form} onSubmit={createMedia}>
          {selectedQuestion ? (
            <div className={styles.context}>
              <strong>{selectedQuestion.prompt}</strong>
              <ul>
                {(selectedQuestion.media ?? []).map((item) => (
                  <li key={item.id}>
                    {item.sortOrder}. {item.mediaType} {item.title ? `- ${item.title}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className={styles.twoCols}>
            <Field label="Tipo">
              <SelectInput value={mediaPayload.mediaType} onChange={(event) => setMediaPayload((value) => ({ ...value, mediaType: event.target.value as QuestionMediaType }))}>
                {mediaTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Orden">
              <TextInput type="number" min="1" value={mediaPayload.sortOrder} onChange={(event) => setMediaPayload((value) => ({ ...value, sortOrder: event.target.value }))} />
            </Field>
          </div>
          <Field label="URL">
            <TextInput required type="url" value={mediaPayload.url} onChange={(event) => setMediaPayload((value) => ({ ...value, url: event.target.value }))} />
          </Field>
          <Field label="Titulo">
            <TextInput value={mediaPayload.title} onChange={(event) => setMediaPayload((value) => ({ ...value, title: event.target.value }))} />
          </Field>
          <Field label="Descripcion">
            <TextArea value={mediaPayload.description} onChange={(event) => setMediaPayload((value) => ({ ...value, description: event.target.value }))} />
          </Field>
          <Button type="submit" icon={<ImagePlus size={16} aria-hidden />}>Guardar medio</Button>
        </form>
      </Modal>
    </>
  );
}
