import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, LoaderCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { AuthDivider } from '@/components/auth/AuthDivider'
import { useAuth } from '@/hooks/useAuth'
import { toVietnameseErrorMessage } from '@/lib/error-messages'
import { getLastWorkspaceSlug } from '@/stores/authStore'

type LoginStep = 'email' | 'password'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, googleAuth, isAuthenticated } = useAuth()
  const [step, setStep] = useState<LoginStep>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginSuccessShown, setLoginSuccessShown] = useState(false)
  const lastSlug = getLastWorkspaceSlug()
  const defaultRedirect = lastSlug ? `/workspaces/${lastSlug}` : '/workspaces'
  const redirectTo = (location.state as { from?: string } | null)?.from || defaultRedirect

  useEffect(() => {
    document.title = 'Đăng nhập | Project Manager'
  }, [])

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setStep('password')
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loginSuccessShown) return

    setIsSubmitting(true)

    try {
      await login({ email, password })
      setLoginSuccessShown(true)
      toast.success('Đăng nhập thành công.')
      navigate(redirectTo, { replace: true })
    } catch (error) {
      toast.error(
        toVietnameseErrorMessage(error, 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleAuth = () => {
    void googleAuth()
  }

  const handleBack = () => {
    setStep('email')
    setPassword('')
    setLoginSuccessShown(false)
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    setLoginSuccessShown(false)
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    setLoginSuccessShown(false)
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[400px]">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-8 shadow-sm backdrop-blur-sm">
          {step === 'email' ? (
            <>
              <div className="mb-8 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">Chào mừng trở lại</h1>
                <p className="mt-2 text-sm text-muted-foreground">Đăng nhập vào Project Manager</p>
              </div>

              <div className="space-y-4">
                <GoogleButton onClick={handleGoogleAuth} label="Đăng nhập với Google" />

                <AuthDivider />

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      className="pl-10"
                      required
                    />
                    </div>
                  </div>

                  <Button type="submit" className="h-10 w-full" disabled={!email}>
                    Tiếp tục
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleBack}
                className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Quay lại</span>
              </button>

              <div className="mb-6">
                <h1 className="text-xl font-semibold tracking-tight">Nhập mật khẩu</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Đăng nhập với <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Mật khẩu
                    </Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary transition-colors hover:underline"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="Nhập mật khẩu của bạn"
                    className="h-10"
                    required
                  />
                </div>

                  <Button type="submit" className="h-10 w-full" disabled={isSubmitting || !password || loginSuccessShown}>
                    {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : 'Đăng nhập'}
                  </Button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-medium text-foreground underline underline-offset-4">
              Đăng ký
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
