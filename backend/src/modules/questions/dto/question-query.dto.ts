import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { QuestionStatus, QuestionType } from "../../../../generated/prisma/client";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QuestionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  topicId?: string;

  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @ApiPropertyOptional({ enum: QuestionStatus })
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;
}
