"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";
import styles from "./ui.module.css";

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, open, onClose, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} icon={<X size={18} aria-hidden />} aria-label="Cerrar" />
        </div>
        {children}
      </div>
    </div>
  );
}
