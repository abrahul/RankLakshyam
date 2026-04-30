// Typed API response wrappers matching backend patterns
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, any>;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
  } | string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
