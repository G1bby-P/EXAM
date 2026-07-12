"use client";

import { Activity, LogIn } from "lucide-react";
import { FormEvent, useState } from "react";
import { AuthProvider, useAuth } from "@/components/admin/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import styles from "./login.module.css";

function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@exam.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesion.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.brand}>
          <div className={styles.mark}>
            <Activity size={24} aria-hidden />
          </div>
          <div>
            <span>Exam Platform</span>
            <h1>Panel administrativo</h1>
          </div>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Field label="Correo">
            <TextInput value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </Field>
          <Field label="Contrasena">
            <TextInput value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
          </Field>
          {error ? <p className={styles.error}>{error}</p> : null}
          <Button type="submit" disabled={submitting} icon={<LogIn size={17} aria-hidden />}>
            {submitting ? "Ingresando" : "Ingresar"}
          </Button>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}
