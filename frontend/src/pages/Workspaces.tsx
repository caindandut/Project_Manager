import { useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowRight, Clock3, FolderKanban, LayoutGrid, Users } from "lucide-react"

import CreateWorkspaceDialog from "@/components/workspace/CreateWorkspaceDialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useWorkspacesQuery } from "@/hooks/useWorkspaces"
import { cn } from "@/lib/utils"
import { getWorkspaceRoleLabel, workspaceRoleVariantMap } from "@/lib/workspace-role"

const WORKSPACES_PER_PAGE = 6

export default function WorkspacesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get("page") || "1"))
  const workspacesQuery = useWorkspacesQuery(page, WORKSPACES_PER_PAGE)
  const workspaces = workspacesQuery.data?.data ?? []
  const meta = workspacesQuery.data?.meta

  useEffect(() => {
    document.title = "Workspace | Project Manager"
  }, [])

  const updatePage = (nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams)

    if (nextPage <= 1) {
      nextParams.delete("page")
    } else {
      nextParams.set("page", String(nextPage))
    }

    setSearchParams(nextParams)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-md border border-border/80 bg-muted/40 p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit">
              Workspace hub
            </Badge>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Danh sách workspace</h1>
              <p className="mt-1 max-w-3xl text-sm leading-7 text-muted-foreground">
                Theo dõi các workspace hiện có, vai trò của bạn, thành viên tham gia và những nơi đội đang vận hành dự án.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-border/70 bg-card px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Tổng workspace</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{meta?.total ?? 0}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-card px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Trang hiện tại</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{meta?.page ?? page}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-card px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Số mục mỗi trang</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{meta?.limit ?? WORKSPACES_PER_PAGE}</p>
          </div>
        </div>
      </div>

      {workspacesQuery.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Không tải được danh sách workspace</CardTitle>
            <CardDescription>
              Vui lòng thử lại sau ít phút hoặc làm mới trang để đồng bộ lại dữ liệu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void workspacesQuery.refetch()}>
              Thử tải lại
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {workspacesQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: WORKSPACES_PER_PAGE }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <Skeleton className="h-9 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {!workspacesQuery.isLoading && !workspacesQuery.isError && workspaces.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Bạn chưa có workspace nào</CardTitle>
            <CardDescription>
              Tạo workspace đầu tiên để bắt đầu quản lý dự án, thành viên và tiến độ công việc trong cùng một nơi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateWorkspaceDialog page={page} limit={WORKSPACES_PER_PAGE} buttonClassName="h-9" />
          </CardContent>
        </Card>
      ) : null}

      {!workspacesQuery.isLoading && !workspacesQuery.isError && workspaces.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace, index) => (
            <Card key={workspace.id} className="h-full">
              <CardHeader className="gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar size="lg" className="rounded-md">
                      {workspace.logo ? (
                        <AvatarImage src={workspace.logo} alt={workspace.name} className="rounded-md" />
                      ) : null}
                      <AvatarFallback
                        className={cn(
                          "rounded-md font-semibold text-white",
                          index % 3 === 0 && "bg-primary",
                          index % 3 === 1 && "bg-[#6554C0]",
                          index % 3 === 2 && "bg-[#00875A]",
                        )}
                      >
                        {workspace.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <CardTitle className="truncate">{workspace.name}</CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        <span>Cập nhật {new Date(workspace.updatedAt).toLocaleDateString("vi-VN")}</span>
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={workspaceRoleVariantMap[workspace.role]}>
                      {getWorkspaceRoleLabel(workspace.role)}
                    </Badge>
                    <Badge variant="secondary">Đang hoạt động</Badge>
                  </div>
                </div>

                <CardDescription className="min-h-12 leading-7">
                  {workspace.description || "Workspace này chưa có mô tả. Bạn có thể cập nhật sau khi đội bắt đầu làm việc."}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex h-full flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border/70 bg-muted/40 px-4 py-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">Thành viên</span>
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{workspace.memberCount}</p>
                  </div>

                  <div className="rounded-md border border-border/70 bg-muted/40 px-4 py-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FolderKanban className="h-4 w-4" />
                      <span className="text-sm">Dự án</span>
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{workspace.projectCount}</p>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LayoutGrid className="h-4 w-4" />
                    <span>Workspace #{workspace.id}</span>
                  </div>

                  <Link to={`/workspaces/${workspace.slug}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                    <span>Xem chi tiết</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-md border border-border/80 bg-muted/25 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Trang {meta?.page ?? page}
          {meta?.totalPages ? ` / ${meta.totalPages}` : ""} - Tổng {meta?.total ?? 0} workspace
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => updatePage(page - 1)} disabled={page <= 1}>
            Trước
          </Button>
          <Button
            variant="outline"
            onClick={() => updatePage(page + 1)}
            disabled={!meta || page >= meta.totalPages}
          >
            Sau
          </Button>
        </div>
      </div>
    </section>
  )
}
