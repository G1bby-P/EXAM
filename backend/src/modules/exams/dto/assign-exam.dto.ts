import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsUUID, Min, ValidateIf } from "class-validator";

export class AssignExamDto {
  @ApiPropertyOptional()
  @ValidateIf((dto: AssignExamDto) => !dto.allStudents && !dto.userIds?.length)
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ type: [String], description: "Lista de usuarios alumnos para asignacion masiva." })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("4", { each: true })
  userIds?: string[];

  @ApiPropertyOptional({ description: "Asigna el examen a todos los alumnos activos." })
  @IsOptional()
  @IsBoolean()
  allStudents?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  examVersionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxAttemptsOverride?: number;
}
