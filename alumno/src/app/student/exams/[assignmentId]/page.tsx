"use client";

import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Maximize2, Save, Send, ShieldAlert } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/student/PageHeader";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/StatusState";
import { TextArea } from "@/components/ui/Field";
import { clearStoredAttempt, loadStoredAttempt, storeAttempt } from "@/lib/attempt-storage";
import { formatDuration } from "@/lib/format";
import { studentApi } from "@/lib/resources";
import type { ExamAttempt, ExamQuestion, SaveAnswerPayload, SecurityEventSeverity, SecurityEventType } from "@/types/api";
import styles from "./exam.module.css";

const secondsPerQuestion = Number(process.env.NEXT_PUBLIC_SECONDS_PER_QUESTION ?? 60);
const autosaveIntervalSeconds = Number(process.env.NEXT_PUBLIC_AUTOSAVE_INTERVAL_SECONDS ?? 10);

function isObjective(question: ExamQuestion): boolean {
  return ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"].includes(question.type);
}

function normalizePayload(question: ExamQuestion, answer: SaveAnswerPayload | undefined): SaveAnswerPayload {
  if (!answer) return {};
  if (isObjective(question)) {
    return { selectedOptionIds: answer.selectedOptionIds ?? [] };
  }
  return { answerText: answer.answerText ?? "" };
}

