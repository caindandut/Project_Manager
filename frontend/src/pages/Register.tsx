import { useEffect, useState, useRef } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, LoaderCircle, Mail, User, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { AuthDivider } from '@/components/auth/AuthDivider'
import { useAuth } from '@/hooks/useAuth'
import { toVietnameseErrorMessage } from '@/lib/error-messages'

type RegisterStep = 'email' | 'otp' | 'profile'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    googleAuth,
    isAuthenticated,
    sendOtp,
    verifyOtp,
    registerWithOtp,
    isSendOtpPending,
    isVerifyOtpPending,
    isRegisterWithOtpPending,
  } = useAuth()
  const [step, setStep] = useState<RegisterStep>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [resendTimer, setResendTimer] = useState(60)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    document.title = 'Đăng ký | Project Manager'
  }, [])

  useEffect(() => {
    const invitedEmail = searchParams.get('email')
    if (invitedEmail) {
      setEmail(invitedEmail)
    }
  }, [searchParams])

  useEffect(() => {
    if (step === 'otp' && resendTimer > 0) {
      const timer = setInterval(() => {
        setResendTimer((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [step, resendTimer])

  if (isAuthenticated) {
    return <Navigate to="/workspaces" replace />
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      try {
        await sendOtp({ email })
        setStep('otp')
        setResendTimer(60)
        toast.success('Đã gửi mã xác minh đến email của bạn')
      } catch (error) {
        toast.error(toVietnameseErrorMessage(error, 'Không thể gửi mã xác minh'))
      }
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6 - index).split('')
      const newOtp = [...otp]
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit
        }
      })
      setOtp(newOtp)
      const nextIndex = Math.min(index + digits.length, 5)
      otpRefs.current[nextIndex]?.focus()
    } else if (/^\d?$/.test(value)) {
      const newOtp = [...otp]
      newOtp[index] = value
      setOtp(newOtp)
      if (value && index < 5) {
        otpRefs.current[index + 1]?.focus()
      }
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData) {
      const newOtp = [...otp]
      pastedData.split('').forEach((digit, i) => {
        newOtp[i] = digit
      })
      setOtp(newOtp)
      otpRefs.current[Math.min(pastedData.length, 5)]?.focus()
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      toast.error('Vui lòng nhập đầy đủ 6 chữ số')
      return
    }

    try {
      await verifyOtp({ email, code: otpCode })
      toast.success('Xác minh email thành công!')
      setStep('profile')
    } catch (error) {
      toast.error(toVietnameseErrorMessage(error, 'Mã xác minh không đúng. Vui lòng thử lại.'))
      setOtp(['', '', '', '', '', ''])
    }
  }

  const handleResendOtp = async () => {
    try {
      await sendOtp({ email })
      setResendTimer(60)
      setOtp(['', '', '', '', '', ''])
      toast.success('Đã gửi lại mã xác minh')
    } catch (error) {
      toast.error(toVietnameseErrorMessage(error, 'Không thể gửi lại mã xác minh'))
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 8) {
      toast.error('Mật khẩu phải có ít nhất 8 ký tự')
      return
    }

    try {
      await registerWithOtp({ email, name, password })
      toast.success('Tạo tài khoản thành công!')
      navigate('/workspaces', { replace: true })
    } catch (error) {
      toast.error(toVietnameseErrorMessage(error, 'Không thể tạo tài khoản. Vui lòng thử lại.'))
    }
  }

  const handleBack = () => {
    if (step === 'otp') {
      setStep('email')
      setOtp(['', '', '', '', '', ''])
    } else if (step === 'profile') {
      setStep('otp')
    }
  }

  const handleGoogleAuth = () => {
    void googleAuth()
  }

  const renderStep = () => {
    switch (step) {
      case 'email':
        return (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Tạo tài khoản mới</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Bắt đầu với email của bạn
              </p>
            </div>

            <div className="space-y-4">
              <GoogleButton onClick={handleGoogleAuth} label="Đăng ký với Google" />

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
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="h-10 w-full" disabled={!email || isSendOtpPending}>
                  {isSendOtpPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : 'Tiếp tục'}
                </Button>
              </form>
            </div>
          </>
        )

      case 'otp':
        return (
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
              <h1 className="text-xl font-semibold tracking-tight">Xác minh email</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Nhập mã 6 chữ số đã gửi đến{' '}
                <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>

            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div
                className="flex justify-center gap-2"
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={index === 0 ? 6 : 1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="h-12 w-12 rounded-lg text-center text-lg font-medium"
                  />
                ))}
              </div>

              <Button
                type="submit"
                className="h-10 w-full"
                disabled={isVerifyOtpPending || otp.join('').length !== 6}
              >
                {isVerifyOtpPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  'Xác minh'
                )}
              </Button>

              <div className="text-center">
                {resendTimer > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Gửi lại mã sau {resendTimer}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-sm text-primary transition-colors hover:underline"
                  >
                    Gửi lại mã xác minh
                  </button>
                )}
              </div>
            </form>
          </>
        )

      case 'profile':
        return (
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
              <h1 className="text-xl font-semibold tracking-tight">Hoàn tất đăng ký</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Vui lòng nhập thông tin tài khoản của bạn
              </p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Họ và tên
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập họ và tên của bạn"
                    className="h-10 pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tạo mật khẩu (ít nhất 8 ký tự)"
                    className="h-10 pl-10"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="h-10 w-full"
                disabled={isRegisterWithOtpPending || !name || password.length < 8}
              >
                {isRegisterWithOtpPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Tạo tài khoản
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </>
        )
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[400px]">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-8 shadow-sm backdrop-blur-sm">
          {renderStep()}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
            Đăng nhập
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
