import { LoaderCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
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
import RegisterPage from '@/pages/Register';
import SettingsPage from '@/pages/Settings';
import WorkspaceDashboard from '@/pages/WorkspaceDashboard';
import WorkspaceSettingsPage from '@/pages/WorkspaceSettings';
import WorkspacesPage from '@/pages/Workspaces';
import MyTasksPage from '@/pages/MyTasks';
import CreateProjectPage from '@/pages/CreateProjectPage';

function RootRedirect() {
  const { isAuthenticated, isBootstrappingAuth } = useAuth();
  const workspacesQuery = useWorkspacesQuery(1, 1);

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

  // If authenticated and workspaces loaded, redirect to first workspace
  if (workspacesQuery.isSuccess && workspacesQuery.data?.data.length) {
    return <Navigate to={`/workspaces/${workspacesQuery.data.data[0].slug}`} replace />;
  }

  // If authenticated but no workspaces yet, show workspaces page
  return <Navigate to="/workspaces" replace />;
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
            
            {/* Workspace routes */}
            <Route path="/workspaces/:workspaceId" element={<WorkspaceDashboard />} />
            <Route path="/workspaces/:workspaceId/my-tasks" element={<MyTasksPage />} />
            <Route path="/workspaces/:workspaceId/projects" element={<WorkspacesPage />} />
            <Route path="/workspaces/:workspaceId/projects/new" element={<CreateProjectPage />} />
            <Route path="/workspaces/:workspaceId/members" element={<WorkspacesPage />} />
            <Route path="/workspaces/:workspaceId/calendar" element={<WorkspacesPage />} />
            <Route path="/workspaces/:workspaceId/settings" element={<WorkspaceSettingsPage />} />
            
            {/* Project routes */}
            <Route path="/workspaces/:workspaceId/projects/:projectId" element={<Navigate to="overview" replace />} />
            <Route path="/workspaces/:workspaceId/projects/:projectId/overview" element={<ProjectOverview />} />
            <Route path="/workspaces/:workspaceId/projects/:projectId/list" element={<ProjectListPage />} />
            <Route path="/workspaces/:workspaceId/projects/:projectId/kanban" element={<ProjectKanbanPage />} />
            <Route path="/workspaces/:workspaceId/projects/:projectId/gantt" element={<ProjectGanttPage />} />
            <Route path="/workspaces/:workspaceId/projects/:projectId/calendar" element={<ProjectCalendarPage />} />
            
            {/* Global settings */}
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="top-right" theme={resolvedTheme === 'dark' ? 'dark' : 'light'} />
    </BrowserRouter>
  );
}

export default App;
