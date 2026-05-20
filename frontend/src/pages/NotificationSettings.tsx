import { ArrowLeft, Bell, Loader2, Mail, MonitorSmartphone } from "lucide-react"
import { Link } from "react-router-dom"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useNotificationPreferencesQuery, useUpdatePreferenceMutation } from "@/hooks/useNotifications"

export default function NotificationSettingsPage() {
  const prefsQuery = useNotificationPreferencesQuery()
  const updatePrefMutation = useUpdatePreferenceMutation()

  const preferences = prefsQuery.data ?? []

  const handleToggleEmail = (eventType: string, currentValue: boolean) => {
    updatePrefMutation.mutate({ eventType, email: !currentValue })
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="rounded-md border border-border/80 bg-muted/40 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <Link
            to="/settings"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Cài đặt thông báo</h1>
            <p className="text-sm text-muted-foreground">
              Tùy chỉnh cách bạn nhận thông báo cho từng loại sự kiện
            </p>
          </div>
        </div>
      </div>

      {/* Preferences table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kênh thông báo</CardTitle>
          <CardDescription>
            Chọn kênh thông báo cho mỗi loại sự kiện. Thông báo trong ứng dụng luôn bật.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {prefsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_120px_120px] items-center gap-4 border-b border-border/40 bg-muted/30 px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sự kiện
                </span>
                <span className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <MonitorSmartphone className="h-3.5 w-3.5" />
                  Ứng dụng
                </span>
                <span className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </span>
              </div>

              {/* Table rows */}
              {preferences.map((pref, index) => (
                <div
                  key={pref.eventType}
                  className={`grid grid-cols-[1fr_120px_120px] items-center gap-4 px-4 py-3.5 ${
                    index < preferences.length - 1 ? "border-b border-border/20" : ""
                  }`}
                >
                  {/* Event name */}
                  <div className="flex items-center gap-3">
                    <span className="text-base">{eventIcons[pref.eventType] ?? "🔔"}</span>
                    <span className="text-sm font-medium text-foreground">{pref.eventLabel}</span>
                  </div>

                  {/* In-app toggle (always on, disabled) */}
                  <div className="flex justify-center">
                    <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary/80 cursor-not-allowed opacity-70">
                      <span className="absolute right-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform" />
                    </div>
                  </div>

                  {/* Email toggle */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={pref.email}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        pref.email ? "bg-primary" : "bg-muted-foreground/20"
                      }`}
                      onClick={() => handleToggleEmail(pref.eventType, pref.email)}
                      disabled={updatePrefMutation.isPending}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          pref.email ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <div className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Lưu ý:</strong> Thông báo trong ứng dụng (in-app) luôn được bật để đảm bảo
          bạn không bỏ lỡ các cập nhật quan trọng. Bạn chỉ có thể bật/tắt thông báo qua email.
        </p>
      </div>
    </section>
  )
}

const eventIcons: Record<string, string> = {
  TASK_ASSIGNED: "📋",
  TASK_STATUS_CHANGED: "🔄",
  TASK_COMMENTED: "💬",
  TASK_UPDATED: "✏️",
  MENTION: "📣",
}
