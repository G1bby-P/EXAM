"use client";

import { Badge } from "@/components/ui/Badge";
import type { Column } from "@/components/ui/DataTable";
import { CrudPage } from "@/components/admin/CrudPage";
import { adminApi, createResource } from "@/lib/resources";
import type { Course } from "@/types/api";

const columns: Column<Course>[] = [
  { key: "title", header: "Curso", render: (course) => <strong>{course.title}</strong> },
  { key: "slug", header: "Slug", render: (course) => course.slug },
  { key: "topics", header: "Temas", render: (course) => course.topics?.length ?? 0 },
  { key: "status", header: "Estado", render: (course) => <Badge value={course.status} /> },
];

export default function CoursesPage() {
  return (
    <CrudPage<Course>
      eyebrow="Academico"
      title="Cursos"
      description="Agrupadores principales del contenido academico y de evaluacion."
      columns={columns}
      getRowKey={(course) => course.id}
      load={adminApi.courses}
      createLabel="Crear curso"
      create={(payload) => createResource("/courses", payload)}
      fields={[
        { name: "title", label: "Titulo", required: true },
        { name: "slug", label: "Slug" },
        { name: "description", label: "Descripcion", type: "textarea" },
        {
          name: "status",
          label: "Estado",
          type: "select",
          options: [
            { label: "Borrador", value: "DRAFT" },
            { label: "Activo", value: "ACTIVE" },
          ],
        },
      ]}
    />
  );
}
