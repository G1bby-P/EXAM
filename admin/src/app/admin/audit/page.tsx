"use client";

import { Badge } from "@/components/ui/Badge";
import type { Column } from "@/components/ui/DataTable";
import { CrudPage } from "@/components/admin/CrudPage";
import { formatDate } from "@/lib/format";
import { adminApi } from "@/lib/resources";
import type { AuditLog } from "@/types/api";

const columns: Column<AuditLog>[] = [
  { key: "action", header: "Accion", render: (log) => <strong>{log.action}</strong> },
  { key: "entity", header: "Entidad", render: (log) => <Badge value={log.entityType} /> },
  { key: "actor", header: "Actor", render: (log) => log.actor?.email ?? "Sistema" },
  { key: "ip", header: "IP", render: (log) => log.ipAddress ?? "N/A" },
  { key: "date", header: "Fecha", render: (log) => formatDate(log.createdAt) },
];

export default function AuditPage() {
  return (
    <CrudPage<AuditLog>
      eyebrow="Trazabilidad"
      title="Auditoria"
      description="Registro de acciones sensibles ejecutadas por administradores, revisores y procesos del sistema."
      columns={columns}
      getRowKey={(log) => log.id}
      load={adminApi.logs}
    />
  );
}
