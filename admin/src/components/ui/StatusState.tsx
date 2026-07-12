import { AlertTriangle, Loader2 } from "lucide-react";
import styles from "./ui.module.css";

export function LoadingState({ label = "Cargando datos" }: { label?: string }) {
  return (
    <div className={styles.state}>
      <Loader2 size={20} aria-hidden className={styles.spin} />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className={[styles.state, styles.errorState].join(" ")}>
      <AlertTriangle size={20} aria-hidden />
      <span>{message}</span>
    </div>
  );
}
