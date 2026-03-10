/**
 * API Error Handler
 * Standardized error processing for all API responses.
 */

import type { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  errors?: Record<string, string[]>;
  originalError?: unknown;
}

interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
  code?: string;
}

const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'Bad Request — The server could not understand the request.',
  401: 'Unauthorized — Please sign in again.',
  403: 'Forbidden — You do not have permission to access this resource.',
  404: 'Not Found — The requested resource does not exist.',
  408: 'Request Timeout — The server took too long to respond.',
  409: 'Conflict — The request conflicts with the current state.',
  422: 'Validation Error — Please check your input.',
  429: 'Too Many Requests — Please slow down.',
  500: 'Internal Server Error — Something went wrong on our end.',
  502: 'Bad Gateway — The server received an invalid response.',
  503: 'Service Unavailable — The server is temporarily offline.',
  504: 'Gateway Timeout — The server took too long to respond.',
};

class ApiErrorHandlerService {
  handle(error: AxiosError<ApiErrorResponse>): ApiError {
    if (error.response) {
      const { status, data } = error.response;
      return {
        message: data?.message || HTTP_ERROR_MESSAGES[status] || 'An unexpected error occurred.',
        status,
        code: data?.code,
        errors: data?.errors,
        originalError: error,
      };
    }

    if (error.request) {
      return {
        message: 'Network Error — Unable to reach the server. Please check your connection.',
        status: 0,
        code: 'NETWORK_ERROR',
        originalError: error,
      };
    }

    return {
      message: error.message || 'An unexpected error occurred.',
      status: 0,
      code: 'UNKNOWN_ERROR',
      originalError: error,
    };
  }

  /**
   * Check if an error is a specific HTTP status
   */
  isStatus(error: ApiError, status: number): boolean {
    return error.status === status;
  }

  /**
   * Check if error is a network error
   */
  isNetworkError(error: ApiError): boolean {
    return error.code === 'NETWORK_ERROR';
  }

  /**
   * Check if error is a validation error
   */
  isValidationError(error: ApiError): boolean {
    return error.status === 422;
  }

  /**
   * Extract validation field errors
   */
  getFieldErrors(error: ApiError): Record<string, string> {
    if (!error.errors) return {};
    const fieldErrors: Record<string, string> = {};
    for (const [field, messages] of Object.entries(error.errors)) {
      fieldErrors[field] = messages[0] || 'Invalid value';
    }
    return fieldErrors;
  }
}

export const apiErrorHandler = new ApiErrorHandlerService();
