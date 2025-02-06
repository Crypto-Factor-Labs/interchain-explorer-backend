import { Injectable, Logger } from '@nestjs/common';
import { PartisiaBlockchainService } from '@unleashed-business/ts-web3-commons/dist/pbc/pbc.service.js';
import { PBCChain } from '@unleashed-business/ts-web3-commons/dist/pbc/pbc.chains.js';
import { MasterChainAbi } from '@crypto-factor-labs/interchain-ts-abi';
import { HashTypeSpec } from '@unleashed-business/ts-web3-commons/dist/pbc/spec/commons.tspec.js';

@Injectable()
export class PartisiaService {
  private readonly logger = new Logger(PartisiaService.name);
  private readonly partisiaConnection = new PartisiaBlockchainService(undefined);
  private readonly targetSmartContract = '026a2ed097009a83301d88eef1305b69c5cb89bdf2';  // Target Smart Contract
  private readonly treeId = 0;  // ID of the AVL-tree of blocks to be used

  /**
   * Fetch the latest block by interacting with the smart contract.
   */
  async fetchLatestBlock(): Promise<any> {
    const latestBlock = await this.partisiaConnection.call(
      PBCChain.TESTNET,
      MasterChainAbi,
      this.targetSmartContract,
      (state, trees, namedTypes) => {
        // Extract the tip hash from the state
        const tipHash = state["tip"]?.structValue()?.getFieldValue("inner")?.hashValue().value.toString("hex");
        this.logger.log(`Tip = ${tipHash}`);

        // Extract the block tree and find the lastest block using the tipHash
        const blockTree = trees[this.treeId](HashTypeSpec, namedTypes["PbcMasterChainBlock"], true);
        const blockTreeElement = blockTree.filter(x => x.key.hashValue().value.toString("hex") === tipHash).pop();
        const block = blockTreeElement?.value.structValue();

        return block;
      },
      [this.treeId],  // Tree ID to deserialize the data
    );

    this.logger.log(`Fetched latest block: ${JSON.stringify(latestBlock)}`);
    return latestBlock;
  }

  /**
   * Fetch the latest block height from the Partisia blockchain.
   * As an example of how a single property can be fetched from the latest block on the blockchain.
   * Don't expect this to be used. 
   */
  async fetchLatestBlockHeight(): Promise<number> {
    try {
      const latestBlock = await this.fetchLatestBlock();
      return this.getHeight(latestBlock);
    } catch (error) {
      const errMsg = 'Error fetching latest block height from blockchain';
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

  getMerkleRoot(_block: any): string {
    // ToDo: see how to get it
    return "not-implemented-yet";
    //return block?.getFieldValue("merkle_root")?.toString() ?? "unknown-merkle-root";
  }

  getHash(block: any): string {
    return block?.getFieldValue("block_hash")?.structValue()
      ?.getFieldValue("inner")?.hashValue()?.value?.toString("hex") ?? "";
  }

  getMintTransaction(_block: any): string {
    // ToDo: see how to get it
    return "not-implemented-yet";
    //return block?.getFieldValue("merkle_root")?.toString() ?? "unknown-merkle-root";
  }
}


/* Experimentation with with dynamic importing of modules because of error */
/*
import { Injectable, Logger } from '@nestjs/common';
import { MasterChainAbi } from '@crypto-factor-labs/interchain-ts-abi';  // Ensure this import is here

@Injectable()
export class PartisiaService {
  private readonly logger = new Logger(PartisiaService.name);
  private partisiaConnection: any;
  private PBCChain: any;  // Declare PBCChain as a class property
  private HashTypeSpec: any;  // Declare HashTypeSpec for dynamic import
  private readonly targetSmartContract = '026a2ed097009a83301d88eef1305b69c5cb89bdf2';  // Target Smart Contract
  private readonly treeId = 0;  // ID of the AVL-tree of blocks to be used

  constructor() {
    this.initializePartisiaConnection();  // Initialize Partisia connection asynchronously
  }

  // Dynamically import both pbc.service.js, pbc.chains.js, and commons.tspec.js
  private async initializePartisiaConnection() {
    try {
      // Dynamically import the PartisiaBlockchainService and PBCChain
      const { PartisiaBlockchainService } = await import('@unleashed-business/ts-web3-commons/dist/pbc/pbc.service.js');
      const { PBCChain } = await import('@unleashed-business/ts-web3-commons/dist/pbc/pbc.chains.js');
      const { HashTypeSpec } = await import('@unleashed-business/ts-web3-commons/dist/pbc/spec/commons.tspec.js');  // Dynamically import HashTypeSpec

      // Initialize the Partisia connection
      this.partisiaConnection = new PartisiaBlockchainService(undefined);
      this.PBCChain = PBCChain;  // Assign the imported PBCChain to the class property
      this.HashTypeSpec = HashTypeSpec;  // Assign HashTypeSpec to the class property
      this.logger.log('Partisia connection initialized.');
    } catch (error) {
      this.logger.error('Error initializing Partisia connection', error);
      throw new Error('Failed to initialize Partisia connection');
    }
  }

  // Fetch the latest block height from the Partisia blockchain.
  async getLatestBlockHeight(): Promise<number> {
    try {
      const latestBlock = await this.getLatestBlock(); // Using getLatestBlock to fetch block data
      return latestBlock?.height ?? -1; // Return block height or -1 if not found
    } catch (error) {
      this.logger.error('Error fetching latest block height from Partisia', error);
      throw new Error('Error fetching last block height from Partisia');
    }
  }

  // Fetch the latest block by interacting with the smart contract.
  private async getLatestBlock(): Promise<any> {
    if (!this.partisiaConnection || !this.PBCChain || !this.HashTypeSpec) {
      throw new Error('Partisia connection, PBCChain, or HashTypeSpec is not initialized');
    }

    const block = await this.partisiaConnection.call(
      this.PBCChain.TESTNET,
      MasterChainAbi,  // Using the imported MasterChainAbi here
      this.targetSmartContract,
      (state: any, trees: any[], namedTypes: any) => {
        // Extract the tip hash from the state
        const tipHash = state["tip"]?.structValue()?.getFieldValue("inner")?.hashValue().value.toString("hex");
        this.logger.log(`Tip = ${tipHash}`);

        // Assuming blockTree is an array of objects that have a 'key' property with 'hashValue()' method
        const blockTree: any[] = trees[this.treeId](this.HashTypeSpec, namedTypes["PbcMasterChainBlock"], true);

        // Use `.find()` instead of `.filter()` to find the block with the matching hash
        const lastBlock = blockTree.find((x: any) =>
          x.key?.hashValue().value.toString("hex") === tipHash
        );

        return lastBlock?.value.structValue();
      },
      [this.treeId],  // Tree ID to deserialize the data
    );

    this.logger.log(`Fetched latest block: ${JSON.stringify(block)}`);
    return block;
  }
}
*/

