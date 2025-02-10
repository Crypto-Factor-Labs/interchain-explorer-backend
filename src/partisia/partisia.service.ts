import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PartisiaBlockchainService } from '@unleashed-business/ts-web3-commons/dist/pbc/pbc.service.js';
import { PBCChain } from '@unleashed-business/ts-web3-commons/dist/pbc/pbc.chains.js';
import { ForkRegistryAbi, MasterChainAbi } from '@crypto-factor-labs/interchain-ts-abi';
import { HashTypeSpec, U32TypeSpec } from '@unleashed-business/ts-web3-commons/dist/pbc/spec/commons.tspec.js';

@Injectable()
export class PartisiaService {
  private readonly logger = new Logger(PartisiaService.name);
  private readonly partisiaConnection = new PartisiaBlockchainService(undefined);
  private readonly registryAddress = '0200db89eb449b5d1b2222931e5f8881eea822af12';  // Address of the blockchain registry
  //private readonly targetSmartContract = '026a2ed097009a83301d88eef1305b69c5cb89bdf2';  // Target Smart Contract
  private readonly treeId = 0;  // ID of the AVL-tree of blocks to be used

  /** Fetch data from the Partisia BlockChain */

  async fetchBlocks(lastIndexedHeight: number): Promise<any[]> {
    let blocks: any[] = [];
    let forkNr = await this.fetchActiveForkNr();
    //forkNr = 1;  // For testing with another fork

    //console.log(">>> Start fetching blocks");
    while (forkNr >= 0) {
      //console.log(`>>> Fetching blocks for fork ${forkNr}`);

      // Get blockchain address for the current fork
      const blockchainAddress = await this.fetchBlockchainAddress(forkNr);
      //console.log(`>>> Blockchain address for fork ${forkNr}: ${blockchainAddress}`);

      // Fetch all blocks for the current blockchain address
      const newBlocks = await this.fetchNewBlocks(forkNr, blockchainAddress, lastIndexedHeight);
      blocks = blocks.concat(newBlocks);

      break; // TESTING - only do active fork

      // Decrease the fork number for the next iteration
      forkNr--;
    }

    //console.log(">>> Finished fetching blocks");
    return blocks;
  }

  private async fetchNewBlocks(forkNr: number, blockchainAddress: string, lastIndexedHeight: number): Promise<any[]> {
    let blocks: any[] = [];  // Array to collect blocks for the current fork

    // Start with the latest block of the blockchain
    let block = await this.fetchLatestBlock(blockchainAddress);

    while (block) {
      const blockHeight = this.getHeight(block);

      // Stop if the block is already indexed
      if (blockHeight <= lastIndexedHeight)
        break;

      // Add the block to the array
      blocks.push(block);

      // For testing
      console.log(`Height = ${blockHeight}, Hash = ${this.getHash(block)}`);
      //if (blocks.length === 5)
      //  break;

      // Check if we reached the Genesis block
      if (blockHeight === 0) {
        this.logger.log("✅ Reached the Genenis block (height = 0). All blocks fetched!");
        break;
      }

      // Fetch the previous block
      const prevBlockHash = this.getPrevHash(block);
      block = await this.fetchBlock(blockchainAddress, prevBlockHash);

      if (!block) {
        console.log(`>>> Block not found for hash: ${prevBlockHash}. End of fork ${forkNr} reached.`);
      }
    }

    return blocks;
  }

  async fetchActiveForkNr(): Promise<number> {
    try {
      const activeForkNr = await this.partisiaConnection.call(
        PBCChain.TESTNET,
        ForkRegistryAbi,
        this.registryAddress,
        (state, _trees, _namedTypes) => {
          const activeForkNr = state["active_fork"]?.asNumber();
          if (typeof activeForkNr !== "number" || isNaN(activeForkNr)) {
            throw new Error("Invalid active fork number received");
          }
          return activeForkNr;
        },
        [this.treeId]
      );

      return activeForkNr;

    } catch (error) {
      console.error("Error fetching active fork number:", error);

      // Return a default value in case of an error
      return -1;  // or null?
    }
  }

