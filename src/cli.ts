import { CommandService } from 'nestjs-command';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Create a lightweight application context instead of a full HTTP server
  const app = await NestFactory.createApplicationContext(AppModule);

  // Retrieve the CommandService and execute CLI commands
  const commandService = app.get(CommandService);
  await commandService.exec();

  await app.close();  // Close the application after executing commands; enable when necessary
}

bootstrap();
