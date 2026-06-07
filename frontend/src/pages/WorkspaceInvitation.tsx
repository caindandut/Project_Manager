import { useMemo, type ReactNode } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Clock, FolderKanban, Inbox, LoaderCircle, Mail, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { NOTIFICATION_REFRESH_INTERVAL_MS } from "@/hooks/useNotifications"
import { acceptProjectInvitation, declineProjectInvitation, getMyProjectInvitations } from "@/lib/project-member-api"
import {
  acceptWorkspaceInvitation,
  declineWorkspaceInvitation,
  getMyWorkspaceInvitations,
} from "@/lib/workspace-api"
import { toVietnameseErrorMessage } from "@/lib/error-messages"
import { cn } from "@/lib/utils"
import { useRealtimeStore } from "@/lib/realtime"
import type { ProjectInvitation } from "@/lib/project-member-api"
import type { PendingInvitation } from "@/types/workspace"

type InvitationStatus = PendingInvitation["status"]
type InvitationTab = "all" | "workspaces" | "projects"

const STATUS_LABELS: Record<InvitationStatus, string> = {
  PENDING: "Đang chờ",
  ACCEPTED: "Đã chấp nhận",
  DECLINED: "Đã từ chối",
  EXPIRED: "Hết hạn",
}

const STATUS_VARIANTS: Record<InvitationStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  ACCEPTED: "default",
  DECLINED: "destructive",
  EXPIRED: "outline",
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MEMBER: "Member",
  GUEST: "Guest",
}

const getInitialTab = (value: string | null): InvitationTab => {
  if (value === "workspaces" || value === "projects") return value
  return "all"
}

