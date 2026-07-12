import styles from "./ui.module.css";

const toneMap: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  PUBLISHED: "success",
  READY: "success",
  DRAFT: "warning",
  PENDING_REVIEW: "warning",
  INVITED: "warning",
  ARCHIVED: "neutral",
  INACTIVE: "neutral",
  DELETED: "danger",
  SUSPENDED: "danger",
  WITHHELD: "danger",
};

export function Badge({ value }: { value?: string | null }) {
  const label = value ?? "N/A";
  const tone = toneMap[label] ?? "neutral";
  return <span className={[styles.badge, styles[tone]].join(" ")}>{label.replaceAll("_", " ")}</span>;
}
