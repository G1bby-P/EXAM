import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RoleCode } from "../../../generated/prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { AuthenticatedUser } from "../../common/types/authenticated-request";
import { AssignRolesDto } from "./dto/assign-roles.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@ApiBearerAuth()
@ApiTags("Users")
@Controller("users")
@Roles(RoleCode.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.usersService.list(query);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.create(dto, user.id);
  }

  @Get(":id")
  findById(@Param("id") id: string) {
    return this.usersService.findById(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.update(id, dto, user.id);
  }

  @Patch(":id/roles")
  assignRoles(@Param("id") id: string, @Body() dto: AssignRolesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.assignRoles(id, dto, user.id);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.remove(id, user.id);
  }
}
