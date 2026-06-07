import { useState } from 'react'
import { Building2, FolderKanban, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOwnerProjects, useOwnerWorkspaces } from '@/hooks/useAdmin'
import { useDebounce } from '@/hooks/useDebounce'

export default function OwnerOversight() {
  const [workspacePage, setWorkspacePage] = useState(1)
  const [projectPage, setProjectPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'workspaces' | 'projects'>('workspaces')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 350)
  const limit = 12

  const workspacesQuery = useOwnerWorkspaces({
    page: workspacePage,
    limit,
    search: debouncedSearch || undefined,
  })
  const projectsQuery = useOwnerProjects({
    page: projectPage,
    limit,
    search: debouncedSearch || undefined,
  })

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Giám sát Workspace & Dự án</h1>
        <p className="text-sm text-muted-foreground">
          Chế độ quan sát toàn hệ thống. Owner xem phạm vi, số lượng thành viên và khối lượng công việc, không can thiệp setup dự án tại đây.
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setWorkspacePage(1)
                setProjectPage(1)
              }}
              placeholder="Tìm workspace, slug, dự án hoặc mã dự án..."
              className="h-9 pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs className="space-y-4">
        <TabsList>
          <TabsTrigger
            type="button"
            data-state={activeTab === 'workspaces' ? 'active' : 'inactive'}
            onClick={() => setActiveTab('workspaces')}
            className="gap-2"
          >
            <Building2 className="h-4 w-4" /> Workspaces
          </TabsTrigger>
          <TabsTrigger
            type="button"
            data-state={activeTab === 'projects' ? 'active' : 'inactive'}
            onClick={() => setActiveTab('projects')}
            className="gap-2"
          >
            <FolderKanban className="h-4 w-4" /> Dự án
          </TabsTrigger>
        </TabsList>

        {activeTab === 'workspaces' && (
        <TabsContent>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                Workspaces
                <span className="text-sm font-normal text-muted-foreground">
                  {workspacesQuery.data?.meta.total ?? 0} workspace
                </span>
              </CardTitle>
              <CardDescription>Thành viên, admin, dự án và task trong từng workspace.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {workspacesQuery.isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Admins</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Dự án</TableHead>
                      <TableHead>Tasks</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workspacesQuery.data?.data.length ? (
                      workspacesQuery.data.data.map((workspace) => (
                        <TableRow key={workspace.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{workspace.name}</p>
                              <p className="text-xs text-muted-foreground">/{workspace.slug}</p>
                            </div>
                          </TableCell>
                          <TableCell>{workspace.adminCount}</TableCell>
                          <TableCell>{workspace.memberCount}</TableCell>
                          <TableCell>{workspace.projectCount}</TableCell>
                          <TableCell>{workspace.taskCount}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(workspace.createdAt).toLocaleDateString('vi-VN')}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Không có workspace phù hợp.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            {(workspacesQuery.data?.meta.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-center gap-2 border-t p-3">
                <Button variant="outline" size="sm" disabled={workspacePage <= 1} onClick={() => setWorkspacePage((value) => value - 1)}>
                  Trước
                </Button>
                <span className="text-sm text-muted-foreground">{workspacePage} / {workspacesQuery.data?.meta.totalPages}</span>
                <Button variant="outline" size="sm" disabled={workspacePage >= (workspacesQuery.data?.meta.totalPages ?? 1)} onClick={() => setWorkspacePage((value) => value + 1)}>
                  Sau
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>
        )}

        {activeTab === 'projects' && (
        <TabsContent>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                Dự án
                <span className="text-sm font-normal text-muted-foreground">
                  {projectsQuery.data?.meta.total ?? 0} dự án
                </span>
              </CardTitle>
              <CardDescription>Owner xem chủ sở hữu, workspace, thành viên và task quá hạn.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {projectsQuery.isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dự án</TableHead>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Người tạo</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Tasks</TableHead>
                      <TableHead>Quá hạn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectsQuery.data?.data.length ? (
                      projectsQuery.data.data.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color ?? '#64748b' }} />
                              <div>
                                <p className="font-medium">{project.name}</p>
                                <p className="text-xs text-muted-foreground">{project.key}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{project.workspace.name}</p>
                              <p className="text-xs text-muted-foreground">/{project.workspace.slug}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{project.owner.name}</p>
                            <p className="text-xs text-muted-foreground">{project.owner.email}</p>
                          </TableCell>
                          <TableCell>{project.memberCount}</TableCell>
                          <TableCell>{project.taskCount}</TableCell>
                          <TableCell>
                            {project.overdueTaskCount > 0 ? (
                              <Badge variant="destructive">{project.overdueTaskCount}</Badge>
                            ) : (
                              <Badge variant="outline">0</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Không có dự án phù hợp.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            {(projectsQuery.data?.meta.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-center gap-2 border-t p-3">
                <Button variant="outline" size="sm" disabled={projectPage <= 1} onClick={() => setProjectPage((value) => value - 1)}>
                  Trước
                </Button>
                <span className="text-sm text-muted-foreground">{projectPage} / {projectsQuery.data?.meta.totalPages}</span>
                <Button variant="outline" size="sm" disabled={projectPage >= (projectsQuery.data?.meta.totalPages ?? 1)} onClick={() => setProjectPage((value) => value + 1)}>
                  Sau
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
