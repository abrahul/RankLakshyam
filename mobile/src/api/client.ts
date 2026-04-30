import { API_BASE_URL } from "../utils/config";
import { getToken, clearSession } from "../auth/session-storage";
import type { ApiResponse } from "../types/api";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = await getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      });
    }

    const headers = await this.getHeaders();
    const response = await fetch(url.toString(), { headers });

    if (response.status === 401) {
      await clearSession();
      throw new AuthError("Session expired");
    }

    return response.json();
  }

  async post<T>(path: string, body?: Record<string, any>): Promise<ApiResponse<T>> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      await clearSession();
      throw new AuthError("Session expired");
    }

    return response.json();
  }

  async patch<T>(path: string, body?: Record<string, any>): Promise<ApiResponse<T>> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "PATCH",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      await clearSession();
      throw new AuthError("Session expired");
    }

    return response.json();
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export const api = new ApiClient(API_BASE_URL);
