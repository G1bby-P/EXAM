import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RoleCode } from "../../../generated/prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuthenticatedUser } from "../../common/types/authenticated-request";
import { ResultQueryDto } from "./dto/result-query.dto";
import { ReviewAnswerDto } from "./dto/review-answer.dto";
import { ResultsService } from "./results.service";

@ApiBearerAuth()
@ApiTags("Results")
@Controller("results")
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get()
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  list(@Query() query: ResultQueryDto) {
    return this.resultsService.list(query);
  }

  @Get("me")
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.resultsService.listForUser(user.id);
  }

  @Get(":id")
  findById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.resultsService.findById(id, user);
  }

  @Patch("answers/:answerId/review")
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  reviewAnswer(@Param("answerId") answerId: string, @Body() dto: ReviewAnswerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.resultsService.reviewAnswer(answerId, dto, user.id);
  }

  @Post(":id/publish")
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  publish(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.resultsService.publish(id, user.id);
  }
}
