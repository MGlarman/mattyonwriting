"use client";
import { useActionState } from "react";
import { BookMarked, BookOpen, CheckCircle2, X } from "lucide-react";
import { setReadingStatusAction } from "@/app/actions";
import type { ReadingStatusValue } from "@/lib/reading-list";

const options = [
  { value: "TO_READ", label: "To read", Icon: BookMarked },
  { value: "READING", label: "Reading", Icon: BookOpen },
  { value: "READ", label: "Read", Icon: CheckCircle2 },
] as const;
export function ReadingStatusPicker({ workId, status }: { workId: string; status: ReadingStatusValue | null }) {
  const [state, action, pending] = useActionState(setReadingStatusAction, {});
  return <form action={action} className="reading-status">
    <input type="hidden" name="workId" value={workId} />
    <div className="reading-status-buttons" role="group" aria-label="Add to a reading list">
      {options.map(({ value, label, Icon }) => <button key={value} name="status" value={value} disabled={pending} aria-pressed={status === value} className={status === value ? "active" : ""}><Icon size={16} />{label}</button>)}
      {status && <button name="status" value="NONE" disabled={pending} className="reading-status-clear" aria-label="Remove from my lists"><X size={15} /></button>}
    </div>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
  </form>;
}
