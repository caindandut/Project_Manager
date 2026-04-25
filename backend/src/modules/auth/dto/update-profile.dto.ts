import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Name must be at most 100 characters' })
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Bio must be at most 1000 characters' })
  bio?: string;

  @IsUrl({}, { message: 'Avatar must be a valid URL' })
  @IsOptional()
  avatar?: string;
}
