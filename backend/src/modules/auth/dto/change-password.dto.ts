import { IsString, MinLength, MaxLength, Matches, IsNotEmpty } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'New password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'New password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'New password must contain at least one number' })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, { message: 'New password must contain at least one special character' })
  newPassword!: string;
}
