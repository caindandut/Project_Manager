import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient, { isSessionInvalidError, normalizeApiError, unwrapResponse } from '@/lib/api-client';
import ThemeToggle from '@/components/ThemeToggle';
import { toVietnameseErrorMessage } from '@/lib/error-messages';
import { useAuthStore, getLastWorkspaceSlug, type AuthUser } from '@/stores/authStore';
import type { ApiResponse } from '@/types/api';
import { LoaderCircle } from 'lucide-react';

interface MeResponse {
  id: number;
  email: string;
  name?: string | null;
  avatar?: string | null;
  bio?: string | null;
  systemRole?: 'OWNER' | 'USER';
  requireOnboarding?: boolean;
}

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const { setAccessToken, setRefreshToken, setUser, setRequireOnboarding, logout } = useAuthStore();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    document.title = 'Đăng nhập Google | Quản lý dự án';

    const run = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const errorParam = searchParams.get('error');
      const isLinkingGoogle = window.localStorage.getItem('isLinkingGoogle') === 'true';

      if (errorParam) {
        const decodedError = decodeURIComponent(errorParam);
        if (isLinkingGoogle) {
          window.localStorage.removeItem('isLinkingGoogle');
          const lastSlug = getLastWorkspaceSlug();
          navigate(lastSlug ? `/workspaces/${lastSlug}` : '/', { replace: true });
        } else {
          logout();
          navigate('/login', { replace: true, state: { error: decodedError } });
        }
        return;
      }

      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');

      if (!accessToken) {
        if (isLinkingGoogle) {
          window.localStorage.removeItem('isLinkingGoogle');
          const lastSlug = getLastWorkspaceSlug();
          navigate(lastSlug ? `/workspaces/${lastSlug}` : '/', { replace: true });
        } else {
          logout();
          navigate('/login', {
            replace: true,
            state: { error: 'Không nhận được mã truy cập từ Google.', isTranslated: true }
          });
        }
        return;
      }

      setAccessToken(accessToken);
      if (refreshToken) {
        setRefreshToken(refreshToken);
      }

      // Get requireOnboarding from URL params
      const requireOnboardingParam = searchParams.get('requireOnboarding') === 'true';

      let callbackUser: AuthUser | null = null;
      const rawUser = searchParams.get('user');
      if (rawUser) {
        try {
          const parsedUser = JSON.parse(rawUser) as AuthUser;
          callbackUser = parsedUser;
          setUser(parsedUser);
          setRequireOnboarding(requireOnboardingParam);
        } catch {
          // Ignore malformed user payload
        }
      }

      // Also fetch from /auth/me to ensure we have the latest data
      try {
        const response = await apiClient.get<ApiResponse<MeResponse>>('/auth/me');
        const userData = unwrapResponse(response);
        setUser(userData as AuthUser);

        // Use the requireOnboarding from API response, fallback to URL param
        const needsOnboarding = userData.requireOnboarding ?? requireOnboardingParam;
        setRequireOnboarding(needsOnboarding);

        const isLinkingGoogle = window.localStorage.getItem('isLinkingGoogle') === 'true';
        if (isLinkingGoogle) {
          window.localStorage.removeItem('isLinkingGoogle');
          toast.success('Liên kết tài khoản Google thành công!');
          const lastSlug = getLastWorkspaceSlug();
          navigate(lastSlug ? `/workspaces/${lastSlug}` : '/', { replace: true });
          return;
        }

        if (userData.systemRole === 'OWNER') {
          toast.success('Đăng nhập Owner thành công.');
          navigate('/owner', { replace: true });
        } else if (needsOnboarding) {
          toast.success('Chào mừng bạn đến với Project Manager!');
          navigate('/onboarding/profile', { replace: true });
        } else {
          toast.success('Đăng nhập Google thành công.');
          const lastSlug = getLastWorkspaceSlug();
          navigate(lastSlug ? `/workspaces/${lastSlug}` : '/', { replace: true });
        }
      } catch (error) {
        const normalizedError = normalizeApiError(error);
        if (isSessionInvalidError(normalizedError)) {
          logout();
          const errorMsg = toVietnameseErrorMessage(
            normalizedError,
            'Không thể hoàn tất đăng nhập bằng Google. Vui lòng thử lại.',
          );
          navigate('/login', {
            replace: true,
            state: { error: errorMsg, isTranslated: true }
          });
          return;
        }

        toast.error(
          toVietnameseErrorMessage(
            normalizedError,
            'Không thể đồng bộ thông tin mới nhất, nhưng phiên đăng nhập vẫn hợp lệ.',
          ),
        );

        if (isLinkingGoogle) {
          window.localStorage.removeItem('isLinkingGoogle');
          const lastSlug = getLastWorkspaceSlug();
          navigate(lastSlug ? `/workspaces/${lastSlug}` : '/', { replace: true });
          return;
        }

        if (callbackUser?.systemRole === 'OWNER') {
          navigate('/owner', { replace: true });
        } else if (requireOnboardingParam) {
          navigate('/onboarding/profile', { replace: true });
        } else {
          const lastSlug = getLastWorkspaceSlug();
          navigate(lastSlug ? `/workspaces/${lastSlug}` : '/', { replace: true });
        }
      }
    };

    void run();
  }, [logout, navigate, setAccessToken, setRefreshToken, setUser, setRequireOnboarding]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm text-card-foreground shadow-sm">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        <span>Đang hoàn tất đăng nhập bằng Google...</span>
      </div>
    </div>
  );
}
