"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, EditIcon, EyeIcon } from "@/components/icons";
import { CLIENT_VIDEOS, type ClientVideo } from "@/lib/clientData";
import { formatTime } from "@/lib/watch/format";

type ViewMode = "month" | "week";

export function CalendarView() {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

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
  const videosByDate: Record<string, ClientVideo[]> = {};
  for (const v of CLIENT_VIDEOS) {
    const d = new Date(v.scheduledAt || v.publishedAt);
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
                    const isScheduled = v.status === "scheduled" || (v.scheduledAt && new Date(v.scheduledAt) > new Date());
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
                        <span className="mr-1">{isScheduled ? "⏳" : "🎬"}</span>
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
