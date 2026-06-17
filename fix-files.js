const fs = require('fs');
const path = require('path');

const projectDir = path.join('Frontend-guru', 'Build a "Staff-Level" Portfolio Project');

const apiClient = `import { apiBaseUrl } from "../utils/env";
import type { ApiError } from "../types";

export interface RequestConfig extends RequestInit {
  workspaceId?: string;
}

export class ApiClient {
  private baseUrl = apiBaseUrl;

  async request<T>(endpoint: string, options: RequestConfig = {}): Promise<T> {
    const { workspaceId, ...init } = options;
    const headers = new Headers(init.headers);
    
    if (workspaceId) {
      headers.set("X-Workspace-ID", workspaceId);
    }
    headers.set("Content-Type", "application/json");
    
    const url = this.baseUrl + endpoint;
    const response = await fetch(url, {
      ...init,
      headers,
    });
    
    if (!response.ok) {
      const error: ApiError = {
        code: "FETCH_ERROR",
        message: response.statusText,
        statusCode: response.status,
      };
      throw error;
    }
    
    return response.json();
  }
}

export const apiClient = new ApiClient();`;

fs.writeFileSync(path.join(projectDir, 'src/shared/services/apiClient.ts'), apiClient);
console.log('✓ apiClient.ts fixed');

// Try build
const { execSync } = require('child_process');
try {
  execSync('npm run build', { cwd: projectDir, stdio: 'inherit' });
} catch (e) {
  process.exit(1);
}
