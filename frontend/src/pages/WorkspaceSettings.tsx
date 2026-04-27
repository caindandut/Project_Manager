import { useParams } from "react-router-dom"
import { Settings } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function WorkspaceSettingsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Cài đặt Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý cài đặt cho workspace #{workspaceId}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tính năng đang phát triển</CardTitle>
          <CardDescription>
            Trang cài đặt workspace đang được xây dựng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Các tùy chọn cài đặt sẽ được thêm trong phiên bản tới.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
