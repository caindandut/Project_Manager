import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class RegisterWithOtpDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters' })
  name!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Length(8, 100, { message: 'Password must be between 8 and 100 characters' })
  password!: string;
}
