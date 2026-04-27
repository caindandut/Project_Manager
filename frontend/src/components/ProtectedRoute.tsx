import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';

const ONBOARDING_ROUTES = ['/onboarding'];

export default function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isBootstrappingAuth, requireOnboarding } = useAuth();

  const isOnboardingRoute = ONBOARDING_ROUTES.some((route) =>
    location.pathname.startsWith(route)
  );

  if (isBootstrappingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="flex items-center gap-3 rounded-md border bg-card px-4 py-3 text-sm text-card-foreground shadow-sm">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          <span>Đang tải...</span>
        </div>
      </div>
    );
  }

  // Allow onboarding routes if user has token but needs onboarding
  if (isOnboardingRoute) {
    if (isAuthenticated && requireOnboarding) {
      return <Outlet />;
    }
    // If user is fully authenticated, redirect away from onboarding
    if (isAuthenticated) {
      return <Navigate to="/workspaces" replace />;
    }
    // Not authenticated, redirect to login
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // For protected routes, require full authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
