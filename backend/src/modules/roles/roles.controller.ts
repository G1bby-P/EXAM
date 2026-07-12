import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RoleCode } from "../../../generated/prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesService } from "./roles.service";

@ApiBearerAuth()
@ApiTags("Roles")
@Controller("roles")
@Roles(RoleCode.ADMIN)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  list() {
    return this.rolesService.list();
  }
}
