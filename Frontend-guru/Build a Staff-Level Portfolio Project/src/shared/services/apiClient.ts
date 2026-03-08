import { apiBaseUrl } from '../utils/env';

export interface RequestConfig extends RequestInit {
  workspaceId?: string;
}

export class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = apiBaseUrl) {
    this.baseUrl = baseUrl;
  }

  async request<T>(endpoint: string, options: RequestConfig = {}): Promise<T> {
    const { workspaceId, ...init } = options;
    const headers = new Headers(init.headers);
    
    if (workspaceId) {
      headers.set('X-Workspace-ID', workspaceId);
    }
    
    headers.set('Content-Type', 'application/json');

    const url = this.baseUrl + endpoint;
    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  post<T>(endpoint: string, data: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();
