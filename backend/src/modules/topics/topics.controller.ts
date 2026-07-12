import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { RoleCode } from "../../../generated/prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { AuthenticatedUser } from "../../common/types/authenticated-request";
import { CreateTopicDto } from "./dto/create-topic.dto";
import { UpdateTopicDto } from "./dto/update-topic.dto";
import { TopicsService } from "./topics.service";

class TopicQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  courseId?: string;
}

@ApiBearerAuth()
@ApiTags("Topics")
@Controller("topics")
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  list(@Query() query: TopicQueryDto) {
    return this.topicsService.list(query);
  }

  @Get(":id")
  findById(@Param("id") id: string) {
    return this.topicsService.findById(id);
  }

  @Post()
  @Roles(RoleCode.ADMIN)
  create(@Body() dto: CreateTopicDto, @CurrentUser() user: AuthenticatedUser) {
    return this.topicsService.create(dto, user.id);
  }

  @Patch(":id")
  @Roles(RoleCode.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateTopicDto, @CurrentUser() user: AuthenticatedUser) {
    return this.topicsService.update(id, dto, user.id);
  }

  @Delete(":id")
  @Roles(RoleCode.ADMIN)
  archive(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.topicsService.archive(id, user.id);
  }
}
