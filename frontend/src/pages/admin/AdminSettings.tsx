import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminSettings, useUpdateSettingsMutation } from '@/hooks/useAdmin'
import type { UpsertSettingInput } from '@/types/admin'

interface SettingField {
  key: string
  label: string
  placeholder: string
  type?: 'text' | 'password'
  category: string
}

const settingGroups: { title: string; description: string; category: string; fields: SettingField[] }[] = [
  {
    title: 'Ứng dụng',
    description: 'Tùy chỉnh tên, slogan và logo của ứng dụng.',
    category: 'app',
    fields: [
      { key: 'app_name', label: 'Tên ứng dụng', placeholder: 'PM Tool', category: 'app' },
      { key: 'app_slogan', label: 'Slogan', placeholder: 'Quản lý dự án hiệu quả', category: 'app' },
      { key: 'app_logo_url', label: 'Logo URL', placeholder: 'https://example.com/logo.png', category: 'app' },
    ],
  },
  {
    title: 'OAuth (Google)',
    description: 'Cấu hình đăng nhập Google. Nếu để trống, sẽ dùng giá trị mặc định từ .env.',
    category: 'oauth',
    fields: [
      { key: 'google_client_id', label: 'Google Client ID', placeholder: '(đang dùng giá trị mặc định từ .env)', category: 'oauth' },
      { key: 'google_client_secret', label: 'Google Client Secret', placeholder: '(đang dùng giá trị mặc định từ .env)', type: 'password', category: 'oauth' },
    ],
  },
  {
    title: 'SMTP (Email)',
    description: 'Cấu hình máy chủ email. Nếu để trống, sẽ dùng giá trị mặc định từ .env.',
    category: 'smtp',
    fields: [
      { key: 'smtp_host', label: 'SMTP Host', placeholder: '(đang dùng giá trị mặc định từ .env)', category: 'smtp' },
      { key: 'smtp_port', label: 'SMTP Port', placeholder: '(đang dùng giá trị mặc định từ .env)', category: 'smtp' },
      { key: 'smtp_user', label: 'SMTP User', placeholder: '(đang dùng giá trị mặc định từ .env)', category: 'smtp' },
      { key: 'smtp_pass', label: 'SMTP Password', placeholder: '(đang dùng giá trị mặc định từ .env)', type: 'password', category: 'smtp' },
    ],
  },
]

export default function AdminSettings() {
  const settingsQuery = useAdminSettings()
  const updateMutation = useUpdateSettingsMutation()
  const [values, setValues] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState(false)

  // Initialize values from loaded settings
  useEffect(() => {
    if (settingsQuery.data) {
      const initial: Record<string, string> = {}
      for (const setting of settingsQuery.data) {
        initial[setting.key] = setting.value
      }
      setValues(initial)
      setIsDirty(false)
    }
  }, [settingsQuery.data])

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    // Collect all changed/non-empty settings
    const settings: UpsertSettingInput[] = []

    for (const group of settingGroups) {
      for (const field of group.fields) {
        const val = values[field.key]
        if (val !== undefined && val !== '') {
          settings.push({
            key: field.key,
            value: val,
            category: field.category,
          })
        }
      }
    }

    if (settings.length === 0) {
      toast.info('Không có thay đổi nào để lưu.')
      return
    }

    try {
      await updateMutation.mutateAsync(settings)
      toast.success('Đã lưu cài đặt thành công!')
      setIsDirty(false)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cài đặt hệ thống</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý cấu hình ứng dụng, OAuth và SMTP.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!isDirty || updateMutation.isPending}
          className="gap-2"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Lưu thay đổi
        </Button>
      </div>

      {settingsQuery.isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        settingGroups.map((group, groupIndex) => (
          <Card key={group.category} className="border-border">
            <CardHeader>
              <CardTitle className="text-base">{group.title}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.fields.map((field) => (
                <div key={field.key}>
                  <Label htmlFor={field.key} className="text-sm">
                    {field.label}
                  </Label>
                  <Input
                    id={field.key}
                    type={field.type || 'text'}
                    placeholder={field.placeholder}
                    value={values[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              ))}
              {groupIndex < settingGroups.length - 1 && <Separator className="mt-2" />}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
