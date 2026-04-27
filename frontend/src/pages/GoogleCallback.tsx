import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient, { normalizeApiError, unwrapResponse } from '@/lib/api-client';
import ThemeToggle from '@/components/ThemeToggle';
import { toVietnameseErrorMessage } from '@/lib/error-messages';
import { useAuthStore, type AuthUser } from '@/stores/authStore';
import type { ApiResponse } from '@/types/api';
import { LoaderCircle } from 'lucide-react';

interface MeResponse {
  id: number;
  email: string;
  name?: string | null;
  avatar?: string | null;
  bio?: string | null;
  requireOnboarding?: boolean;
}

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const { setAccessToken, setUser, setRequireOnboarding, logout } = useAuthStore();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    document.title = 'Đăng nhập Google | Quản lý dự án';

    const run = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const accessToken = searchParams.get('accessToken');

      if (!accessToken) {
        toast.error('Không nhận được mã truy cập từ Google.');
        logout();
        navigate('/login', { replace: true });
        return;
      }

      setAccessToken(accessToken);

      // Get requireOnboarding from URL params
      const requireOnboardingParam = searchParams.get('requireOnboarding') === 'true';

      const rawUser = searchParams.get('user');
      if (rawUser) {
        try {
          const parsedUser = JSON.parse(rawUser) as AuthUser;
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

        if (needsOnboarding) {
          toast.success('Chào mừng bạn đến với Project Manager!');
          navigate('/onboarding/profile', { replace: true });
        } else {
          toast.success('Đăng nhập Google thành công.');
          navigate('/workspaces', { replace: true });
        }
      } catch (error) {
        logout();
        toast.error(
          toVietnameseErrorMessage(
            normalizeApiError(error),
            'Không thể hoàn tất đăng nhập bằng Google. Vui lòng thử lại.',
          ),
        );
        navigate('/login', { replace: true });
      }
    };

    void run();
  }, [logout, navigate, setAccessToken, setUser, setRequireOnboarding]);

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
