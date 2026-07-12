import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { validateEnv } from "./config/env.validation";
import { AuthModule } from "./modules/auth/auth.module";
import { AuditModule } from "./modules/audit/audit.module";
import { CoursesModule } from "./modules/courses/courses.module";
import { DatabaseModule } from "./modules/database/database.module";
import { ExamsModule } from "./modules/exams/exams.module";
import { ExportsModule } from "./modules/exports/exports.module";
import { HealthModule } from "./modules/health/health.module";
import { LogsModule } from "./modules/logs/logs.module";
import { QuestionsModule } from "./modules/questions/questions.module";
import { ResultsModule } from "./modules/results/results.module";
import { RolesModule } from "./modules/roles/roles.module";
import { StatisticsModule } from "./modules/statistics/statistics.module";
import { TopicsModule } from "./modules/topics/topics.module";
import { UsersModule } from "./modules/users/users.module";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    JwtModule.register({}),
    DatabaseModule,
    AuditModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CoursesModule,
    TopicsModule,
    QuestionsModule,
    ExamsModule,
    ExportsModule,
    ResultsModule,
    StatisticsModule,
    LogsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
