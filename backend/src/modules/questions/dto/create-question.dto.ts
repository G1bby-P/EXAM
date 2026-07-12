import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { QuestionStatus, QuestionType } from "../../../../generated/prisma/client";
import { CreateAlternativeDto } from "./alternative.dto";
import { CreateClinicalCaseDto } from "./clinical-case.dto";
import { CreateQuestionMediaDto } from "./question-media.dto";

export class CreateQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  topicId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clinicalCaseId?: string;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiPropertyOptional({ enum: QuestionStatus, default: QuestionStatus.DRAFT })
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  @ApiProperty()
  @IsString()
  prompt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ minimum: 0, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultPoints?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowPartialCredit?: boolean;

  @ApiPropertyOptional({ type: [CreateAlternativeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAlternativeDto)
  alternatives?: CreateAlternativeDto[];

  @ApiPropertyOptional({ type: CreateClinicalCaseDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateClinicalCaseDto)
  clinicalCase?: CreateClinicalCaseDto;

  @ApiPropertyOptional({ type: [CreateQuestionMediaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionMediaDto)
  media?: CreateQuestionMediaDto[];
}
