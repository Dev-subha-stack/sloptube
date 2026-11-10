import { create } from "zustand";

export type BugReport = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_review" | "resolved" | "dismissed";
  createdAt: number;
};

type BugReportState = {
  reports: BugReport[];
  loaded: boolean;
  load: () => void;
  addReport: (title: string, description: string) => void;
  getMyReports: () => BugReport[];
  updateStatus: (id: string, status: BugReport["status"]) => void;
};

const STORAGE_KEY = "sloptube-bug-reports";

function readStorage(): BugReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BugReport[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(reports: BugReport[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // Storage full or unavailable.
  }
}

export const useBugReports = create<BugReportState>((set, get) => ({
  reports: [],
  loaded: false,
  load: () => {
    if (get().loaded) return;
    set({ reports: readStorage(), loaded: true });
  },
  addReport: (title, description) => {
    const report: BugReport = {
      id: crypto.randomUUID(),
      title,
      description,
      status: "pending",
      createdAt: Date.now(),
    };
    const next = [report, ...get().reports];
    writeStorage(next);
    set({ reports: next });
  },
  getMyReports: () => get().reports,
  updateStatus: (id, status) => {
    const next = get().reports.map((r) => (r.id === id ? { ...r, status } : r));
    writeStorage(next);
    set({ reports: next });
  },
}));
