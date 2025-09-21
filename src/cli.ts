/*
 * Tasks that can be triggered from the Command Line
 */
/*
import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { IndexerService } from './indexer/indexer.service.js';

async function bootstrap() {
  // Create a lightweight application context (no HTTP server)
  const app = await NestFactory.createApplicationContext(AppModule);

  // Retrieve the applicable services from the application context
  const indexerService = app.get(IndexerService);

  // Use Commander to define the commands
  const program = new Command();

  // Define Command #1
  program
    .command('index-block')
    .description('Let the Indexer generate one dummy block')
    .action(async () => {
      console.log(">>> Executing command 'index-block'...");
      await indexerService.indexBlockManually();
      await app.close();
    });

  // Define more commands here

  // Parse command line arguments and execute the corresponding task
  await program.parseAsync(process.argv);
}

bootstrap().catch(err => console.error('Error in bootstrap:', err));
*/