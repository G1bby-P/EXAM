import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { CourseStatus, Prisma } from "../../../generated/prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { toSlug } from "../../common/utils/slug";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { CreateCourseDto } from "./dto/create-course.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.CourseWhereInput = {
      OR: query.search
        ? [
            { title: { contains: query.search, mode: "insensitive" } },
            { slug: { contains: query.search, mode: "insensitive" } },
          ]
        : undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        include: { topics: { orderBy: { sortOrder: "asc" } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.course.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findById(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { topics: { orderBy: { sortOrder: "asc" } } },
    });
    if (!course) throw new NotFoundException("Course not found.");
    return course;
  }

  async create(dto: CreateCourseDto, actorUserId?: string) {
    const slug = dto.slug ? toSlug(dto.slug) : toSlug(dto.title);
    const existing = await this.prisma.course.findUnique({ where: { slug } });
    if (existing) throw new ConflictException("Course slug already exists.");
    const course = await this.prisma.course.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        status: dto.status ?? CourseStatus.DRAFT,
        archivedAt: dto.status === CourseStatus.ARCHIVED ? new Date() : undefined,
      },
    });
    await this.audit.log({
      actorUserId,
      action: "COURSE_CREATED",
      entityType: "course",
      entityId: course.id,
    });
    return course;
  }

  async update(id: string, dto: UpdateCourseDto, actorUserId?: string) {
    await this.findById(id);
    const status = dto.status;
    const course = await this.prisma.course.update({
      where: { id },
      data: {
        title: dto.title,
        slug: dto.slug ? toSlug(dto.slug) : undefined,
        description: dto.description,
        status,
        archivedAt: status === CourseStatus.ARCHIVED ? new Date() : status ? null : undefined,
      },
    });
    await this.audit.log({
      actorUserId,
      action: "COURSE_UPDATED",
      entityType: "course",
      entityId: id,
    });
    return course;
  }

  async archive(id: string, actorUserId?: string): Promise<void> {
    await this.findById(id);
    await this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.ARCHIVED, archivedAt: new Date() },
    });
    await this.audit.log({
      actorUserId,
      action: "COURSE_ARCHIVED",
      entityType: "course",
      entityId: id,
    });
  }
}
