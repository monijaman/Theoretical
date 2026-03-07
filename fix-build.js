const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dir = path.join('./Frontend-guru', 'Build a "Staff-Level" Portfolio Project');

// Fix apiClient.ts
const apiCode = `import { apiBaseUrl } from "../utils/env";
import type { ApiError } from "../types";

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
    if (workspaceId) headers.set("X-Workspace-ID", workspaceId);
    headers.set("Content-Type", "application/json");
    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, { ...init, headers });
    if (!response.ok) throw await this.handleError(response);
    return response.json();
  }

  private async handleError(response: Response): Promise<ApiError> {
    const error: ApiError = { code: "UNKNOWN_ERROR", message: response.statusText, statusCode: response.status };
    try {
      const data = await response.json();
      error.code = data.code || error.code;
      error.message = data.message || error.message;
      error.details = data.details;
    } catch (e) {}
    throw error;
  }
}

export const apiClient = new ApiClient();`;

fs.writeFileSync(path.join(dir, 'src/shared/services/apiClient.ts'), apiCode);
console.log('✓ Fixed apiClient.ts');

try {
  execSync('npm run build', { cwd: dir, stdio: 'inherit' });
  console.log('\n✅ Build successful!');
} catch (e) {
  console.error('\n❌ Build failed');
  process.exit(1);
}
