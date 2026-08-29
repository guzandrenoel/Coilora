import type { Request } from 'express';

export type AuthenticatedUser = {
  id: string;
  role: 'authenticated';
  accessToken: string;
  email?: string;
  sessionId?: string;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};
