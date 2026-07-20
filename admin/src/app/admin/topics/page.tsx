"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import type { Column } from "@/components/ui/DataTable";
import { CrudPage, type FormField } from "@/components/admin/CrudPage";
import { adminApi, createResource, deleteResource } from "@/lib/resources";
import type { Course, Topic } from "@/types/api";

const columns: Column<Topic>[] = [
  { key: "title", header: "Tema", render: (topic) => <strong>{topic.title}</strong> },
  { key: "course", header: "Curso", render: (topic) => topic.course?.title ?? topic.courseId },
  { key: "order", header: "Orden", render: (topic) => topic.sortOrder },
  { key: "status", header: "Estado", render: (topic) => <Badge value={topic.status} /> },
];

export default function TopicsPage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    adminApi.courses({ page: 1, limit: 100 }).then((result) => setCourses(result.items)).catch(() => undefined);
  }, []);

  const fields: FormField[] = [
    {
      name: "courseId",
      label: "Curso",
      type: "select",
      required: true,
      options: courses.map((course) => ({ label: course.title, value: course.id })),
    },
    { name: "title", label: "Titulo", required: true },
    { name: "slug", label: "Slug" },
    { name: "description", label: "Descripcion", type: "textarea" },
    { name: "sortOrder", label: "Orden", type: "number", required: true },
  ];

  return (
    <CrudPage<Topic>
      eyebrow="Academico"
      title="Temas"
      description="Unidades de contenido dentro de cada curso para clasificar preguntas y examenes."
      columns={columns}
      getRowKey={(topic) => topic.id}
      load={adminApi.topics}
      createLabel="Crear tema"
      create={(payload) => createResource("/topics", payload)}
      archive={(topic) => deleteResource(`/topics/${topic.id}`)}
      archiveConfirmMessage={(topic) =>
        `El tema "${topic.title}" se eliminara de la vista activa, pero quedara archivado para conservar historial. ¿Deseas continuar?`
      }
      fields={fields}
    />
  );
}
