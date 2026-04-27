import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Camera, LoaderCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import apiClient, { normalizeApiError } from '@/lib/api-client';

interface OnboardingProfileState {
  name?: string;
  password?: string;
}

interface UploadAvatarResponse {
  avatar: string;
}

const API_BASE_URL = 'http://localhost:5000';

export default function OnboardingProfilePage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước file không được vượt quá 5MB.');
      return;
    }

    // Create local preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await apiClient.post<{ data: UploadAvatarResponse }>(
        '/auth/me/avatar',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Revoke the preview URL to free memory
      URL.revokeObjectURL(previewUrl);

      const avatarUrl = response.data.data.avatar;
      setAvatar(avatarUrl);
      setAvatarPreview(null);

      // Update user in store
      if (user) {
        setUser({ ...user, avatar: avatarUrl });
      }

      toast.success('Cập nhật ảnh đại diện thành công.');
    } catch (err) {
      // Revoke the preview URL on error
      URL.revokeObjectURL(previewUrl);
      setAvatarPreview(null);
      
      const error = normalizeApiError(err);
      toast.error(error.message || 'Không thể tải lên ảnh đại diện.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleContinue = () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên của bạn.');
      return;
    }

    setError('');

    // Pass data to next step via navigation state
    navigate('/onboarding/workspace', {
      state: {
        name: name.trim(),
        password: password.trim() || undefined,
        avatar,
      } as OnboardingProfileState,
    });
  };

  const avatarUrl = avatarPreview || (avatar ? (avatar.startsWith('http') ? avatar : `${API_BASE_URL}${avatar}`) : null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Tạo hồ sơ của bạn</CardTitle>
          <CardDescription>
            Hoàn tất thông tin cá nhân để bắt đầu sử dụng Project Manager
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar
                className="h-24 w-24 cursor-pointer transition-opacity hover:opacity-80"
                onClick={handleAvatarClick}
              >
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Upload overlay - always visible if no avatar, or on hover when has avatar */}
              <div
                className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 transition-opacity"
                onClick={handleAvatarClick}
              >
                {isUploading ? (
                  <LoaderCircle className="h-8 w-8 animate-spin text-white" />
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </div>

              {/* Remove button */}
              {avatar && !isUploading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAvatar();
                  }}
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Nhấp vào biểu tượng máy ảnh để tải lên ảnh đại diện (tối đa 5MB)
          </p>

          {/* Name Input */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Tên <span className="text-destructive">*</span>
            </label>
            <Input
              id="name"
              placeholder="Nhập tên của bạn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Đặt mật khẩu
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Nhập mật khẩu (tùy chọn)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Không bắt buộc nếu dùng Google đăng nhập. Nếu đặt mật khẩu, bạn có
              thể đăng nhập bằng email thay vì Google.
            </p>
          </div>

          {/* Error */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Continue Button */}
          <Button className="w-full" onClick={handleContinue}>
            Tiếp tục
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
