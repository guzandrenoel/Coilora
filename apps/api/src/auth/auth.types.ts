import type { Request } from 'express';

export type AuthenticatedUser = {
  id: string;
  role: 'authenticated';
  email?: string;
  sessionId?: string;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};