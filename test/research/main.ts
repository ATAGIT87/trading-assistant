import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  // Set before ConfigModule/bootstrap. The separate research server has no automated producers.
  process.env.CCXT_ASSISTANT_ENABLED = "false";
  process.env.DEMO_TRADING_ENABLED = "false";
  process.env.EXPLORATORY_DEMO_ENABLED = "false";
  process.env.DEMO_ENTRIES_PAUSED = "true";
  process.env.TELEGRAM_BOT_TOKEN = "";
  process.env.TELEGRAM_CHAT_ID = "";
  process.env.DB_SYNCHRONIZE = "false";
  const { ResearchModule } = await import("./research.module.js");
  const app = await NestFactory.create(ResearchModule);
  await app.init();
  // Research endpoints are explicit local tools; background runtime jobs never run here.
  const { SchedulerRegistry } = await import("@nestjs/schedule");
  for (const job of app.get(SchedulerRegistry).getCronJobs().values())
    job.stop();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  app.enableShutdownHooks();
  await app.listen(process.env.RESEARCH_PORT ?? 3001, "127.0.0.1");
}

void bootstrap();
