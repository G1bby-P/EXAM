import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsObject, IsOptional } from "class-validator";
import { SecurityEventSeverity, SecurityEventType } from "../../../../generated/prisma/client";

export class CreateSecurityEventDto {
  @ApiProperty({ enum: SecurityEventType })
  @IsEnum(SecurityEventType)
  eventType!: SecurityEventType;

  @ApiPropertyOptional({ enum: SecurityEventSeverity, default: SecurityEventSeverity.INFO })
  @IsOptional()
  @IsEnum(SecurityEventSeverity)
  severity?: SecurityEventSeverity;

  @ApiPropertyOptional({ description: "Client-side timestamp in ISO-8601 format." })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @ApiPropertyOptional({ description: "Non-sensitive browser context captured at the moment of the event." })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
