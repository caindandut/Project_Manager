import { IsEmail, IsString, Length } from 'class-validator';

export class SendOtpDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;
}

export class VerifyOtpDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  code!: string;
}
