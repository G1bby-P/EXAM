import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";
import { TopicStatus } from "../../../../generated/prisma/client";

export class CreateTopicDto {
  @ApiProperty()
  @IsUUID()
  courseId: string;

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

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sortOrder: number;

  @ApiPropertyOptional({ enum: TopicStatus, default: TopicStatus.ACTIVE })
  @IsOptional()
  @IsEnum(TopicStatus)
  status?: TopicStatus;
}