export default function WorkspaceInvitationPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightedToken = searchParams.get("token")
  const highlightedProjectInvitationId = Number(searchParams.get("projectInvitation") ?? 0)
  const activeTab = getInitialTab(searchParams.get("tab"))
  const queryClient = useQueryClient()
  const isRealtimeConnected = useRealtimeStore((state) => state.isConnected)

  const workspaceInvitationsQuery = useQuery({
    queryKey: ["my-workspace-invitations"],
    queryFn: getMyWorkspaceInvitations,
    refetchInterval: isRealtimeConnected ? false : NOTIFICATION_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  const projectInvitationsQuery = useQuery({
    queryKey: ["my-project-invitations"],
    queryFn: getMyProjectInvitations,
    refetchInterval: isRealtimeConnected ? false : NOTIFICATION_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  const workspaceAnswerMutation = useMutation({
    mutationFn: ({ token, action }: { token: string; action: "accept" | "decline" }) =>
      action === "accept" ? acceptWorkspaceInvitation(token) : declineWorkspaceInvitation(token),
    onSuccess: async (_data, variables) => {
      toast.success(variables.action === "accept" ? "Đã chấp nhận lời mời workspace." : "Đã từ chối lời mời workspace.")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-workspace-invitations"] }),
        queryClient.invalidateQueries({ queryKey: ["workspaces"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ])
    },
    onError: (error) => {
      toast.error(toVietnameseErrorMessage(error, "Không thể cập nhật lời mời."))
    },
  })

  const projectAnswerMutation = useMutation({
    mutationFn: ({ invitation, action }: { invitation: ProjectInvitation; action: "accept" | "decline" }) =>
      action === "accept"
        ? acceptProjectInvitation(invitation.project.id, invitation.id)
        : declineProjectInvitation(invitation.project.id, invitation.id),
    onSuccess: async (_data, variables) => {
      toast.success(variables.action === "accept" ? "Đã chấp nhận lời mời dự án." : "Đã từ chối lời mời dự án.")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-project-invitations"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-projects"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ])
    },
    onError: (error) => {
      toast.error(toVietnameseErrorMessage(error, "Không thể cập nhật lời mời dự án."))
    },
  })

  const workspaceInvitations = useMemo(() => {
    const data = workspaceInvitationsQuery.data ?? []
    if (!highlightedToken) return data

    return [...data].sort((a, b) => {
      const aMatches = a.token === highlightedToken ? -1 : 0
      const bMatches = b.token === highlightedToken ? -1 : 0
      return aMatches - bMatches
    })
  }, [highlightedToken, workspaceInvitationsQuery.data])

  const projectInvitations = useMemo(() => {
    const data = projectInvitationsQuery.data ?? []
    if (!highlightedProjectInvitationId) return data

    return [...data].sort((a, b) => {
      const aMatches = a.id === highlightedProjectInvitationId ? -1 : 0
      const bMatches = b.id === highlightedProjectInvitationId ? -1 : 0
      return aMatches - bMatches
    })
  }, [highlightedProjectInvitationId, projectInvitationsQuery.data])

  const workspacePendingCount = workspaceInvitations.filter((invitation) => invitation.status === "PENDING").length
  const projectPendingCount = projectInvitations.filter((invitation) => invitation.status === "PENDING").length
  const pendingCount = workspacePendingCount + projectPendingCount
  const isLoading = workspaceInvitationsQuery.isLoading || projectInvitationsQuery.isLoading
  const showWorkspaceSection = activeTab === "all" || activeTab === "workspaces"
  const showProjectSection = activeTab === "all" || activeTab === "projects"
  const visibleCount =
    (showWorkspaceSection ? workspaceInvitations.length : 0) +
    (showProjectSection ? projectInvitations.length : 0)

  const setTab = (tab: InvitationTab) => {
    const nextParams = new URLSearchParams(searchParams)
    if (tab === "all") {
      nextParams.delete("tab")
    } else {
      nextParams.set("tab", tab)
    }
    setSearchParams(nextParams)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Lời mời của tôi</h1>
            <p className="text-sm text-muted-foreground">
              Xem và xử lý lời mời tham gia workspace hoặc dự án.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{pendingCount} lời mời đang chờ</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <TabButton active={activeTab === "all"} onClick={() => setTab("all")}>
          Tất cả
        </TabButton>
        <TabButton active={activeTab === "workspaces"} onClick={() => setTab("workspaces")}>
          Workspace
          {workspacePendingCount > 0 && <Badge variant="secondary">{workspacePendingCount}</Badge>}
        </TabButton>
        <TabButton active={activeTab === "projects"} onClick={() => setTab("projects")}>
          Dự án
          {projectPendingCount > 0 && <Badge variant="secondary">{projectPendingCount}</Badge>}
        </TabButton>
      </div>

      {isLoading ? (
        <InvitationSkeleton />
      ) : visibleCount === 0 ? (
        <div className="rounded-lg border bg-card px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">Bạn chưa có lời mời nào trong mục này.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {showProjectSection && (
            <InvitationSection
              icon={<FolderKanban className="h-4 w-4 text-muted-foreground" />}
              title="Lời mời dự án"
              count={projectInvitations.length}
              emptyText="Bạn chưa có lời mời dự án nào."
            >
              {projectInvitations.map((invitation) => (
                <ProjectInvitationRow
                  key={invitation.id}
                  invitation={invitation}
                  highlighted={invitation.id === highlightedProjectInvitationId}
                  isPending={projectAnswerMutation.isPending}
                  onAnswer={(action) => projectAnswerMutation.mutate({ invitation, action })}
                />
              ))}
            </InvitationSection>
          )}

          {showWorkspaceSection && (
            <InvitationSection
              icon={<Inbox className="h-4 w-4 text-muted-foreground" />}
              title="Lời mời workspace"
              count={workspaceInvitations.length}
              emptyText="Bạn chưa có lời mời workspace nào."
            >
              {workspaceInvitations.map((invitation) => (
                <WorkspaceInvitationRow
                  key={invitation.id}
                  invitation={invitation}
                  highlighted={invitation.token === highlightedToken}
                  isPending={workspaceAnswerMutation.isPending}
                  onAnswer={(action) => workspaceAnswerMutation.mutate({ token: invitation.token, action })}
                />
              ))}
            </InvitationSection>
          )}
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function InvitationSection({
  icon,
  title,
  count,
  emptyText,
  children,
}: {
  icon: ReactNode
  title: string
  count: number
  emptyText: string
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Badge variant="secondary">{count}</Badge>
      </div>

      {count === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        <div className="divide-y">{children}</div>
      )}
    </section>
  )
}

function ProjectInvitationRow({
  invitation,
  highlighted,
  isPending,
  onAnswer,
}: {
  invitation: ProjectInvitation
  highlighted: boolean
  isPending: boolean
  onAnswer: (action: "accept" | "decline") => void
}) {
  return (
    <div className={cn("flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between", highlighted && "bg-primary/5")}>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-medium">{invitation.project.name}</h2>
          <Badge variant={STATUS_VARIANTS[invitation.status]}>{STATUS_LABELS[invitation.status]}</Badge>
          <Badge variant="secondary">{ROLE_LABELS[invitation.role] ?? invitation.role}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Dự án {invitation.project.key} trong workspace {invitation.project.workspace.name}
        </p>
      </div>

      {invitation.status === "PENDING" ? (
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" disabled={isPending} onClick={() => onAnswer("decline")}>
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Từ chối
          </Button>
          <Button disabled={isPending} onClick={() => onAnswer("accept")}>
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Chấp nhận
          </Button>
        </div>
      ) : invitation.status === "ACCEPTED" ? (
        <Button variant="outline">
          <Link to={`/workspaces/${invitation.project.workspace.slug}/projects/${invitation.project.id}/list`}>
            Mở dự án
          </Link>
        </Button>
      ) : null}
    </div>
  )
}

function WorkspaceInvitationRow({
  invitation,
  highlighted,
  isPending,
  onAnswer,
}: {
  invitation: PendingInvitation
  highlighted: boolean
  isPending: boolean
  onAnswer: (action: "accept" | "decline") => void
}) {
  return (
    <div className={cn("flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between", highlighted && "bg-primary/5")}>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-medium">{invitation.workspace?.name ?? "Workspace"}</h2>
          <Badge variant={STATUS_VARIANTS[invitation.status]}>{STATUS_LABELS[invitation.status]}</Badge>
          <Badge variant="secondary">{ROLE_LABELS[invitation.role] ?? invitation.role}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Mời bởi {invitation.invitedBy.name || invitation.invitedBy.email} đến {invitation.email}
        </p>
      </div>

      {invitation.status === "PENDING" ? (
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" disabled={isPending} onClick={() => onAnswer("decline")}>
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Từ chối
          </Button>
          <Button disabled={isPending} onClick={() => onAnswer("accept")}>
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Chấp nhận
          </Button>
        </div>
      ) : invitation.status === "ACCEPTED" && invitation.workspace?.slug ? (
        <Button variant="outline">
          <Link to={`/workspaces/${invitation.workspace.slug}`}>Mở workspace</Link>
        </Button>
      ) : null}
    </div>
  )
}

function InvitationSkeleton() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="space-y-3 p-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-72" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}
