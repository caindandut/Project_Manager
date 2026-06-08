import { useEffect, useState } from "react"
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom"
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import {
  acceptWorkspaceInvitation,
  declineWorkspaceInvitationByToken,
  getWorkspaceInvitationByToken,
} from "@/lib/workspace-api"
import { toVietnameseErrorMessage } from "@/lib/error-messages"
import { cn } from "@/lib/utils"
import { setLastWorkspaceSlug, useAuthStore } from "@/stores/authStore"

type InvitationAction = "accept" | "decline"

export default function WorkspaceInvitationActionPage() {
  const params = useParams<{ token: string; action: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, isBootstrappingAuth } = useAuth()
  const setRequireOnboarding = useAuthStore((state) => state.setRequireOnboarding)
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  const token = params.token || ""
  const action = params.action as InvitationAction | undefined

  useEffect(() => {
    if (isBootstrappingAuth || !token || (action !== "accept" && action !== "decline")) {
      return
    }

    let cancelled = false

    const run = async () => {
      setStatus("loading")
      setMessage("")

      try {
        const invitation = await getWorkspaceInvitationByToken(token)
        if (cancelled) return

        if (action === "accept") {
          if (!isAuthenticated) {
            if (invitation.isExistingUser) {
              const redirectUrl = `${location.pathname}${location.search}`
              window.localStorage.setItem("redirectAfterLogin", redirectUrl)
              navigate("/login", {
                replace: true,
                state: { from: redirectUrl },
              })
              return
            }

            const params = new URLSearchParams({
              invitation: token,
              email: invitation.email,
            })
            const redirectUrl = `${location.pathname}${location.search}`
            window.localStorage.setItem("redirectAfterLogin", redirectUrl)
            navigate(`/register?${params.toString()}`, { replace: true, state: { from: redirectUrl } })
            return
          }

          const acceptedInvitation = await acceptWorkspaceInvitation(token)
          if (cancelled) return
          setRequireOnboarding(false)

          if (acceptedInvitation.workspace?.slug) {
            setLastWorkspaceSlug(acceptedInvitation.workspace.slug, user?.id)
            toast.success("Đã chấp nhận lời mời workspace.")
            navigate(`/workspaces/${acceptedInvitation.workspace.slug}`, { replace: true })
            return
          }

          toast.success("Đã chấp nhận lời mời workspace.")
          navigate("/workspaces", { replace: true })
          return
        }

        await declineWorkspaceInvitationByToken(token)

        if (!cancelled) {
          setStatus("success")
          setMessage(`Bạn đã từ chối lời mời tham gia ${invitation.workspace?.name ?? "workspace"}.`)
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error")
          setMessage(toVietnameseErrorMessage(error, "Không thể xử lý lời mời."))
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [
    action,
    isAuthenticated,
    isBootstrappingAuth,
    location.pathname,
    location.search,
    navigate,
    setRequireOnboarding,
    token,
    user?.id,
  ])

  if (!token || (action !== "accept" && action !== "decline")) {
    return <Navigate to="/login" replace />
  }

  const isLoading = isBootstrappingAuth || status === "loading"

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {isLoading ? (
              <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : status === "success" ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <XCircle className="h-6 w-6 text-destructive" />
            )}
          </div>
          <CardTitle>
            {isLoading
              ? "Đang xử lý lời mời"
              : status === "success"
              ? "Đã cập nhật lời mời"
              : "Không thể xử lý lời mời"}
          </CardTitle>
          <CardDescription>
            {isLoading
              ? "Vui lòng chờ trong giây lát."
              : message}
          </CardDescription>
        </CardHeader>

        {!isLoading ? (
          <CardContent>
            {isAuthenticated ? (
              <Button onClick={() => navigate("/workspaces")}>Về workspace</Button>
            ) : (
              <Link to="/login" className={cn(buttonVariants())}>
                Đăng nhập
              </Link>
            )}
          </CardContent>
        ) : null}
      </Card>
    </div>
  )
}