  async fetchBlockchainAddress(forkNr: number): Promise<string> {
    const blockchainAddress = await this.partisiaConnection.call(
      PBCChain.TESTNET,
      ForkRegistryAbi,
      this.registryAddress,
      (_state, trees, namedTypes) => {
        // Extract the blockchain address from the response
        const forkInfo = trees[this.treeId](U32TypeSpec, namedTypes["MasterChainFork"], true);
        const forkInfoElement = forkInfo.filter(x => x.key.asNumber() === forkNr).pop();
        const fork = forkInfoElement?.value.structValue();

        const blockchainAddress = fork?.getFieldValue('chain_address')?.addressValue()?.value?.toString("hex") ?? "";
        return blockchainAddress;
      },
      [this.treeId]
    );

    return blockchainAddress;
  }

  async fetchLatestBlock(blockchainAddress: string): Promise<any> {
    const latestBlock = await this.partisiaConnection.call(
      PBCChain.TESTNET,
      MasterChainAbi,
      blockchainAddress,
      (state, trees, namedTypes) => {
        // Extract the tip hash from the state
        const tipHash = state["tip"]?.structValue()?.getFieldValue("inner")?.hashValue().value.toString("hex") ?? "";
        //console.log(`>>> Tip of blockchain = ${tipHash}`);

        // Extract the block tree and find the last block by tip hash
        // const latestBlock = await fetchBlock(blockchainAddress, tipHash); don't use this, but keep the function sync
        const blockTree = trees[this.treeId](HashTypeSpec, namedTypes["PbcMasterChainBlock"], true);
        const blockTreeElement = blockTree.filter(x => x.key.hashValue().value.toString("hex") === tipHash).pop();
        const latestBlock = blockTreeElement?.value.structValue();
        return latestBlock;
      },
      [this.treeId]
    );

    return latestBlock;
  }

  async fetchBlock(blockchainAddress: string, blockHash: string): Promise<any> {
    const block = await this.partisiaConnection.call(
      PBCChain.TESTNET,
      MasterChainAbi,
      blockchainAddress,
      (_state, trees, namedTypes) => {
        const blockTree = trees[this.treeId](HashTypeSpec, namedTypes["PbcMasterChainBlock"], true);
        const blockTreeElement = blockTree.filter(x => x.key.hashValue().value.toString("hex") === blockHash).pop();
        return blockTreeElement?.value.structValue();
      },
      [this.treeId],
    );

    if (!block) {
      console.log(`⭕ Block with hash ${blockHash} not found.`);
    }

    return block;
  }

  /**
   * Fetch the height of the latest block from the blockchain.
   * As an example of how a single property can be fetched from the latest block on the blockchain.
   * Don't expect this to be used. 
   */
  async fetchLatestBlockHeight(blockchainAddress: string): Promise<number> {
    try {
      const latestBlock = await this.fetchLatestBlock(blockchainAddress);
      return this.getHeight(latestBlock);
    } catch (error) {
      const errMsg = `Error fetching height of latest block from blockchain ${blockchainAddress}`;
      this.logger.error(errMsg, error);
      throw new Error(errMsg);
    }
  }

  /*** Methods to get properties from a block ***/

  getHeight(block: any): number {
    return block?.getFieldValue("height")?.asBN()?.toNumber() ?? -1;
  }

  getTimestamp(block: any): Date {
    const rawTimestamp = block?.getFieldValue("timestamp")?.asBN()?.toNumber() ?? Date.now();
    return new Date(rawTimestamp);
  }

  getMerkleRoot(block: any): string {
    return block?.getFieldValue("partial_blocks_root")?.structValue()
      ?.getFieldValue("inner")?.hashValue()?.value?.toString("hex") ?? "";
  }

  getHash(block: any): string {
    return block?.getFieldValue("block_hash")?.structValue()
      ?.getFieldValue("inner")?.hashValue()?.value?.toString("hex") ?? "";
  }

  getPrevHash(block: any): string {
    return block?.getFieldValue("prev_block_hash")?.structValue()
      ?.getFieldValue("inner")?.hashValue()?.value?.toString("hex") ?? "";
  }

  getMintTransaction(_block: any): string {
    // ToDo: see how to get it
    return "not-implemented-yet-" + randomUUID();
    //return block?.getFieldValue("")?.toString() ?? "unknown-transaction";
  }
}

