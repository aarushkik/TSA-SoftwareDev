import type { SessionRecord } from "@/lib/types";

const WEEKS = 17;
const dayKey = (d: Date) => d.toDateString();

function levelClass(count: number): string {
  if (count === 0) return "bg-slate-100";
  if (count === 1) return "bg-teal-200";
  if (count === 2) return "bg-teal-400";
  return "bg-teal-600";
}

/** A GitHub-style calendar of practice activity over the last several weeks. */
export default function PracticeHeatmap({ sessions }: { sessions: SessionRecord[] }) {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    const key = dayKey(new Date(s.completedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - WEEKS * 7);
  start.setDate(start.getDate() - start.getDay()); // back up to the preceding Sunday

  const weeks: Date[][] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex w-max gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => {
              const count = counts.get(dayKey(day)) ?? 0;
              const isFuture = day > today;
              return (
                <div
                  key={di}
                  title={
                    isFuture
                      ? undefined
                      : `${day.toLocaleDateString(undefined, { month: "short", day: "numeric" })}: ${count} session${count === 1 ? "" : "s"}`
                  }
                  className={`h-3 w-3 rounded-sm ${isFuture ? "bg-transparent" : levelClass(count)}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
        <span>Less</span>
        <span className="h-2.5 w-2.5 rounded-sm bg-slate-100" />
        <span className="h-2.5 w-2.5 rounded-sm bg-teal-200" />
        <span className="h-2.5 w-2.5 rounded-sm bg-teal-400" />
        <span className="h-2.5 w-2.5 rounded-sm bg-teal-600" />
        <span>More</span>
      </div>
    </div>
  );
}
