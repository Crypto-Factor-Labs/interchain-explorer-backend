/* Usage:
   pnpm tsx scripts/index-one-master-block.ts <height>
   # <height> must be a decimal string (e.g. 1340792)
*/
import { DataSource } from 'typeorm';
import { DATA_SOURCE_OPTIONS } from '../src/data-source.js';
import { indexMasterBlock } from '../src/indexer/index-master-block.js';

import axios from 'axios';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ReaderNodeService } from '../src/reader-node/reader-node.service.js';

async function main() {
  const heightArg = process.argv[2];
  if (!heightArg || !/^\d+$/.test(heightArg)) {
    console.error('Usage: tsx scripts/index-one-master-block.ts <height>');
    process.exit(1);
  }

  process.env.READER_NODE_BASE_URL ||= 'http://localhost:8080';

  const dataSource = new DataSource(DATA_SOURCE_OPTIONS);
  await dataSource.initialize();

  const http = new HttpService(
    axios.create({
      baseURL: process.env.READER_NODE_BASE_URL,
      timeout: 30_000,
    }),
  );
  const config = new ConfigService();
  const rnService = new ReaderNodeService(http, config);

  try {
    const block = await rnService.fetchMasterBlockByHeight(heightArg);
    await indexMasterBlock(block, { dataSource, rnService, logger: console });
    console.log(`Indexed master block at height: ${heightArg}`);
  } catch (err) {
    console.error('Index failed:', err);
    process.exitCode = 1;
  } finally {
    try { await dataSource.destroy(); } catch { }
  }
}

main();
