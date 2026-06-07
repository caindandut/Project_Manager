import { create } from 'zustand';

export interface AuthUser {
  id: number;
  email: string;
  name?: string | null;
  avatar?: string | null;
  bio?: string | null;
  systemRole?: 'OWNER' | 'USER';
  requireOnboarding?: boolean;
  googleId?: string | null;
  googleAvatar?: string | null;
  hasPassword?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  hasHydratedAuth: boolean;
  requireOnboarding: boolean;
  login: (payload: { user: AuthUser; accessToken: string; refreshToken?: string; requireOnboarding?: boolean }) => void;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  setAccessToken: (accessToken: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  setHydratedAuth: (hasHydratedAuth: boolean) => void;
  setRequireOnboarding: (value: boolean) => void;
  completeOnboarding: (payload: { user: AuthUser; accessToken: string; refreshToken?: string; workspaceSlug?: string }) => void;
}

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const WORKSPACE_SLUG_KEY = 'onboardingWorkspaceSlug';
const LAST_WORKSPACE_SLUG_KEY = 'lastWorkspaceSlug';

interface LastWorkspaceSlugPayload {
  userId: number;
  slug: string;
}

const getInitialAccessToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
};

const getInitialRefreshToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
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
  refreshToken: getInitialRefreshToken(),
  hasHydratedAuth: false,
  requireOnboarding: false,

  login: ({ user, accessToken, refreshToken, requireOnboarding }) => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }

    const nextRequireOnboarding = requireOnboarding ?? user.requireOnboarding ?? false;

    set({
      user: { ...user, requireOnboarding: nextRequireOnboarding },
      accessToken,
      refreshToken: refreshToken ?? getInitialRefreshToken(),
      isAuthenticated: true,
      hasHydratedAuth: true,
      requireOnboarding: nextRequireOnboarding,
    });
  },

  logout: () => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(WORKSPACE_SLUG_KEY);
    window.localStorage.removeItem(LAST_WORKSPACE_SLUG_KEY);

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
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

  setRefreshToken: (refreshToken) => {
    if (refreshToken) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    }

    set(() => ({
      refreshToken,
    }));
  },

  setHydratedAuth: (hasHydratedAuth) =>
    set(() => ({
      hasHydratedAuth,
    })),

  setRequireOnboarding: (value) =>
    set((state) => ({
      user: state.user ? { ...state.user, requireOnboarding: value } : state.user,
      requireOnboarding: value,
    })),

  completeOnboarding: ({ user, accessToken, refreshToken, workspaceSlug }) => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    if (workspaceSlug) {
      window.localStorage.setItem(WORKSPACE_SLUG_KEY, workspaceSlug);
      setLastWorkspaceSlug(workspaceSlug, user.id);
    }
    set({
      user: { ...user, requireOnboarding: false },
      accessToken,
      refreshToken: refreshToken ?? getInitialRefreshToken(),
      isAuthenticated: true,
      hasHydratedAuth: true,
      requireOnboarding: false,
    });
  },
}));

export const getLastWorkspaceSlug = (userId?: number | null): string | null => {
  if (typeof window === 'undefined') return null;
  const currentUserId = userId ?? useAuthStore.getState().user?.id;
  if (!currentUserId) return null;

  const rawValue = window.localStorage.getItem(LAST_WORKSPACE_SLUG_KEY);
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as Partial<LastWorkspaceSlugPayload>;
    if (parsed.userId === currentUserId && typeof parsed.slug === 'string' && parsed.slug.length > 0) {
      return parsed.slug;
    }
  } catch {
    window.localStorage.removeItem(LAST_WORKSPACE_SLUG_KEY);
  }

  return null;
};

export const setLastWorkspaceSlug = (slug: string, userId?: number | null): void => {
  if (typeof window !== 'undefined') {
    const currentUserId = userId ?? useAuthStore.getState().user?.id;
    if (!currentUserId) return;

    window.localStorage.setItem(
      LAST_WORKSPACE_SLUG_KEY,
      JSON.stringify({ userId: currentUserId, slug } satisfies LastWorkspaceSlugPayload),
    );
  }
};

export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, WORKSPACE_SLUG_KEY, LAST_WORKSPACE_SLUG_KEY, getInitialOnboardingSlug };
