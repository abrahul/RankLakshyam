import { api } from "./client";

export const dashboardApi = {
  get: () => api.get<any>("/api/dashboard"),
};

export const categoriesApi = {
  list: () => api.get<any[]>("/api/categories"),
};

export const topicsApi = {
  list: (categoryId?: string) =>
    api.get<any[]>("/api/topics", categoryId ? { categoryId } : undefined),
};

export const subtopicsApi = {
  list: (topicId: string) => api.get<any[]>("/api/subtopics", { topicId }),
};

export const questionsApi = {
  list: (params: Record<string, string>) => api.get<any[]>("/api/questions", params),
};

export const sessionsApi = {
  create: (body: { type: string; questionIds: string[]; context?: any }) =>
    api.post<{ sessionId: string; resumed: boolean; currentIndex: number }>("/api/sessions", body),
};

export const attemptsApi = {
  submit: (body: {
    sessionId: string;
    questionId: string;
    selectedOption: string | null;
    timeTakenSec: number;
    action?: string;
  }) => api.post<any>("/api/attempts", body),
};

export const dailyChallengeApi = {
  get: () => api.get<any>("/api/daily-challenge"),
};

export const leaderboardApi = {
  get: (period: string = "daily") => api.get<any>("/api/leaderboard", { period }),
};

export const performanceApi = {
  get: () => api.get<any>("/api/performance"),
};

export const streaksApi = {
  get: () => api.get<any>("/api/streaks"),
};

export const weakAreasApi = {
  get: () => api.get<any>("/api/user/weak-areas"),
};

export const reviewApi = {
  get: (filter: string, page: number = 1, limit: number = 20) =>
    api.get<any[]>("/api/user/review", { filter, page: String(page), limit: String(limit) }),
};

export const pyqApi = {
  get: (params: Record<string, string>) => api.get<any[]>("/api/pyq", params),
};

export const examsApi = {
  list: (categoryId?: string) =>
    api.get<any[]>("/api/exams", categoryId ? { categoryId } : undefined),
};

export const reportsApi = {
  submit: (body: { type: string; description: string; questionId?: string; pageUrl: string }) =>
    api.post<any>("/api/reports", body),
};

export const badgesApi = {
  get: () => api.get<any>("/api/badges"),
};
