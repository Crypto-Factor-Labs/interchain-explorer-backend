import { NestFactory } from '@nestjs/core';
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

  // Start the NestJS server on port 3000, binding to all network interfaces (0.0.0.0)
  // so that the API is accessible both locally and externally.
  await app.listen(3000, "0.0.0.0"); // Accept 
}
bootstrap();
