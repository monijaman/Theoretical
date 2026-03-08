export enum Role {
  ADMIN = "admin",
  MANAGER = "manager",
  MEMBER = "member",
  VIEWER = "viewer",
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  tenantIds: string[];
  currentTenantId: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}
