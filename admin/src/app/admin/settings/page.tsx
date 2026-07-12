"use client";

import { CheckCircle2, RefreshCw, ServerCog } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/StatusState";
import { adminApi } from "@/lib/resources";
import { formatDate } from "@/lib/format";
import styles from "./settings.module.css";

interface Health {
  status: string;
  timestamp: string;
}

export default function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.health();
      setHealth(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo verificar el backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Sistema"
        title="Configuracion"
        description="Estado de conexion con la API y parametros publicos usados por el panel."
        actions={
          <Button variant="secondary" icon={<RefreshCw size={16} aria-hidden />} onClick={() => void refresh()}>
            Verificar
          </Button>
        }
      />
      {error ? <ErrorState message={error} /> : null}
      {loading ? (
        <LoadingState />
      ) : (
        <section className={styles.grid}>
          <article className={styles.card}>
            <ServerCog size={22} aria-hidden />
            <span>API base</span>
            <strong>{process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1"}</strong>
          </article>
          <article className={styles.card}>
            <CheckCircle2 size={22} aria-hidden />
            <span>Health</span>
            <strong>{health?.status ?? "N/A"}</strong>
            <small>{formatDate(health?.timestamp)}</small>
          </article>
        </section>
      )}
    </>
  );
}
