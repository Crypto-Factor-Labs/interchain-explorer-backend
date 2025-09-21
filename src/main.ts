import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS (Cross-Origin Resource Sharing) globally
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Allow cookies to be sent with requests
  });

  // Start the NestJS server, typically on port 3000, binding it to all network interfaces (0.0.0.0)
  // so that the API is accessible both locally and externally.
  // Get the port from the .env file, validation checking and providing default has already been executed.
  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT')!;

  await app.listen(port, "0.0.0.0");
}
bootstrap();
