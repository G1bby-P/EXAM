import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RoleCode } from "../../../generated/prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuditLogQueryDto } from "./dto/audit-log-query.dto";
import { AuditService } from "./audit.service";

@ApiBearerAuth()
@ApiTags("Audit")
@Controller("audit")
@Roles(RoleCode.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("logs")
  list(@Query() query: AuditLogQueryDto) {
    return this.auditService.list(query);
  }
}
