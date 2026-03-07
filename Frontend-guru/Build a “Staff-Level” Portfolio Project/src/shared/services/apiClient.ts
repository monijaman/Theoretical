import { apiBaseUrl } from '../utils/env';
import type { ApiError } from '../types';

export interface RequestConfig {
  workspaceId?: string;
  [key: string]: any;
}

export class ApiClient {
  private baseUrl = apiBaseUrl;

  async request<T>(
    endpoint: string,
    options: RequestInit & RequestConfig = {}
  ): Promise<T> {
    const { workspaceId, ...init } = options;
    const headers = new Headers(init.headers || {});
    
    // Add workspace header for multi-tenancy
    if (workspaceId) {
      headers.set('X-Workspace-ID', workspaceId);
    }
    
    headers.set('Content-Type', 'application/json');
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...init,
      headers,
    });
    
      throw await this.handleError(response);
    }
    
    return response.json();
  }

  private async handleError(response: Response): Promise<ApiError> {
    const error: ApiError = {
      code: 'UNKNOWN_ERROR',
      message: response.statusText,
      statusCode: response.status,
    };
    
    try {
      const data = await response.json();
      error.code = data.code || error.code;
      error.message = data.message || error.message;
      error.details = data.details;
    } catch (e) {
      // Response wasn't JSON
    }
    
    throw error;
  }
}

export const apiClient = new ApiClient();
