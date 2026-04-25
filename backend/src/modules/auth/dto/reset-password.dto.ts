import { IsString, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token!: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'New password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'New password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'New password must contain at least one number' })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, { message: 'New password must contain at least one special character' })
  password!: string;
}
