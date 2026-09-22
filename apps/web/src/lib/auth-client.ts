import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

const API_BASE_URL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    : process.env.BACKEND_API_URL || 'http://localhost:4000';

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  plugins: [
    organizationClient(),
  ],
  fetchOptions: {
    credentials: 'include',
  },
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  organization,
} = authClient;
