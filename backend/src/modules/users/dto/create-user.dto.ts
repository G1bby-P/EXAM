import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { RoleCode, UserStatus } from "../../../../generated/prisma/client";

export class CreateUserDto {
  @ApiProperty({ example: "student@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ enum: RoleCode, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(RoleCode, { each: true })
  roles?: RoleCode[];
}
