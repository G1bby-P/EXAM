import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { ExportFormat, ExportStatus, ExportType } from "../../../../generated/prisma/client";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class ExportHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ExportType })
  @IsOptional()
  @IsEnum(ExportType)
  exportType?: ExportType;

  @ApiPropertyOptional({ enum: ExportFormat })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;

  @ApiPropertyOptional({ enum: ExportStatus })
  @IsOptional()
  @IsEnum(ExportStatus)
  status?: ExportStatus;
}
