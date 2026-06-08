import { LoaderCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { Toaster } from 'sonner';

import AppLayout from '@/components/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspacesQuery } from '@/hooks/useWorkspaces';
import GoogleCallbackPage from '@/pages/GoogleCallback';
import LoginPage from '@/pages/Login';
import CreateWorkspacePage from '@/pages/CreateWorkspacePage';
import OnboardingProfilePage from '@/pages/OnboardingProfile';
import OnboardingWorkspacePage from '@/pages/OnboardingWorkspace';
import { ProjectCalendarPage, ProjectGanttPage, ProjectKanbanPage, ProjectListPage } from '@/pages/ProjectViews';
import ProjectOverview from '@/pages/ProjectOverview';
import ProjectMembersPage from '@/pages/ProjectMembersPage';
import ProjectSettingsPage from '@/pages/ProjectSettingsPage';
import RegisterPage from '@/pages/Register';
import WorkspaceDashboard from '@/pages/WorkspaceDashboard';
import WorkspaceInvitationPage from '@/pages/WorkspaceInvitation';
import WorkspaceInvitationActionPage from '@/pages/WorkspaceInvitationAction';
import WorkspaceMembersPage from '@/pages/WorkspaceMembers';
import WorkspaceProjectsPage from '@/pages/WorkspaceProjects';
import WorkspaceSettingsPage from '@/pages/WorkspaceSettings';
import WorkspacesPage from '@/pages/Workspaces';
import MyTasksPage from '@/pages/MyTasks';
import CreateProjectPage from '@/pages/CreateProjectPage';
import OwnerOverview from '@/pages/owner/OwnerOverview';
import OwnerUsers from '@/pages/owner/OwnerUsers';
import OwnerSettings from '@/pages/owner/OwnerSettings';
import OwnerAuditLog from '@/pages/owner/OwnerAuditLog';
import OwnerOversight from '@/pages/owner/OwnerOversight';
import OwnerLayout from '@/components/owner/OwnerLayout';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import NotificationsPage from '@/pages/NotificationsPage';
import { getLastWorkspaceSlug } from '@/stores/authStore';

function RootRedirect() {
  const { user, isAuthenticated, isBootstrappingAuth, requireOnboarding } = useAuth();
  const lastSlug = getLastWorkspaceSlug(user?.id);
  // Only fetch workspaces if no saved slug (fallback)
  const workspacesQuery = useWorkspacesQuery(1, 1, { enabled: !lastSlug && !requireOnboarding });

  if (isBootstrappingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="flex items-center gap-3 rounded-md border bg-card px-4 py-3 text-sm shadow-sm">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          <span>Đang khởi tạo phiên làm việc...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.systemRole === 'OWNER') {
    return <Navigate to="/owner" replace />;
  }

  if (requireOnboarding) {
    return <Navigate to={user?.name ? '/onboarding/workspace' : '/onboarding/profile'} replace />;
  }

  // If we have a saved last workspace, redirect there directly
  if (lastSlug) {
    return <Navigate to={`/workspaces/${lastSlug}`} replace />;
  }

  if (workspacesQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="flex items-center gap-3 rounded-md border bg-card px-4 py-3 text-sm shadow-sm">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          <span>Đang tải không gian làm việc...</span>
        </div>
      </div>
    );
  }

  // Fallback: redirect to first workspace from API
  if (workspacesQuery.isSuccess && workspacesQuery.data?.data.length) {
    return <Navigate to={`/workspaces/${workspacesQuery.data.data[0].slug}`} replace />;
  }

  // If authenticated but no workspaces yet, show workspaces page
  return <Navigate to="/workspaces" replace />;
}

function ProjectRedirect() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  return <Navigate to={`/workspaces/${workspaceId}/projects/${projectId}/overview`} replace />;
}

/**
 * Guard that intercepts invalid workspace slugs (e.g. '_') in the URL
 * and redirects to a valid workspace. This prevents cascading 404 errors.
 */
