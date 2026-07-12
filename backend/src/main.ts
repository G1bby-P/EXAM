import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger("Bootstrap");
  const apiPrefix = config.getOrThrow<string>("API_PREFIX");
  const swaggerEnabled = config.get<boolean>("SWAGGER_ENABLED", true);

  if (config.get<boolean>("TRUST_PROXY", false)) {
    app.getHttpAdapter().getInstance().set("trust proxy", 1);
  }
  app.setGlobalPrefix(apiPrefix);
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get<string[]>("CORS_ORIGINS", []),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  if (swaggerEnabled) {
    const swaggerPath = config.get<string>("SWAGGER_PATH", "docs");
    const documentConfig = new DocumentBuilder()
      .setTitle("Exam Platform API")
      .setDescription("Backend API for authentication, courses, topics, questions, exams, results and audit logs.")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, documentConfig);
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log(`Swagger available at /${swaggerPath}`);
  }

  const port = config.get<number>("PORT", 3000);
  await app.listen(port);
  logger.log(`API listening on port ${port} with prefix /${apiPrefix}`);
}

void bootstrap();