export default function StudentExamPage() {
  const params = useParams<{ assignmentId: string }>();
  const router = useRouter();
  const assignmentId = params.assignmentId;
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, SaveAnswerPayload>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionSeconds, setQuestionSeconds] = useState(secondsPerQuestion);
  const [generalSeconds, setGeneralSeconds] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);
  const [securitySummary, setSecuritySummary] = useState({ warnings: 0, critical: 0 });
  const submittedRef = useRef(false);
  const lastSecurityEventAtRef = useRef<Record<string, number>>({});

  const questions = useMemo(() => attempt?.examVersion.questions ?? [], [attempt]);
  const currentQuestion = questions[currentIndex];
  const progress = questions.length === 0 ? 0 : Math.round(((currentIndex + 1) / questions.length) * 100);

  const recordSecurityEvent = useCallback(
    (eventType: SecurityEventType, severity: SecurityEventSeverity = "INFO", metadata: Record<string, unknown> = {}) => {
      if (!attempt || submittedRef.current) return;
      const now = Date.now();
      const lastEventAt = lastSecurityEventAtRef.current[eventType] ?? 0;
      if (now - lastEventAt < 1500) return;
      lastSecurityEventAtRef.current[eventType] = now;

      if (severity === "WARNING" || severity === "CRITICAL") {
        setSecuritySummary((current) => ({
          warnings: current.warnings + (severity === "WARNING" ? 1 : 0),
          critical: current.critical + (severity === "CRITICAL" ? 1 : 0),
        }));
      }

      void studentApi
        .recordSecurityEvent(attempt.id, {
          eventType,
          severity,
          occurredAt: new Date(now).toISOString(),
          metadata: {
            ...metadata,
            fullscreen: Boolean(document.fullscreenElement),
            visibilityState: document.visibilityState,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            questionId: currentQuestion?.id,
            questionIndex: currentIndex,
          },
        })
        .catch(() => undefined);
    },
    [attempt, currentIndex, currentQuestion?.id],
  );

  const requestFullscreen = useCallback(async () => {
    if (document.fullscreenElement) return;
    if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) {
      setSecurityNotice("El navegador no permite activar pantalla completa.");
      recordSecurityEvent("FULLSCREEN_EXITED", "WARNING", { reason: "fullscreen-not-supported" });
      return;
    }

    try {
      await document.documentElement.requestFullscreen();
      setSecurityNotice(null);
    } catch {
      setSecurityNotice("Activa pantalla completa para continuar el examen.");
      recordSecurityEvent("FULLSCREEN_EXITED", "WARNING", { reason: "fullscreen-request-rejected" });
    }
  }, [recordSecurityEvent]);

  useEffect(() => {
    let active = true;
    async function start() {
      setError(null);
      const stored = loadStoredAttempt(assignmentId);
      if (stored?.attempt.status === "IN_PROGRESS") {
        if (!active) return;
        setAttempt(stored.attempt);
        setAnswers(stored.answers);
        setCurrentIndex(Math.min(stored.currentIndex, Math.max(0, stored.attempt.examVersion.questions.length - 1)));
        return;
      }
      try {
        const createdAttempt = await studentApi.startAttempt(assignmentId);
        if (!active) return;
        setAttempt(createdAttempt);
        storeAttempt(assignmentId, {
          attempt: createdAttempt,
          answers: {},
          currentIndex: 0,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "No se pudo iniciar el examen.");
      }
    }
    void start();
    return () => {
      active = false;
    };
  }, [assignmentId]);

  useEffect(() => {
    if (!attempt) return;
    storeAttempt(assignmentId, {
      attempt,
      answers,
      currentIndex,
      updatedAt: new Date().toISOString(),
    });
  }, [answers, assignmentId, attempt, currentIndex]);

  useEffect(() => {
    if (!attempt?.expiresAt) {
      setGeneralSeconds(null);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.floor((new Date(attempt.expiresAt as string).getTime() - Date.now()) / 1000));
      setGeneralSeconds(remaining);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [attempt]);

  const submitAttempt = useCallback(
    async (reason: "manual" | "general-time" | "question-time") => {
      if (!attempt || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setError(null);
      try {
        if (currentQuestion) {
          await studentApi.saveAnswer(attempt.id, currentQuestion.id, normalizePayload(currentQuestion, answers[currentQuestion.id]));
        }
        const result = await studentApi.submitAttempt(attempt.id);
        clearStoredAttempt(assignmentId);
        router.replace(`/student/results?submitted=${result.id}&reason=${reason}`);
      } catch (err) {
        submittedRef.current = false;
        setError(err instanceof Error ? err.message : "No se pudo finalizar el examen.");
      } finally {
        setSubmitting(false);
      }
    },
    [answers, assignmentId, attempt, currentQuestion, router],
  );

  const saveCurrentAnswer = useCallback(async () => {
    if (!attempt || !currentQuestion || submittedRef.current) return;
    setSaving(true);
    setError(null);
    try {
      await studentApi.saveAnswer(attempt.id, currentQuestion.id, normalizePayload(currentQuestion, answers[currentQuestion.id]));
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la respuesta.");
    } finally {
      setSaving(false);
    }
  }, [answers, attempt, currentQuestion]);

  const goNext = useCallback(
    async (automatic = false) => {
      await saveCurrentAnswer();
      if (currentIndex >= questions.length - 1) {
        if (automatic) {
          await submitAttempt("question-time");
        }
        return;
      }
      setCurrentIndex((value) => value + 1);
      setQuestionSeconds(secondsPerQuestion);
    },
    [currentIndex, questions.length, saveCurrentAnswer, submitAttempt],
  );

  useEffect(() => {
    setQuestionSeconds(secondsPerQuestion);
  }, [currentIndex]);

  useEffect(() => {
    if (!attempt || submittedRef.current) return;
    const timer = window.setInterval(() => {
      setQuestionSeconds((value) => {
        if (value <= 1) {
          void goNext(true);
          return secondsPerQuestion;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, goNext]);

  useEffect(() => {
    if (!attempt || submittedRef.current) return;
    const timer = window.setInterval(() => {
      void saveCurrentAnswer();
    }, Math.max(3, autosaveIntervalSeconds) * 1000);
    return () => window.clearInterval(timer);
  }, [attempt, saveCurrentAnswer]);

  useEffect(() => {
    if (!attempt || submittedRef.current) return;
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (active) {
        setSecurityNotice(null);
        recordSecurityEvent("FULLSCREEN_ENTERED", "INFO");
      } else {
        setSecurityNotice("Pantalla completa desactivada. Activa pantalla completa para continuar.");
        recordSecurityEvent("FULLSCREEN_EXITED", "CRITICAL");
      }
    };

    const active = Boolean(document.fullscreenElement);
    setIsFullscreen(active);
    if (!active) setSecurityNotice("Activa pantalla completa para comenzar el examen.");
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [attempt, recordSecurityEvent]);

  useEffect(() => {
    if (!attempt || submittedRef.current) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void saveCurrentAnswer();
        recordSecurityEvent("TAB_HIDDEN", "CRITICAL");
      } else {
        recordSecurityEvent("TAB_VISIBLE", "INFO");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [attempt, recordSecurityEvent, saveCurrentAnswer]);

  useEffect(() => {
    if (!attempt || submittedRef.current) return;
    const handleBlur = () => recordSecurityEvent("WINDOW_BLUR", "WARNING");
    const handleFocus = () => recordSecurityEvent("WINDOW_FOCUS", "INFO");

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [attempt, recordSecurityEvent]);

  useEffect(() => {
    if (!attempt || submittedRef.current) return;
    const blockEvent = (event: Event, eventType: SecurityEventType, severity: SecurityEventSeverity = "WARNING") => {
      event.preventDefault();
      recordSecurityEvent(eventType, severity, { source: event.type });
    };
    const handleCopy = (event: ClipboardEvent) => blockEvent(event, "COPY_BLOCKED");
    const handlePaste = (event: ClipboardEvent) => blockEvent(event, "PASTE_BLOCKED");
    const handleCut = (event: ClipboardEvent) => blockEvent(event, "CUT_BLOCKED");
    const handleContextMenu = (event: MouseEvent) => blockEvent(event, "CONTEXT_MENU_BLOCKED");
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const modifierPressed = event.ctrlKey || event.metaKey;
      const clipboardShortcut = modifierPressed && ["c", "v", "x"].includes(key);
      const printShortcut = (modifierPressed && key === "p") || event.key === "PrintScreen";
      const inspectionShortcut =
        event.key === "F12" || (modifierPressed && event.shiftKey && ["c", "i", "j"].includes(key)) || (modifierPressed && key === "u");
      const insertClipboardShortcut = event.key === "Insert" && (event.ctrlKey || event.shiftKey);
      if (!clipboardShortcut && !printShortcut && !inspectionShortcut && !insertClipboardShortcut) return;

      event.preventDefault();
      recordSecurityEvent(printShortcut ? "PRINT_BLOCKED" : "KEYBOARD_SHORTCUT_BLOCKED", printShortcut ? "CRITICAL" : "WARNING", {
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      });
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [attempt, recordSecurityEvent]);

  useEffect(() => {
    if (generalSeconds === 0 && attempt && !submittedRef.current) {
      void submitAttempt("general-time");
    }
  }, [attempt, generalSeconds, submitAttempt]);

  function updateAnswer(question: ExamQuestion, value: SaveAnswerPayload) {
    setAnswers((current) => ({
      ...current,
      [question.id]: value,
    }));
  }

  if (error && !attempt) return <ErrorState message={error} />;
  if (!attempt || !currentQuestion) return <LoadingState label="Preparando examen" />;

  const currentAnswer = answers[currentQuestion.id] ?? {};

  return (
    <>
      <PageHeader
        title={attempt.examVersion.title}
        description={attempt.examVersion.instructions ?? "Responde cada pregunta antes de avanzar."}
        actions={
          <Button variant="danger" icon={<Send size={16} aria-hidden />} disabled={submitting} onClick={() => void submitAttempt("manual")}>
            Finalizar
          </Button>
        }
      />
      <section className={styles.timers}>
        <div>
          <Clock size={18} aria-hidden />
          <span>Tiempo general</span>
          <strong>{generalSeconds === null ? "Sin limite" : formatDuration(generalSeconds)}</strong>
        </div>
        <div>
          <Clock size={18} aria-hidden />
          <span>Pregunta actual</span>
          <strong>{formatDuration(questionSeconds)}</strong>
        </div>
        <div>
          <CheckCircle2 size={18} aria-hidden />
          <span>Guardado</span>
          <strong>{saving ? "Guardando" : lastSavedAt ? "Guardado" : "Pendiente"}</strong>
        </div>
      </section>
      {error ? (
        <div className={styles.inlineError}>
          <AlertTriangle size={18} aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}
      <section className={styles.securityPanel}>
        <div>
          <ShieldAlert size={18} aria-hidden />
          <span>Modo seguro</span>
          <strong>{isFullscreen ? "Activo" : "Pendiente"}</strong>
        </div>
        <div>
          <AlertTriangle size={18} aria-hidden />
          <span>Eventos</span>
          <strong>{securitySummary.critical + securitySummary.warnings}</strong>
        </div>
        <Button variant="secondary" icon={<Maximize2 size={16} aria-hidden />} disabled={isFullscreen} onClick={() => void requestFullscreen()}>
          {isFullscreen ? "Pantalla completa activa" : "Pantalla completa"}
        </Button>
      </section>
      {securityNotice ? (
        <div className={styles.securityNotice}>
          <AlertTriangle size={18} aria-hidden />
          <span>{securityNotice}</span>
        </div>
      ) : null}
      {!isFullscreen ? (
        <section className={styles.securityGate}>
          <ShieldAlert size={44} aria-hidden />
          <div>
            <h2>Modo seguro requerido</h2>
            <p>Activa pantalla completa para responder el examen.</p>
          </div>
          <Button icon={<Maximize2 size={16} aria-hidden />} onClick={() => void requestFullscreen()}>
            Activar pantalla completa
          </Button>
        </section>
      ) : (
      <section className={styles.exam}>
        <aside className={styles.sidebar}>
          <div className={styles.progress}>
            <span>
              Pregunta {currentIndex + 1} de {questions.length}
            </span>
            <div>
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>
          <ol className={styles.questionNav}>
            {questions.map((question, index) => (
              <li key={question.id}>
                <button
                  className={index === currentIndex ? styles.active : ""}
                  onClick={() => {
                    void saveCurrentAnswer();
                    setCurrentIndex(index);
                  }}
                >
                  {index + 1}
                </button>
              </li>
            ))}
          </ol>
        </aside>
        <article className={styles.question}>
          <div className={styles.questionMeta}>
            <span>{currentQuestion.type.replaceAll("_", " ")}</span>
            <span>{currentQuestion.points} pts</span>
          </div>
          <h2>{currentQuestion.prompt}</h2>
          {isObjective(currentQuestion) ? (
            <div className={styles.options}>
              {(currentQuestion.optionsSnapshot ?? []).map((option) => {
                const selected = currentAnswer.selectedOptionIds?.includes(option.id) ?? false;
                return (
                  <label key={option.id} className={selected ? styles.selectedOption : ""}>
                    <input
                      type={currentQuestion.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
                      name={currentQuestion.id}
                      checked={selected}
                      onChange={(event) => {
                        if (currentQuestion.type === "MULTIPLE_CHOICE") {
                          const previous = currentAnswer.selectedOptionIds ?? [];
                          const next = event.target.checked
                            ? Array.from(new Set([...previous, option.id]))
                            : previous.filter((id) => id !== option.id);
                          updateAnswer(currentQuestion, { selectedOptionIds: next });
                        } else {
                          updateAnswer(currentQuestion, { selectedOptionIds: [option.id] });
                        }
                      }}
                    />
                    <span>{option.label ? `${option.label}. ` : ""}{option.text}</span>
                  </label>
                );
              })}
            </div>
          ) : currentQuestion.type === "FILE_UPLOAD" ? (
            <div className={styles.unsupported}>
              La carga de archivos depende del modulo de archivos del backend. Usa el campo de texto si el administrador lo habilito como respuesta descriptiva.
            </div>
          ) : (
            <TextArea
              value={currentAnswer.answerText ?? ""}
              onChange={(event) => updateAnswer(currentQuestion, { answerText: event.target.value })}
              placeholder="Escribe tu respuesta"
            />
          )}
          <footer className={styles.actions}>
            <Button
              variant="secondary"
              icon={<ChevronLeft size={16} aria-hidden />}
              disabled={currentIndex === 0}
              onClick={() => {
                void saveCurrentAnswer();
                setCurrentIndex((value) => Math.max(0, value - 1));
              }}
            >
              Anterior
            </Button>
            <Button variant="secondary" icon={<Save size={16} aria-hidden />} onClick={() => void saveCurrentAnswer()}>
              Guardar
            </Button>
            {currentIndex >= questions.length - 1 ? (
              <Button icon={<Send size={16} aria-hidden />} disabled={submitting} onClick={() => void submitAttempt("manual")}>
                Finalizar examen
              </Button>
            ) : (
              <Button icon={<ChevronRight size={16} aria-hidden />} onClick={() => void goNext(false)}>
                Siguiente
              </Button>
            )}
          </footer>
        </article>
      </section>
      )}
    </>
  );
}
