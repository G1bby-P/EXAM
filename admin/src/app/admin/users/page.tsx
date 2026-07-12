"use client";

import { Badge } from "@/components/ui/Badge";
import type { Column } from "@/components/ui/DataTable";
import { CrudPage } from "@/components/admin/CrudPage";
import { adminApi, createResource } from "@/lib/resources";
import { formatDate, fullName } from "@/lib/format";
import type { User } from "@/types/api";

const columns: Column<User>[] = [
  { key: "name", header: "Usuario", render: (user) => <strong>{fullName(user.firstName, user.lastName)}</strong> },
  { key: "email", header: "Correo", render: (user) => user.email },
  { key: "roles", header: "Roles", render: (user) => user.roles.join(", ") || "Sin rol" },
  { key: "status", header: "Estado", render: (user) => <Badge value={user.status} /> },
  { key: "login", header: "Ultimo acceso", render: (user) => formatDate(user.lastLoginAt) },
];

export default function UsersPage() {
  return (
    <CrudPage<User>
      eyebrow="Seguridad"
      title="Usuarios"
      description="Gestion de cuentas administrativas, revisores y estudiantes registrados."
      columns={columns}
      getRowKey={(user) => user.id}
      load={adminApi.users}
      createLabel="Crear usuario"
      create={(payload) =>
        createResource("/users", {
          ...payload,
          roles: payload.roles ? [payload.roles] : ["STUDENT"],
        })
      }
      fields={[
        { name: "email", label: "Correo", type: "email", required: true },
        { name: "password", label: "Contrasena inicial", type: "password", required: true },
        { name: "firstName", label: "Nombre" },
        { name: "lastName", label: "Apellido" },
        {
          name: "roles",
          label: "Rol inicial",
          type: "select",
          options: [
            { label: "Administrador", value: "ADMIN" },
            { label: "Revisor", value: "REVIEWER" },
            { label: "Estudiante", value: "STUDENT" },
          ],
        },
        {
          name: "status",
          label: "Estado",
          type: "select",
          options: [
            { label: "Activo", value: "ACTIVE" },
            { label: "Invitado", value: "INVITED" },
            { label: "Inactivo", value: "INACTIVE" },
            { label: "Suspendido", value: "SUSPENDED" },
          ],
        },
      ]}
    />
  );
}
