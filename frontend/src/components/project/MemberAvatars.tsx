import { Users } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useProjectMembersQuery } from "@/hooks/useProjectMembers"
import InviteProjectMemberDialog from "@/components/project/InviteProjectMemberDialog"

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MEMBER: "Thành viên",
  GUEST: "Khách",
}

interface MemberAvatarsProps {
  projectId: number
  workspaceId?: number
  canManage: boolean
}

export default function MemberAvatars({ projectId, workspaceId, canManage }: MemberAvatarsProps) {
  const membersQuery = useProjectMembersQuery(projectId)
  const members = membersQuery.data?.data ?? []
  const isLoading = membersQuery.isLoading
  const maxShow = 8
  const shown = members.slice(0, maxShow)
  const remaining = members.length - maxShow

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-9 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card id="members-section">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Thành viên
          </CardTitle>
          {canManage && workspaceId && (
            <InviteProjectMemberDialog
              projectId={projectId}
              workspaceId={workspaceId}
            />
          )}
        </div>
        <CardDescription>{members.length} thành viên</CardDescription>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Chưa có thành viên</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {shown.map((member) => {
              const initials = member.user.name
                ? member.user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
                : member.user.email[0].toUpperCase()

              return (
                <Tooltip key={member.id}>
                  <TooltipTrigger asChild>
                    <Avatar className="h-9 w-9 border-2 border-background cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
                      {member.user.avatar && <AvatarImage src={member.user.avatar} />}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs px-3 py-1.5 rounded-lg bg-popover border shadow-md">
                    <p className="font-medium">{member.user.name || member.user.email}</p>
                    <p className="text-muted-foreground">{ROLE_LABELS[member.role] || member.role}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}

            {remaining > 0 && (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                +{remaining}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
