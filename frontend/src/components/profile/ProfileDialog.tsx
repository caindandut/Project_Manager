import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  User,
  Camera,
  CheckCircle2,
  Chrome,
  AlertTriangle,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AvatarCropDialog from '@/components/profile/AvatarCropDialog';

// Form validation schemas
const basicInfoSchema = z.object({
  name: z.string().min(2, 'Tên hiển thị phải có ít nhất 2 ký tự').max(100, 'Tên hiển thị tối đa 100 ký tự'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z.string().min(8, 'Mật khẩu mới phải từ 8 ký tự trở lên'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không trùng khớp',
    path: ['confirmPassword'],
  });

type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const {
    user,
    updateProfile,
    uploadAvatar,
    changePassword,
    isUpdateProfilePending,
    isUploadAvatarPending,
    isChangePasswordPending,
  } = useAuth();

  const isGoogleUser = !!user?.googleId;

  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form setups
  const {
    register: registerBasic,
    handleSubmit: handleBasicSubmit,
    setValue: setBasicValue,
    formState: { errors: basicErrors },
  } = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: user?.name || '',
    },
  });

  // Keep name input in sync with loaded user info
  useEffect(() => {
    if (user?.name) {
      setBasicValue('name', user.name);
    }
  }, [user, setBasicValue]);

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const initials = (user?.name || user?.email || 'U').slice(0, 2).toUpperCase();

  // Basic Info Submission
  const onBasicSubmit = async (values: BasicInfoFormValues) => {
    try {
      await updateProfile(values);
      toast.success('Cập nhật thông tin cá nhân thành công!');
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra khi cập nhật thông tin.');
    }
  };

  // Avatar Selection & Cropping
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp hình ảnh.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCropSrc(reader.result as string);
      setCropOpen(true);
    });
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      await uploadAvatar(file);
      toast.success('Ảnh đại diện đã được cập nhật!');
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải ảnh đại diện lên.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRestoreGoogleAvatar = async () => {
    if (!user?.googleAvatar) return;
    try {
      await updateProfile({ avatar: user.googleAvatar });
      toast.success('Đã khôi phục ảnh đại diện từ Google!');
    } catch (error: any) {
      toast.error(error.message || 'Không thể cập nhật ảnh đại diện.');
    }
  };

  // Password Submission
  const onPasswordSubmit = async (values: PasswordFormValues) => {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Đổi mật khẩu thành công!');
      resetPasswordForm();
    } catch (error: any) {
      toast.error(error.message || 'Mật khẩu hiện tại không chính xác.');
    }
  };

  // Google Linking
  const handleLinkGoogle = () => {
    localStorage.setItem('isLinkingGoogle', 'true');
    window.location.assign('http://localhost:5000/api/v1/auth/google');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-xl gap-0 border border-border/60 bg-background shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-foreground">Hồ sơ cá nhân</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                Quản lý thông tin cá nhân, cài đặt bảo mật và liên kết tài khoản Google
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* 1. THÔNG TIN CƠ BẢN */}
          <Card className="border-border/60">
            <CardHeader className="py-4 px-5 border-b border-border/30 bg-muted/10">
              <CardTitle className="text-sm font-semibold">Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              {/* Avatar Area */}
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b border-border/30">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border shadow-sm transition-transform duration-200 group-hover:scale-[1.02]">
                    {user?.avatar ? (
                      <AvatarImage src={user.avatar} alt={user.name || 'User'} />
                    ) : null}
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                    title="Thay đổi ảnh đại diện"
                  >
                    <Camera className="h-6 w-6" />
                    <span className="text-[10px] mt-1">Chọn ảnh</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <h3 className="font-semibold text-foreground">Ảnh đại diện</h3>
                  <p className="text-xs text-muted-foreground">
                    Hỗ trợ định dạng JPG, PNG hoặc GIF. Kích thước tối đa 5MB.
                  </p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadAvatarPending}
                      className="text-xs border-border/80"
                    >
                      Tải ảnh mới
                    </Button>
                    {user?.googleAvatar && user.avatar !== user.googleAvatar && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRestoreGoogleAvatar}
                        disabled={isUpdateProfilePending}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Khôi phục ảnh Google
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Area */}
              <form onSubmit={handleBasicSubmit(onBasicSubmit)} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Địa chỉ email
                  </Label>
                  <Input
                    id="email"
                    value={user?.email || ''}
                    readOnly
                    className="bg-muted/40 cursor-not-allowed text-muted-foreground border-border/60 select-all"
                  />
                  <p className="text-[10px] text-muted-foreground/80">
                    Email đăng ký được dùng làm định danh duy nhất và không thể thay đổi.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tên hiển thị
                  </Label>
                  <Input
                    id="name"
                    placeholder="Nhập tên hiển thị..."
                    className={`border-border/60 ${isGoogleUser ? 'bg-muted/40 cursor-not-allowed text-muted-foreground select-none' : ''}`}
                    readOnly={isGoogleUser}
                    {...registerBasic('name')}
                  />
                  {isGoogleUser ? (
                    <p className="text-[11px] text-muted-foreground/80">
                      Tài khoản đăng nhập bằng Google sử dụng tên tài khoản Google. Không cần nhập tên hiển thị riêng.
                    </p>
                  ) : basicErrors.name ? (
                    <span className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {basicErrors.name.message}
                    </span>
                  ) : null}
                </div>

                {!isGoogleUser && (
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={isUpdateProfilePending}>
                      {isUpdateProfilePending ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* 2. TÀI KHOẢN LIÊN KẾT */}
          <Card className="border-border/60">
            <CardHeader className="py-4 px-5 border-b border-border/30 bg-muted/10">
              <CardTitle className="text-sm font-semibold">Tài khoản liên kết</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex items-center justify-between border border-border/60 rounded-lg p-4 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EA4335]/10 text-[#EA4335]">
                    <Chrome className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Google OAuth</h4>
                    <p className="text-xs text-muted-foreground">
                      {isGoogleUser ? `Đã liên kết (${user?.email})` : 'Chưa liên kết với tài khoản Google'}
                    </p>
                  </div>
                </div>

                {isGoogleUser ? (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400 font-medium px-2.5 py-1 rounded-full border border-green-200/50">
                    <CheckCircle2 className="h-4 w-4" />
                    Đã liên kết
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLinkGoogle}
                    className="text-xs border-border/80"
                  >
                    Liên kết Google
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 3. ĐỔI MẬT KHẨU */}
          <Card className="border-border/60">
            <CardHeader className="py-4 px-5 border-b border-border/30 bg-muted/10">
              <CardTitle className="text-sm font-semibold">Đổi mật khẩu</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {isGoogleUser && !user?.hasPassword ? (
                <div className="rounded-lg border border-yellow-200/60 bg-yellow-50/50 dark:bg-yellow-950/10 dark:border-yellow-900/40 p-4 text-center">
                  <p className="text-sm text-yellow-800 dark:text-yellow-400 font-medium">
                    Bạn đang đăng nhập bằng Google.
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-500/90 mt-1">
                    Hệ thống không yêu cầu mật khẩu riêng. Bạn có thể tiếp tục sử dụng Google để đăng nhập an toàn.
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="currentPassword text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Mật khẩu hiện tại
                    </Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="••••••••"
                      className={`border-border/60 ${passwordErrors.currentPassword ? 'border-destructive focus-visible:ring-destructive/20' : ''}`}
                      {...registerPassword('currentPassword')}
                    />
                    {passwordErrors.currentPassword && (
                      <span className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {passwordErrors.currentPassword.message}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="newPassword text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Mật khẩu mới
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      className={`border-border/60 ${passwordErrors.newPassword ? 'border-destructive focus-visible:ring-destructive/20' : ''}`}
                      {...registerPassword('newPassword')}
                    />
                    {passwordErrors.newPassword && (
                      <span className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {passwordErrors.newPassword.message}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Xác nhận mật khẩu mới
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className={`border-border/60 ${passwordErrors.confirmPassword ? 'border-destructive focus-visible:ring-destructive/20' : ''}`}
                      {...registerPassword('confirmPassword')}
                    />
                    {passwordErrors.confirmPassword && (
                      <span className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {passwordErrors.confirmPassword.message}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={isChangePasswordPending}>
                      {isChangePasswordPending ? 'Đang đổi mật khẩu...' : 'Cập nhật mật khẩu'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Crop Dialog Portal */}
        <AvatarCropDialog
          open={cropOpen}
          onOpenChange={setCropOpen}
          imageSrc={cropSrc}
          onCrop={handleCropComplete}
        />
      </DialogContent>
    </Dialog>
  );
}
