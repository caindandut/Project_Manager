import { Bell, MonitorCog, ShieldCheck } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const settingCards = [
  {
    title: "Thông báo hệ thống",
    description: "Quản lý cách bạn nhận cảnh báo, cập nhật workspace và thông tin cộng tác.",
    icon: Bell,
    href: "/settings/notifications",
  },
  {
    title: "Tùy chọn giao diện",
    description: "Điều chỉnh shell, sidebar và các thiết lập hiển thị cho không gian làm việc.",
    icon: MonitorCog,
    href: null,
  },
  {
    title: "Bảo mật và quyền",
    description: "Theo dõi quyền truy cập, vai trò và các cài đặt an toàn cho toàn hệ thống.",
    icon: ShieldCheck,
    href: null,
  },
] as const

export default function SettingsPage() {
  const navigate = useNavigate()

  return (
    <section className="space-y-6">
      <div className="rounded-md border border-border/80 bg-muted/40 p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Cài đặt hệ thống</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
          Quản lý các thiết lập cá nhân và hệ thống cho tài khoản của bạn.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {settingCards.map((item) => {
          const Icon = item.icon
          const isClickable = !!item.href

          return (
            <Card
              key={item.title}
              className={isClickable ? "cursor-pointer transition-shadow hover:shadow-md" : ""}
              onClick={() => isClickable && navigate(item.href)}
            >
              <CardHeader className="gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription className="mt-2 leading-7">{item.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-1 text-sm leading-7 text-muted-foreground">
                {isClickable
                  ? "Nhấp để cấu hình chi tiết."
                  : "Chưa có tích hợp backend cho phần này, nhưng layout và entry point đã sẵn sàng để mở rộng."}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
