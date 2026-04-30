export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  onboarded: boolean;
  targetExam: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
