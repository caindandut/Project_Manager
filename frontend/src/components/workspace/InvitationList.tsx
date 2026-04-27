import { LoaderCircle, Mail, X } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCancelWorkspaceInvitationMutation } from "@/hooks/useWorkspaces"
import { toVietnameseErrorMessage } from "@/lib/error-messages"
import { getWorkspaceRoleLabel } from "@/lib/workspace-role"
import type { PendingInvitation } from "@/types/workspace"

interface InvitationListProps {
  workspaceId: number
  invitations: PendingInvitation[]
  isLoading: boolean
  canManage: boolean
}

export default function InvitationList({
  workspaceId,
  invitations,
  isLoading,
  canManage,
}: InvitationListProps) {
  const cancelMutation = useCancelWorkspaceInvitationMutation(workspaceId)

  const handleCancelInvitation = async (invitation: PendingInvitation) => {
    const confirmed = window.confirm(`Hủy lời mời gửi đến ${invitation.email}?`)

    if (!confirmed) {
      return
    }

    try {
      await cancelMutation.mutateAsync(invitation.id)
      toast.success("Đã hủy lời mời.")
    } catch (error) {
      toast.error(toVietnameseErrorMessage(error, "Không thể hủy lời mời."))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Lời mời đã gửi</p>
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-md border border-border/80 bg-muted/20 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>
        ))}
      </div>
    )
  }

  if (invitations.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Lời mời đã gửi</p>
        <div className="rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-4 text-center">
          <p className="text-sm text-muted-foreground">Chưa có lời mời nào đang chờ.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Lời mời đã gửi</p>
      <div className="space-y-2">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between rounded-md border border-border/80 bg-muted/20 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                {invitation.invitedBy.avatar ? (
                  <AvatarImage src={invitation.invitedBy.avatar} alt={invitation.invitedBy.name ?? ""} />
                ) : null}
                <AvatarFallback className="text-xs">
                  {(invitation.invitedBy.name || invitation.invitedBy.email).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium">{invitation.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-xs">
                    {getWorkspaceRoleLabel(invitation.role)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    bởi {invitation.invitedBy.name || invitation.invitedBy.email}
                  </span>
                </div>
              </div>
            </div>

            {canManage ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                disabled={cancelMutation.isPending}
                onClick={() => void handleCancelInvitation(invitation)}
              >
                {cancelMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                <span className="sr-only">Hủy lời mời</span>
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
