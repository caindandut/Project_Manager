import { Link, useParams } from "react-router-dom"
import { ArrowRight, FolderKanban, Plus } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useProjectsQuery } from "@/hooks/useProjects"
import { cn } from "@/lib/utils"

export default function WorkspaceProjectsPage() {
  const params = useParams<{ workspaceId: string }>()
  const workspaceId = params.workspaceId || ""
  const projectsQuery = useProjectsQuery(workspaceId)
  const projects = projectsQuery.data?.data ?? []

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dự án</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi các project trong workspace hiện tại.
          </p>
        </div>
        <Link
          to={`/workspaces/${workspaceId}/projects/new`}
          className={cn(buttonVariants({ size: "lg" }), "gap-2")}
        >
          <Plus className="h-4 w-4" />
          Tạo dự án
        </Link>
      </div>

      {projectsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : null}

      {projectsQuery.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Không tải được danh sách dự án</CardTitle>
            <CardDescription>Vui lòng thử tải lại dữ liệu.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void projectsQuery.refetch()}>
              Thử tải lại
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!projectsQuery.isLoading && !projectsQuery.isError && projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <FolderKanban className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">Chưa có dự án nào</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Tạo dự án đầu tiên để bắt đầu quản lý công việc trong workspace này.
            </p>
            <Link
              to={`/workspaces/${workspaceId}/projects/new`}
              className={cn(buttonVariants({ className: "mt-4" }), "gap-2")}
            >
              <Plus className="h-4 w-4" />
              Tạo dự án
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {!projectsQuery.isLoading && !projectsQuery.isError && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="h-full">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white"
                    style={{ backgroundColor: project.color || "hsl(var(--primary))" }}
                  >
                    {(project.key || project.name.slice(0, 2)).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="truncate">{project.name}</CardTitle>
                    <CardDescription className="mt-1 truncate">
                      {project.key || `Project #${project.id}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex h-full flex-col gap-4">
                <p className="min-h-10 text-sm text-muted-foreground">
                  {project.description || "Dự án này chưa có mô tả."}
                </p>
                <div className="mt-auto flex items-center justify-between border-t pt-4">
                  <span className="text-xs text-muted-foreground">
                    Cập nhật {new Date(project.updatedAt).toLocaleDateString("vi-VN")}
                  </span>
                  <Link
                    to={`/workspaces/${workspaceId}/projects/${project.id}/overview`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                  >
                    Mở
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  )
}
