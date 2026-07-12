import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEnum } from "class-validator";
import { RoleCode } from "../../../../generated/prisma/client";

export class AssignRolesDto {
  @ApiProperty({ enum: RoleCode, isArray: true })
  @IsArray()
  @IsEnum(RoleCode, { each: true })
  roles: RoleCode[];
}
