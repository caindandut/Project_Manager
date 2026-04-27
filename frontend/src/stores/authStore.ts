import { create } from 'zustand';

export interface AuthUser {
  id: number;
  email: string;
  name?: string | null;
  avatar?: string | null;
  bio?: string | null;
  requireOnboarding?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  hasHydratedAuth: boolean;
  requireOnboarding: boolean;
  login: (payload: { user: AuthUser; accessToken: string }) => void;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  setAccessToken: (accessToken: string | null) => void;
  setHydratedAuth: (hasHydratedAuth: boolean) => void;
  setRequireOnboarding: (value: boolean) => void;
  completeOnboarding: (payload: { user: AuthUser; accessToken: string; workspaceSlug?: string }) => void;
}

const ACCESS_TOKEN_KEY = 'accessToken';
const WORKSPACE_SLUG_KEY = 'onboardingWorkspaceSlug';

const getInitialAccessToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
};

const getInitialOnboardingSlug = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(WORKSPACE_SLUG_KEY);
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: Boolean(getInitialAccessToken()),
  accessToken: getInitialAccessToken(),
  hasHydratedAuth: false,
  requireOnboarding: false,

  login: ({ user, accessToken }) => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

    set({
      user,
      accessToken,
      isAuthenticated: true,
      hasHydratedAuth: true,
      requireOnboarding: user.requireOnboarding ?? false,
    });
  },

  logout: () => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(WORKSPACE_SLUG_KEY);

    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      hasHydratedAuth: true,
      requireOnboarding: false,
    });
  },

  setUser: (user) =>
    set((state) => ({
      user,
      isAuthenticated: Boolean(state.accessToken && user),
      hasHydratedAuth: true,
      requireOnboarding: user?.requireOnboarding ?? state.requireOnboarding,
    })),

  setAccessToken: (accessToken) => {
    if (accessToken) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    }

    set((state) => ({
      accessToken,
      isAuthenticated: Boolean(accessToken && state.user),
    }));
  },

  setHydratedAuth: (hasHydratedAuth) =>
    set(() => ({
      hasHydratedAuth,
    })),

  setRequireOnboarding: (value) =>
    set(() => ({
      requireOnboarding: value,
    })),

  completeOnboarding: ({ user, accessToken, workspaceSlug }) => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (workspaceSlug) {
      window.localStorage.setItem(WORKSPACE_SLUG_KEY, workspaceSlug);
    }
    set({
      user,
      accessToken,
      isAuthenticated: true,
      hasHydratedAuth: true,
      requireOnboarding: false,
    });
  },
}));

export { ACCESS_TOKEN_KEY, WORKSPACE_SLUG_KEY, getInitialOnboardingSlug };
