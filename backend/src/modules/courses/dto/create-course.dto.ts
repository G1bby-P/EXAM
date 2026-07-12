import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { CourseStatus } from "../../../../generated/prisma/client";

export class CreateCourseDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(220)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CourseStatus, default: CourseStatus.DRAFT })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}
