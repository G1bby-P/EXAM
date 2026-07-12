import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { ResultStatus } from "../../../../generated/prisma/client";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class ResultQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  examVersionId?: string;

  @ApiPropertyOptional({ enum: ResultStatus })
  @IsOptional()
  @IsEnum(ResultStatus)
  status?: ResultStatus;
}
