import { useState, useMemo } from "react"
import { Search, UserPlus } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDebounce } from "@/hooks/useDebounce"
import { useWorkspaceMembersQuery } from "@/hooks/useWorkspaces"
import { useProjectMembersQuery, useAddProjectMemberMutation } from "@/hooks/useProjectMembers"
import type { WorkspaceMember } from "@/types/workspace"

// ============================================================
// Props
// ============================================================

interface InviteProjectMemberDialogProps {
  projectId: number
  workspaceId: string | number
}

// ============================================================
// Component
// ============================================================

export default function InviteProjectMemberDialog({
  projectId,
  workspaceId,
}: InviteProjectMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedRole, setSelectedRole] = useState<"MEMBER" | "GUEST">("MEMBER")
  const [invitingUserId, setInvitingUserId] = useState<number | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const workspaceMembersQuery = useWorkspaceMembersQuery(workspaceId, 1, 100)
  const projectMembersQuery = useProjectMembersQuery(projectId)
  const addMutation = useAddProjectMemberMutation(projectId)

  // Filter workspace members who are NOT yet in the project
  const availableMembers = useMemo(() => {
    const wsMembers = workspaceMembersQuery.data?.data ?? []
    const projectMemberUserIds = new Set(
      (projectMembersQuery.data?.data ?? []).map((m) => m.user.id),
    )

    const filtered = wsMembers.filter((wm) => !projectMemberUserIds.has(wm.user.id))

    if (!debouncedSearch.trim()) return filtered

    const q = debouncedSearch.toLowerCase()
    return filtered.filter(
      (wm) =>
        wm.user.name?.toLowerCase().includes(q) || wm.user.email.toLowerCase().includes(q),
    )
  }, [workspaceMembersQuery.data, projectMembersQuery.data, debouncedSearch])

  const handleInvite = (userId: number) => {
    setInvitingUserId(userId)
    addMutation.mutate(
      { userId, role: selectedRole },
      {
        onSuccess: () => {
          setInvitingUserId(null)
          // Don't close dialog so user can invite more
        },
        onError: () => {
          setInvitingUserId(null)
        },
      },
    )
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setSearch("")
      setSelectedRole("MEMBER")
      setInvitingUserId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Mời thành viên
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mời thành viên vào dự án</DialogTitle>
          <DialogDescription>
            Tìm và mời thành viên workspace vào dự án này.
          </DialogDescription>
        </DialogHeader>

        {/* Role selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Vai trò:
          </label>
          <Select
            value={selectedRole}
            onValueChange={(v) => setSelectedRole(v as "MEMBER" | "GUEST")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MEMBER">Thành viên</SelectItem>
              <SelectItem value="GUEST">Khách</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto space-y-1 rounded-lg border p-1">
          {workspaceMembersQuery.isLoading ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Đang tải...</p>
          ) : availableMembers.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                {search.trim()
                  ? "Không tìm thấy thành viên phù hợp"
                  : "Tất cả thành viên workspace đã trong dự án"}
              </p>
            </div>
          ) : (
            availableMembers.map((wm) => (
              <MemberRow
                key={wm.id}
                member={wm}
                isInviting={invitingUserId === wm.user.id}
                onInvite={() => handleInvite(wm.user.id)}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Sub-component
// ============================================================

function MemberRow({
  member,
  isInviting,
  onInvite,
}: {
  member: WorkspaceMember
  isInviting: boolean
  onInvite: () => void
}) {
  const initials = member.user.name
    ? member.user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : member.user.email[0].toUpperCase()

  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50">
      <Avatar className="h-9 w-9 border">
        {member.user.avatar && <AvatarImage src={member.user.avatar} alt={member.user.name ?? ""} />}
        <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{member.user.name || member.user.email}</p>
        <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="h-8 shrink-0 gap-1.5"
        disabled={isInviting}
        onClick={onInvite}
      >
        {isInviting ? (
          "Đang mời..."
        ) : (
          <>
            <UserPlus className="h-3.5 w-3.5" />
            Mời
          </>
        )}
      </Button>
    </div>
  )
}