function WorkspaceSlugGuard() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user, requireOnboarding } = useAuth();
  const lastSlug = getLastWorkspaceSlug(user?.id);
  const workspacesQuery = useWorkspacesQuery(1, 1);

  if (requireOnboarding) {
    return <Navigate to={user?.name ? '/onboarding/workspace' : '/onboarding/profile'} replace />;
  }

  // If we know for sure the user has 0 workspaces, force them to create one
  // This handles the case where they delete their last workspace and are left on the deleted workspace URL
  if (workspacesQuery.isSuccess && workspacesQuery.data?.data.length === 0) {
    return <Navigate to="/workspaces/create" replace />;
  }

  // If workspace slug is '_' or empty, redirect to a valid workspace
  if (!workspaceId || workspaceId === '_') {
    if (lastSlug) {
      return <Navigate to={window.location.pathname.replace(`/workspaces/_`, `/workspaces/${lastSlug}`) + window.location.search} replace />;
    }
    if (workspacesQuery.isSuccess && workspacesQuery.data?.data.length) {
      const validSlug = workspacesQuery.data.data[0].slug;
      return <Navigate to={window.location.pathname.replace(`/workspaces/_`, `/workspaces/${validSlug}`) + window.location.search} replace />;
    }
    if (workspacesQuery.isSuccess && !workspacesQuery.data?.data.length) {
      return <Navigate to="/workspaces" replace />;
    }
    // Still loading
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="flex items-center gap-3 rounded-md border bg-card px-4 py-3 text-sm shadow-sm">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          <span>Đang chuyển hướng...</span>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

function App() {
  const { resolvedTheme } = useTheme();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/google/callback" element={<GoogleCallbackPage />} />
        <Route path="/invitations/workspace/:token/:action" element={<WorkspaceInvitationActionPage />} />

        {/* Onboarding routes - accessible with temp token */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding/profile" element={<OnboardingProfilePage />} />
          <Route path="/onboarding/workspace" element={<OnboardingWorkspacePage />} />
        </Route>

        {/* Protected routes - require full auth */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Root workspaces */}
            <Route path="/workspaces" element={<WorkspacesPage />} />
            <Route path="/workspaces/create" element={<CreateWorkspacePage />} />
            
            {/* Workspace routes - wrapped in guard to catch invalid slugs */}
            <Route path="/workspaces/:workspaceId" element={<WorkspaceSlugGuard />}>
              <Route index element={<WorkspaceDashboard />} />
              <Route path="my-tasks" element={<MyTasksPage />} />
              <Route path="projects" element={<WorkspaceProjectsPage />} />
              <Route path="projects/new" element={<CreateProjectPage />} />
              <Route path="members" element={<WorkspaceMembersPage />} />
              <Route path="calendar" element={<WorkspacesPage />} />
              <Route path="settings" element={<WorkspaceSettingsPage />} />
              
              {/* Project routes */}
              <Route path="projects/:projectId" element={<ProjectRedirect />} />
              <Route path="projects/:projectId/overview" element={<ProjectOverview />} />
              <Route path="projects/:projectId/list" element={<ProjectListPage />} />
              <Route path="projects/:projectId/kanban" element={<ProjectKanbanPage />} />
              <Route path="projects/:projectId/gantt" element={<ProjectGanttPage />} />
              <Route path="projects/:projectId/calendar" element={<ProjectCalendarPage />} />
              <Route path="projects/:projectId/members" element={<ProjectMembersPage />} />
              <Route path="projects/:projectId/settings" element={<ProjectSettingsPage />} />
            </Route>
            
            {/* Global settings */}
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/my-invitations" element={<WorkspaceInvitationPage />} />
          </Route>
        </Route>

        {/* Owner Console routes - require system OWNER role */}
        <Route element={<AdminProtectedRoute />}>
          <Route element={<OwnerLayout />}>
            <Route path="/owner" element={<OwnerOverview />} />
            <Route path="/owner/users" element={<OwnerUsers />} />
            <Route path="/owner/oversight" element={<OwnerOversight />} />
            <Route path="/owner/settings" element={<OwnerSettings />} />
            <Route path="/owner/audit-logs" element={<OwnerAuditLog />} />
          </Route>
        </Route>
        <Route path="/admin" element={<Navigate to="/owner" replace />} />
        <Route path="/admin/users" element={<Navigate to="/owner/users" replace />} />
        <Route path="/admin/settings" element={<Navigate to="/owner/settings" replace />} />
        <Route path="/admin/audit-logs" element={<Navigate to="/owner/audit-logs" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="top-right" theme={resolvedTheme === 'dark' ? 'dark' : 'light'} />
    </BrowserRouter>
  );
}

export default App;
