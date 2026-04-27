import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import apiClient, { normalizeApiError, unwrapResponse } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import type { ApiResponse } from '@/types/api';

interface OnboardingProfileState {
  name?: string;
  password?: string;
  avatar?: string | null;
}

interface CompleteOnboardingResponse {
  user: {
    id: number;
    email: string;
    name?: string | null;
    avatar?: string | null;
    bio?: string | null;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  workspace: {
    id: number;
    name: string;
    slug: string;
  };
}

const TEAM_SIZES = [
  { value: 'solo', label: 'Chỉ mình tôi' },
  { value: '2-10', label: '2-10 người' },
  { value: '11-50', label: '11-50 người' },
  { value: '51+', label: 'Hơn 50 người' },
];

function normalizeSlug(text: string): string {
  let slug = text.toLowerCase();
  slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  slug = slug.replace(/\s+/g, '-');
  slug = slug.replace(/[^a-z0-9-]/g, '');
  slug = slug.replace(/-+/g, '-');
  slug = slug.replace(/^-+|-+$/g, '');
  return slug;
}

export default function OnboardingWorkspacePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeOnboarding } = useAuthStore();

  const profileState = (location.state as OnboardingProfileState) || {};

  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [teamSize, setTeamSize] = useState('solo');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Only auto-generate slug if user hasn't manually edited it
  useEffect(() => {
    if (workspaceName && !slugManuallyEdited) {
      setWorkspaceSlug(normalizeSlug(workspaceName));
    }
  }, [workspaceName, slugManuallyEdited]);

  const isValidSlug = useMemo(() => {
    return /^[a-z0-9-]+$/.test(workspaceSlug) && workspaceSlug.length > 0;
  }, [workspaceSlug]);

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) {
      setError('Vui lòng nhập tên không gian làm việc.');
      return;
    }

    if (!isValidSlug) {
      setError('Tên URL không hợp lệ. Chỉ sử dụng chữ thường, số và dấu gạch ngang.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.post<ApiResponse<CompleteOnboardingResponse>>(
        '/auth/complete-onboarding',
        {
          name: profileState.name,
          password: profileState.password,
          workspaceName: workspaceName.trim(),
          workspaceSlug: workspaceSlug.trim(),
        }
      );

      const data = unwrapResponse(response);

      // Update auth store with new tokens and user
      completeOnboarding({
        user: data.user,
        accessToken: data.accessToken,
        workspaceSlug: data.workspace.slug,
      });

      toast.success('Tạo không gian làm việc thành công!');
      navigate(`/workspaces/${data.workspace.slug}`, { replace: true });
    } catch (err) {
      const error = normalizeApiError(err);
      const message = error.message || 'Không thể tạo không gian làm việc. Vui lòng thử lại.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            Tạo không gian làm việc của bạn
          </CardTitle>
          <CardDescription>
            Không gian làm việc là nơi bạn quản lý dự án và công việc
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Workspace Name */}
          <div className="space-y-2">
            <Label htmlFor="workspaceName">
              Tên không gian làm việc <span className="text-destructive">*</span>
            </Label>
            <Input
              id="workspaceName"
              placeholder="Ví dụ: Công ty của tôi"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Workspace Slug */}
          <div className="space-y-2">
            <Label htmlFor="workspaceSlug">Địa chỉ URL</Label>
            <div className="flex items-center rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <span className="flex-shrink-0">localhost:5173/workspaces/</span>
              <input
                id="workspaceSlug"
                type="text"
                className="flex-1 bg-transparent outline-none"
                value={workspaceSlug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setWorkspaceSlug(e.target.value);
                }}
                placeholder="ten-khong-gian"
                maxLength={50}
              />
            </div>
          </div>

          {/* Team Size */}
          <div className="space-y-3">
            <Label>Quy mô đội nhóm</Label>
            <RadioGroup value={teamSize} onValueChange={setTeamSize} className="space-y-2">
              {TEAM_SIZES.map((size) => (
                <div key={size.value} className="flex items-center space-x-2 rounded-md border p-3 hover:bg-muted/50 cursor-pointer" onClick={() => setTeamSize(size.value)}>
                  <RadioGroupItem value={size.value} id={`team-${size.value}`} />
                  <Label htmlFor={`team-${size.value}`} className="font-normal cursor-pointer">
                    {size.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Error */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Submit Button */}
          <Button
            className="w-full"
            onClick={handleCreateWorkspace}
            disabled={isLoading || !isValidSlug}
          >
            {isLoading ? 'Đang tạo...' : 'Tạo không gian làm việc'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Bạn có thể thay đổi cài đặt này sau trong phần quản lý không gian làm
            việc.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
