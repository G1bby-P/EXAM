import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CreateClinicalCaseDto {
  @ApiProperty({ example: "Paciente adulto con dolor toracico" })
  @IsString()
  title: string;

  @ApiProperty({ example: "Paciente masculino de 58 anos con dolor opresivo de 40 minutos de evolucion." })
  @IsString()
  patientContext: string;

  @ApiPropertyOptional({ example: "Incluye factores de riesgo cardiovasculares y signos vitales iniciales." })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ example: "Sindrome coronario agudo probable." })
  @IsOptional()
  @IsString()
  diagnosis?: string;
}
