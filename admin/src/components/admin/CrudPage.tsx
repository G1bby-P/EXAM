"use client";

import { Plus, RefreshCw, Search } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import type { Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/StatusState";
import type { Paginated } from "@/types/api";
import { PageHeader } from "./PageHeader";
import styles from "./crud-page.module.css";

export interface FormField {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "number" | "textarea" | "select" | "datetime-local";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
}

interface CrudPageProps<T> {
  title: string;
  eyebrow?: string;
  description?: string;
  createLabel?: string;
  columns: Column<T>[];
  getRowKey: (item: T) => string;
  load: (params: { page: number; limit: number; search?: string }) => Promise<Paginated<T>>;
  create?: (payload: Record<string, unknown>) => Promise<unknown>;
  fields?: FormField[];
  extraActions?: ReactNode;
}

export function CrudPage<T>({
  title,
  eyebrow,
  description,
  createLabel = "Nuevo",
  columns,
  getRowKey,
  load,
  create,
  fields = [],
  extraActions,
}: CrudPageProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const emptyPayload = useMemo(() => {
    return fields.reduce<Record<string, string>>((acc, field) => {
      acc[field.name] = "";
      return acc;
    }, {});
  }, [fields]);
  const [payload, setPayload] = useState<Record<string, string>>(emptyPayload);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const result = await load({ page, limit, search: search || undefined });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [page]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void refresh();
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!create) return;
    setSubmitting(true);
    setError(null);
    const normalized = Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [key, value === "" ? undefined : value]),
    );
    try {
      await create(normalized);
      setPayload(emptyPayload);
      setModalOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el registro.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title={title}
        eyebrow={eyebrow}
        description={description}
        actions={
          <>
            {extraActions}
            <Button variant="secondary" icon={<RefreshCw size={16} aria-hidden />} onClick={() => void refresh()}>
              Actualizar
            </Button>
            {create ? (
              <Button icon={<Plus size={16} aria-hidden />} onClick={() => setModalOpen(true)}>
                {createLabel}
              </Button>
            ) : null}
          </>
        }
      />
      <form className={styles.toolbar} onSubmit={handleSearch}>
        <div className={styles.search}>
          <Search size={17} aria-hidden />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar" />
        </div>
        <Button variant="secondary" type="submit">
          Filtrar
        </Button>
      </form>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingState /> : <DataTable columns={columns} rows={items} getRowKey={getRowKey} />}
      <div className={styles.pagination}>
        <span>
          {total} registros - pagina {page} de {totalPages}
        </span>
        <div>
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            Anterior
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
      <Modal title={createLabel} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className={styles.form} onSubmit={handleCreate}>
          {fields.map((field) => (
            <Field key={field.name} label={field.label}>
              {field.type === "textarea" ? (
                <TextArea
                  required={field.required}
                  placeholder={field.placeholder}
                  value={payload[field.name] ?? ""}
                  onChange={(event) => setPayload((value) => ({ ...value, [field.name]: event.target.value }))}
                />
              ) : field.type === "select" ? (
                <SelectInput
                  required={field.required}
                  value={payload[field.name] ?? ""}
                  onChange={(event) => setPayload((value) => ({ ...value, [field.name]: event.target.value }))}
                >
                  <option value="">Seleccionar</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectInput>
              ) : (
                <TextInput
                  type={field.type ?? "text"}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={payload[field.name] ?? ""}
                  onChange={(event) => setPayload((value) => ({ ...value, [field.name]: event.target.value }))}
                />
              )}
            </Field>
          ))}
          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando" : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
