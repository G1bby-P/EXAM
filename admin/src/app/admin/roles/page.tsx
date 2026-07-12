"use client";

import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ErrorState, LoadingState } from "@/components/ui/StatusState";
import { adminApi } from "@/lib/resources";
import type { Role } from "@/types/api";
import { useEffect, useState } from "react";

const columns: Column<Role>[] = [
  { key: "code", header: "Codigo", render: (role) => <strong>{role.code}</strong> },
  { key: "name", header: "Nombre", render: (role) => role.name },
  { key: "description", header: "Descripcion", render: (role) => role.description ?? "Sin descripcion" },
];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .roles()
      .then(setRoles)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los roles."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Seguridad"
        title="Roles"
        description="Catalogo de permisos base usados por el backend para proteger rutas administrativas."
      />
      {error ? <ErrorState message={error} /> : loading ? <LoadingState /> : <DataTable columns={columns} rows={roles} getRowKey={(role) => role.id} />}
    </>
  );
}
