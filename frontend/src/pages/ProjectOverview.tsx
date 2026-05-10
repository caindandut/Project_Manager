import { useEffect } from "react"
import { useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useProjectDetailQuery, useUpdateProjectMutation } from "@/hooks/useProject"
import { useWorkspaceDetailQuery } from "@/hooks/useWorkspaces"

import OverviewHeader from "@/components/project/OverviewHeader"
import StatsRow from "@/components/project/OverviewStats"
import RecentTasksCard from "@/components/project/RecentTasksCard"
import ActivityTimeline from "@/components/project/ActivityTimeline"
import OverviewCharts from "@/components/project/OverviewCharts"
import MemberAvatars from "@/components/project/MemberAvatars"

export default function ProjectOverview() {
  const params = useParams<{ workspaceId: string; projectId: string }>()
  const workspaceSlug = params.workspaceId || ""
  const projectId = Number(params.projectId || "0")

  const workspaceQuery = useWorkspaceDetailQuery(workspaceSlug)
  const projectQuery = useProjectDetailQuery(workspaceSlug, projectId)
  const updateProjectMutation = useUpdateProjectMutation(workspaceSlug, projectId)
  const project = projectQuery.data

  useEffect(() => {
    document.title = project
      ? `${project.name} | Tổng quan`
      : "Tổng quan dự án | Project Manager"
  }, [project])

  // Determine if the current user can manage members
  const workspaceRole = workspaceQuery.data?.role
  const canManageMembers =
    workspaceRole === "OWNER" || workspaceRole === "ADMIN"
  const workspaceId = workspaceQuery.data?.id

  const handleUpdateProject = async (payload: {
    name?: string
    description?: string
  }) => {
    await updateProjectMutation.mutateAsync(payload)
  }

  // ─── Invalid params ────────────────────────────────────────
  if (!workspaceSlug || !projectId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-sm text-center">
          <CardHeader>
            <CardTitle>Dự án không hợp lệ</CardTitle>
            <CardDescription>Vui lòng chọn một dự án hợp lệ.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // ─── Loading skeleton ──────────────────────────────────────
  if (projectQuery.isLoading) {
    return (
      <div className="space-y-6 p-6">
        {/* Header skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <div className="flex items-start gap-3">
            <Skeleton className="h-11 w-11 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-96" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-lg" />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            <Skeleton className="h-[320px] rounded-lg" />
            <Skeleton className="h-[280px] rounded-lg" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-[280px] rounded-lg" />
            <Skeleton className="h-[240px] rounded-lg" />
            <Skeleton className="h-[160px] rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  // ─── Error state ───────────────────────────────────────────
  if (projectQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-sm text-center">
          <CardHeader>
            <CardTitle>Không tải được dự án</CardTitle>
            <CardDescription>
              Đã xảy ra lỗi khi tải thông tin dự án.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => void projectQuery.refetch()}
            >
              Thử tải lại
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Main content ──────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* ── Section 1: Header ──────────────────────────────── */}
      <OverviewHeader
        project={project}
        isLoading={false}
        workspaceSlug={workspaceSlug}
        workspaceName={workspaceQuery.data?.name || "Workspace"}
        workspaceId={workspaceId}
        canManage={canManageMembers}
        onUpdateProject={handleUpdateProject}
      />

      {/* ── Section 2: Stats Row ───────────────────────────── */}
      <StatsRow
        stats={project?.stats}
        isLoading={false}
        workspaceSlug={workspaceSlug}
        projectId={projectId}
      />

      {/* ── Section 3: Main Content (2 columns) ───────────── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column — wider */}
        <div className="lg:col-span-3 space-y-6">
          <RecentTasksCard
            tasks={project?.recentTasks}
            isLoading={false}
          />
          <ActivityTimeline activities={project?.recentActivities} isLoading={false} />
        </div>

        {/* Right column — narrower */}
        <div className="lg:col-span-2 space-y-4">
          <OverviewCharts stats={project?.stats} isLoading={false} />
          <MemberAvatars
            projectId={projectId}
            workspaceId={workspaceId}
            canManage={canManageMembers}
          />
        </div>
      </div>
    </div>
  )
}
