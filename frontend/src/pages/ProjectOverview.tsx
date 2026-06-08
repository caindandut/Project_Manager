import { useEffect, useState } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useProjectDetailQuery, useDeleteProjectMutation } from "@/hooks/useProject"
import { useWorkspaceDetailQuery } from "@/hooks/useWorkspaces"
import { useProjectMembersQuery } from "@/hooks/useProjectMembers"
import { useAuth } from "@/hooks/useAuth"
import { toVietnameseErrorMessage } from "@/lib/error-messages"

import OverviewHeader from "@/components/project/OverviewHeader"
import StatsRow from "@/components/project/OverviewStats"
import RecentTasksCard from "@/components/project/RecentTasksCard"
import ActivityTimeline from "@/components/project/ActivityTimeline"
import OverviewCharts from "@/components/project/OverviewCharts"
import TaskDetailPanel from "@/components/tasks/TaskDetailPanel"

export default function ProjectOverview() {
  const params = useParams<{ workspaceId: string; projectId: string }>()
  const workspaceSlug = params.workspaceId || ""
  const projectId = Number(params.projectId || "0")
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)

  const workspaceQuery = useWorkspaceDetailQuery(workspaceSlug)
  const projectQuery = useProjectDetailQuery(workspaceSlug, projectId)
  const project = projectQuery.data
  const projectMembersQuery = useProjectMembersQuery(projectId)
  const deleteProjectMutation = useDeleteProjectMutation(workspaceSlug)

  useEffect(() => {
    document.title = project
      ? `${project.name} | Tổng quan`
      : "Tổng quan dự án | Project Manager"
  }, [project])

  useEffect(() => {
    const taskIdParam = searchParams.get("task")
    if (taskIdParam) {
      const nextTaskId = Number(taskIdParam)
      if (!Number.isNaN(nextTaskId)) {
        setSelectedTaskId((currentTaskId) =>
          currentTaskId === nextTaskId ? currentTaskId : nextTaskId,
        )
      }
    } else {
      setSelectedTaskId((currentTaskId) => (currentTaskId === null ? currentTaskId : null))
    }
  }, [searchParams])

  useEffect(() => {
    const handleOpenTaskDetail = (event: Event) => {
      const customEvent = event as CustomEvent<{ taskId: number }>
      const nextTaskId = customEvent.detail.taskId
      setSelectedTaskId(nextTaskId)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set("task", String(nextTaskId))
        return next
      })
    }

    window.addEventListener("openTaskDetail", handleOpenTaskDetail)
    return () => window.removeEventListener("openTaskDetail", handleOpenTaskDetail)
  }, [setSearchParams])

  const workspaceId = workspaceQuery.data?.id

  // Determine if the current user is project ADMIN (creator)
  const currentProjectMember = projectMembersQuery.data?.data?.find(
    (m) => m.user.id === user?.id
  )
  const isProjectAdmin = currentProjectMember?.role === "ADMIN" && currentProjectMember.status === "ACCEPTED"
  const canManageMembers = isProjectAdmin

  const handleDeleteProject = async () => {
    if (!project) return
    try {
      await deleteProjectMutation.mutateAsync(project.id)
      toast.success("Đã xóa dự án thành công!")
      navigate(`/workspaces/${workspaceSlug}/projects`)
    } catch (error) {
      toast.error(toVietnameseErrorMessage(error, "Không thể xóa dự án."))
    }
  }

  const handleOpenTask = (taskId: number) => {
    setSelectedTaskId(taskId)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set("task", String(taskId))
      return next
    })
  }

  const handleCloseTask = () => {
    setSelectedTaskId(null)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete("task")
      return next
    })
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
    const message = toVietnameseErrorMessage(
      projectQuery.error,
      "Đã xảy ra lỗi khi tải thông tin dự án.",
    )

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-sm text-center">
          <CardHeader>
            <CardTitle>Không tải được dự án</CardTitle>
            <CardDescription>
              Đã xảy ra lỗi khi tải thông tin dự án.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button
              variant="outline"
              onClick={() => navigate(`/workspaces/${workspaceSlug}/projects`)}
            >
              Về danh sách dự án
            </Button>
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
        isProjectAdmin={isProjectAdmin}
        onDelete={handleDeleteProject}
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
            onTaskClick={handleOpenTask}
          />
          <ActivityTimeline activities={project?.recentActivities} isLoading={false} />
        </div>

        {/* Right column — narrower */}
        <div className="lg:col-span-2 space-y-4">
          <OverviewCharts stats={project?.stats} isLoading={false} />
        </div>
      </div>

      <TaskDetailPanel
        taskId={selectedTaskId}
        projectId={projectId}
        projectKey={project?.key ?? "PRJ"}
        open={selectedTaskId !== null}
        onClose={handleCloseTask}
        projectMembers={(projectMembersQuery.data?.data ?? [])
          .filter((member) => member.status === "ACCEPTED")
          .map((member) => member.user)}
      />
    </div>
  )
}
