import { AlertTriangle, Loader2 } from "lucide-react";
import styles from "./ui.module.css";

export function LoadingState({ label = "Cargando" }: { label?: string }) {
  return (
    <div className={styles.state}>
      <Loader2 className={styles.spin} size={20} aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className={[styles.state, styles.error].join(" ")}>
      <AlertTriangle size={20} aria-hidden />
      <span>{message}</span>
    </div>
  );
}
