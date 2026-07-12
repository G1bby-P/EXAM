import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RoleCode } from "../../../generated/prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { AuthenticatedUser } from "../../common/types/authenticated-request";
import { CoursesService } from "./courses.service";
import { CreateCourseDto } from "./dto/create-course.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";

@ApiBearerAuth()
@ApiTags("Courses")
@Controller("courses")
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.coursesService.list(query);
  }

  @Get(":id")
  findById(@Param("id") id: string) {
    return this.coursesService.findById(id);
  }

  @Post()
  @Roles(RoleCode.ADMIN)
  create(@Body() dto: CreateCourseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.create(dto, user.id);
  }

  @Patch(":id")
  @Roles(RoleCode.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateCourseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.update(id, dto, user.id);
  }

  @Delete(":id")
  @Roles(RoleCode.ADMIN)
  archive(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.archive(id, user.id);
  }
}
