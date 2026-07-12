import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";
import { ResultStatus } from "../../../../generated/prisma/client";

export class StatisticsQueryDto {
  @ApiPropertyOptional({ description: "Fecha inicial ISO 8601 o YYYY-MM-DD." })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: "Fecha final ISO 8601 o YYYY-MM-DD." })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  topicId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  examId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  examVersionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: ResultStatus })
  @IsOptional()
  @IsEnum(ResultStatus)
  status?: ResultStatus;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  rankingLimit = 10;
}
