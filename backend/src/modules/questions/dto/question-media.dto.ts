import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, IsUUID, Min } from "class-validator";
import { QuestionMediaType } from "../../../../generated/prisma/client";

export class CreateQuestionMediaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fileAssetId?: string;

  @ApiProperty({ enum: QuestionMediaType })
  @IsEnum(QuestionMediaType)
  mediaType: QuestionMediaType;

  @ApiPropertyOptional({ example: "Radiografia de torax" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: "Imagen de apoyo para interpretar el caso clinico." })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: "https://storage.example.com/question-bank/rx-torax.png" })
  @IsOptional()
  @IsUrl({ protocols: ["http", "https"], require_tld: false })
  url?: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sortOrder: number;
}
