import { create } from 'zustand';

interface ReportStore {
  isOpen: boolean;
  questionId?: string;
  openReport: (questionId?: string) => void;
  closeReport: () => void;
}

export const useReportStore = create<ReportStore>((set) => ({
  isOpen: false,
  questionId: undefined,
  openReport: (questionId) => set({ isOpen: true, questionId }),
  closeReport: () => set({ isOpen: false, questionId: undefined }),
}));
