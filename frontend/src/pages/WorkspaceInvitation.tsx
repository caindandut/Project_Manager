import { useMemo } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Clock, LoaderCircle, Mail, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  acceptWorkspaceInvitation,
  declineWorkspaceInvitation,
  getMyWorkspaceInvitations,
} from "@/lib/workspace-api"
import { toVietnameseErrorMessage } from "@/lib/error-messages"
import type { PendingInvitation } from "@/types/workspace"

const STATUS_LABELS: Record<PendingInvitation["status"], string> = {
  PENDING: "Đang chờ",
  ACCEPTED: "Đã chấp nhận",
  DECLINED: "Đã từ chối",
  EXPIRED: "Hết hạn",
}

const STATUS_VARIANTS: Record<PendingInvitation["status"], "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  ACCEPTED: "default",
  DECLINED: "destructive",
  EXPIRED: "outline",
}

export default function WorkspaceInvitationPage() {
  const [searchParams] = useSearchParams()
  const highlightedToken = searchParams.get("token")
  const queryClient = useQueryClient()

  const invitationsQuery = useQuery({
    queryKey: ["my-workspace-invitations"],
    queryFn: getMyWorkspaceInvitations,
  })

  const answerMutation = useMutation({
    mutationFn: ({ token, action }: { token: string; action: "accept" | "decline" }) =>
      action === "accept" ? acceptWorkspaceInvitation(token) : declineWorkspaceInvitation(token),
    onSuccess: async (_data, variables) => {
      toast.success(variables.action === "accept" ? "Đã chấp nhận lời mời." : "Đã từ chối lời mời.")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-workspace-invitations"] }),
        queryClient.invalidateQueries({ queryKey: ["workspaces"] }),
      ])
    },
    onError: (error) => {
      toast.error(toVietnameseErrorMessage(error, "Không thể cập nhật lời mời."))
    },
  })

  const invitations = useMemo(() => {
    const data = invitationsQuery.data ?? []
    if (!highlightedToken) return data

    return [...data].sort((a, b) => {
      const aMatches = a.token === highlightedToken ? -1 : 0
      const bMatches = b.token === highlightedToken ? -1 : 0
      return aMatches - bMatches
    })
  }, [highlightedToken, invitationsQuery.data])

  const pendingCount = invitations.filter((invitation) => invitation.status === "PENDING").length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Lời mời của tôi</h1>
          <p className="text-sm text-muted-foreground">
            Xem và xử lý lời mời tham gia workspace.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{pendingCount} lời mời đang chờ</span>
          </div>
        </div>

        {invitationsQuery.isLoading ? (
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
        ) : invitations.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">Bạn chưa có lời mời workspace nào.</p>
          </div>
        ) : (
          <div className="divide-y">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium">{invitation.workspace?.name ?? "Workspace"}</h2>
                    <Badge variant={STATUS_VARIANTS[invitation.status]}>
                      {STATUS_LABELS[invitation.status]}
                    </Badge>
                    <Badge variant="secondary">{invitation.role}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mời bởi {invitation.invitedBy.name || invitation.invitedBy.email} đến {invitation.email}
                  </p>
                </div>

                {invitation.status === "PENDING" ? (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      disabled={answerMutation.isPending}
                      onClick={() => answerMutation.mutate({ token: invitation.token, action: "decline" })}
                    >
                      {answerMutation.isPending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Từ chối
                    </Button>
                    <Button
                      disabled={answerMutation.isPending}
                      onClick={() => answerMutation.mutate({ token: invitation.token, action: "accept" })}
                    >
                      {answerMutation.isPending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Chấp nhận
                    </Button>
                  </div>
                ) : invitation.status === "ACCEPTED" && invitation.workspace?.slug ? (
                  <Button variant="outline">
                    <Link to={`/workspaces/${invitation.workspace.slug}`}>Mở workspace</Link>
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
