import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString, IsUUID } from "class-validator";

export class SaveAnswerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  answerText?: string;

  @ApiPropertyOptional({ isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedOptionIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fileAssetId?: string;
}
