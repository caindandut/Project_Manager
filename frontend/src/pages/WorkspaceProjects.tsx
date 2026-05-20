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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Chưa có cập nhật"
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return "Chưa có cập nhật"
    return date.toLocaleDateString("vi-VN")
  }

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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/20 dark:hover:bg-slate-900/40">
              <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: project.color || "hsl(var(--primary))" }} />
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-inner transition-transform group-hover:scale-105"
                    style={{ backgroundColor: project.color || "hsl(var(--primary))" }}
                  >
                    {(project.key || project.name.slice(0, 2)).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-lg font-bold group-hover:text-primary transition-colors">{project.name}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <span>Mã: {project.key || `Project #${project.id}`}</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="line-clamp-2 text-sm text-muted-foreground min-h-[40px] leading-relaxed">
                  {project.description || "Dự án này chưa có mô tả."}
                </p>

                {/* Progress bar section */}
                {typeof project.taskCount === "number" && project.taskCount > 0 ? (
                  (() => {
                    const taskCount = project.taskCount || 0;
                    const completedCount = project.completedTaskCount || 0;
                    const percentage = Math.round((completedCount / taskCount) * 100);
                    return (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-medium">Tiến độ công việc</span>
                          <span className="font-semibold text-primary">{completedCount}/{taskCount} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500 ease-out" 
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: project.color || "hsl(var(--primary))"
                            }} 
                          />
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Tiến độ công việc</span>
                      <span className="text-muted-foreground italic font-medium">Chưa có công việc nào</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full w-0 bg-primary/40" />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Cập nhật {formatDate(project.updatedAt)}
                  </span>
                  <Link
                    to={`/workspaces/${workspaceId}/projects/${project.id}/overview`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1 px-3.5 transition-all hover:bg-primary hover:text-primary-foreground group-hover:border-primary/40")}
                  >
                    <span>Mở</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
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
