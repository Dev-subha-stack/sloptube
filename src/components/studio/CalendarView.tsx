"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/store/session";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, EditIcon, EyeIcon } from "@/components/icons";

/** One of my uploads on the calendar: on its publish date, or its upload date while still a draft. */
type CalendarVideo = { id: string; title: string; date: string; draft: boolean; scheduled: boolean };
import { formatTime } from "@/lib/watch/format";

type ViewMode = "month" | "week";

export function CalendarView() {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const me = useSession((s) => s.user?.id ?? null);
  const [videos, setVideos] = useState<CalendarVideo[]>([]);

  useEffect(() => {
    if (!me) return;
    void supabase
      .from("videos")
      .select("id,title,created_at,published_at")
      .eq("owner_id", me)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        const now = Date.now();
        setVideos(
          ((data ?? []) as { id: string; title: string; created_at: string; published_at: string | null }[]).map((v) => ({
            id: v.id,
            title: v.title,
            date: v.published_at ?? v.created_at,
            draft: v.published_at === null,
            scheduled: v.published_at !== null && Date.parse(v.published_at) > now,
          })),
        );
      });
  }, [me]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation
  const prevPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      setCurrentDate(new Date(currentDate.getTime() - 7 * 86400000));
    }
  };

  const nextPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      setCurrentDate(new Date(currentDate.getTime() + 7 * 86400000));
    }
  };

  const today = () => setCurrentDate(new Date());

  // Month days computation
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  // Map videos to days
  const videosByDate: Record<string, CalendarVideo[]> = {};
  for (const v of videos) {
    const d = new Date(v.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!videosByDate[key]) videosByDate[key] = [];
    videosByDate[key].push(v);
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      {/* Header toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-divider pb-4 mb-6">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 text-[var(--studio-accent)]" />
          <h1 className="text-[22px] font-medium text-text">Content Calendar</h1>
          <span className="text-[14px] text-text-2">
            {monthName} {year}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-xs border border-divider overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 text-[13px] font-medium transition-colors ${
                viewMode === "month" ? "bg-[var(--active)] text-text" : "text-text-2 hover:bg-hover"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 text-[13px] font-medium transition-colors ${
                viewMode === "week" ? "bg-[var(--active)] text-text" : "text-text-2 hover:bg-hover"
              }`}
            >
              Week
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={today}
              className="px-3 py-1 text-[13px] font-medium text-text rounded-xs border border-divider hover:bg-hover"
            >
              Today
            </button>
            <button
              type="button"
              onClick={prevPeriod}
              className="grid h-8 w-8 place-items-center rounded-xs border border-divider text-icon hover:bg-hover"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={nextPeriod}
              className="grid h-8 w-8 place-items-center rounded-xs border border-divider text-icon hover:bg-hover"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Grid */}
      <div className="rounded-sm border border-divider bg-surface overflow-hidden shadow-xs">
        <div className="grid grid-cols-7 border-b border-divider bg-surface text-center py-2.5 text-[12px] font-semibold uppercase tracking-wider text-text-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-[minmax(120px,1fr)] divide-x divide-y divide-divider/60">
          {/* Empty prefix cells for month */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-skeleton/20 p-2 min-h-[110px]" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const key = `${year}-${month}-${dayNum}`;
            const dayVideos = videosByDate[key] || [];
            const isToday =
              new Date().getDate() === dayNum &&
              new Date().getMonth() === month &&
              new Date().getFullYear() === year;

            return (
              <div
                key={dayNum}
                className={`p-2 transition-colors min-h-[110px] flex flex-col justify-between ${
                  isToday ? "bg-[var(--studio-accent)]/5 font-semibold" : "hover:bg-hover/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[12px] inline-grid h-6 w-6 place-items-center rounded-full ${
                      isToday ? "bg-[var(--studio-accent)] text-white" : "text-text"
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayVideos.length > 0 && (
                    <span className="text-[10px] font-medium text-text-3">
                      {dayVideos.length} {dayVideos.length === 1 ? "video" : "videos"}
                    </span>
                  )}
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[85px]">
                  {dayVideos.map((v) => {
                    const isScheduled = v.scheduled || v.draft;
                    return (
                      <Link
                        key={v.id}
                        href={`/studio/video/${v.id}/edit`}
                        className={`block rounded-xs px-2 py-1 text-[11px] font-medium leading-tight truncate border transition-colors ${
                          isScheduled
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                            : "border-[var(--studio-accent)]/40 bg-[var(--studio-accent)]/10 text-[var(--studio-accent)] hover:bg-[var(--studio-accent)]/20"
                        }`}
                        title={v.title}
                      >
                        <span className="mr-1">{v.draft ? "Draft:" : v.scheduled ? "⏳" : "🎬"}</span>
                        {v.title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
