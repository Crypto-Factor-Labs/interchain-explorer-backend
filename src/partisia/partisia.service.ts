import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PartisiaBlockchainService } from '@unleashed-business/ts-web3-commons/dist/pbc/pbc.service.js';
import { PBCChain } from '@unleashed-business/ts-web3-commons/dist/pbc/pbc.chains.js';
import { ForkRegistryAbi } from '@crypto-factor-labs/interchain-ts-abi';
import { HashTypeSpec, U32TypeSpec } from '@unleashed-business/ts-web3-commons/dist/pbc/spec/commons.tspec.js';

//import { PartialChainRegistryAbi, PartialChainRegistryAbiFunctional } from "@crypto-factor-labs/interchain-ts-abi";
//import { Web3Contract, blockchainIndex } from "@unleashed-business/ts-web3-commons";
//import { buildContractToolkit } from "../toolkit.js";

@Injectable()
export class PartisiaService {
  private readonly logger = new Logger(PartisiaService.name);
  private readonly partisiaConnection = new PartisiaBlockchainService(undefined);
  private readonly registryAddress: string;
  private readonly treeId = 0;  // ID of the AVL-tree of blocks to be used

  constructor(private configService: ConfigService) {
    // Get the address of the Blockchain Registry from the .env-file 
    const registryAddress = this.configService.get<string>('PBC_REGISTRY_ADDRESS');
    if (!registryAddress) {
      throw new Error('🛑 PBC_REGISTRY_ADDRESS is not defined in the environment variables (.env)!');
    }

    this.registryAddress = registryAddress;
  }

  /*
  private readonly contractToolkit = buildContractToolkit();
  private readonly web3Contract = new Web3Contract<PartialChainRegistryAbiFunctional>(this.contractToolkit, PartialChainRegistryAbi);
  private registryContract: any;

  async onModuleInit() {
    this.registryContract = this.web3Contract.readOnlyInstance(blockchainIndex.DMC_TESTCHAIN, this.registryAddress);
  }
  */

  /** Fetch data from the Partisia BlockChain */

  async fetchMasterBlocks(lastIndexedHeight: number): Promise<any[]> {
    let blocks: any[] = [];
    let forkNr = await this.fetchActiveForkNr();
    //forkNr = 1;             // For testing with another fork
    //lastIndexedHeight = 10; // For testing with another fork

    //console.log(">>> Start fetching blocks");
    while (forkNr >= 0) {
      //console.log(`>>> Fetching blocks for fork ${forkNr}`);

      // Fetch the blockchain address for the current fork
      const blockchainAddress = await this.fetchBlockchainAddress(forkNr);
      //console.log(`>>> Blockchain address for fork ${forkNr}: ${blockchainAddress}`);

      // Fetch the ABI of the blockchain address Smart Contract
      const abi = await this.fetchAbi(blockchainAddress);
      //console.log(`>>> ABI for fork ${forkNr}: ${abi}`);

      // Fetch all blocks for the current blockchain address.
      // Stop fetching when no new blocks were found in a fork.
      const newBlocks = await this.fetchNewMasterBlocks(forkNr, abi, blockchainAddress, lastIndexedHeight);
      if (newBlocks.length === 0)
        break;

      blocks = blocks.concat(newBlocks);

      //break; // TESTING - only do active fork

      // Decrease the fork number for the next iteration
      forkNr--;
    }

    //console.log(">>> Finished fetching blocks");
    return blocks;
  }

  private async fetchNewMasterBlocks(forkNr: number, abi: string, blockchainAddress: string, lastIndexedHeight: number): Promise<any[]> {
    let blocks: any[] = [];  // Array to collect blocks for the current fork

    // Start with the latest block of the blockchain
    let block = await this.fetchLatestMasterBlock(abi, blockchainAddress);
    let blockHeight = this.getHeight(block);
    const backlog = blockHeight - lastIndexedHeight;

    if (backlog > 0) {
      if (backlog > 1)
        this.logger.log(`>>> Catching up ${backlog} blocks`);

      while (block) {
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
        block = await this.fetchMasterBlock(abi, blockchainAddress, prevBlockHash);

        if (!block) {
          console.log(`>>> Block not found for hash: ${prevBlockHash}. End of fork ${forkNr} reached.`);
        } else {
          blockHeight--;

          // Stop if the block is already indexed
          if (blockHeight <= lastIndexedHeight)
            break;
        }
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

  async fetchAbi(contractAddress: string): Promise<string> {
    const url = "https://node1.testnet.partisiablockchain.com/chain/contracts/" + contractAddress;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      return data.abi; // Extract and return the 'abi' field
    } catch (error) {
      console.error("Error fetching ABI:", error);
      return "";
    }
  }

  async fetchLatestMasterBlock(abi: string, blockchainAddress: string): Promise<any> {
    const latestBlock = await this.partisiaConnection.call(
      PBCChain.TESTNET,
      abi,
      blockchainAddress,
      async (state, trees, namedTypes) => {
        // Extract the tip hash from the state
        const tipHash = this.GetHashFromFieldWithInner(state["tip"]);
        //console.log(`>>> Tip of blockchain = ${tipHash}`);

        // Extract the block tree and find the last block by tip hash
        const blockTree = trees[this.treeId](HashTypeSpec, namedTypes["PbcMasterChainBlock"], true);
        const blockTreeElement = blockTree.filter(x => x.key.hashValue().value.toString("hex") === tipHash).pop();
        const latestBlock = blockTreeElement?.value.structValue();

        /*
        const partialBlockHashes = this.getPartialBlockHashes(latestBlock);
        //console.log(`#PartialBlockHashes = ${partialBlockHashes.length}`);
        //console.log(partialBlockHashes);

        for (const pbhash of partialBlockHashes) {
          const partialBlock = await this.fetchPartialBlock(abi, blockchainAddress, pbhash);
          //console.log(partialBlock);
          const chainId = this.getChainId(partialBlock);
          //console.log(`chainId = ${chainId}`);
          const height = this.getHeight(partialBlock);
          //console.log(`height = ${height}`);
          const hash = this.getHash(partialBlock);
          //console.log(`hash = ${hash}`);
          const mempool_epoch = this.getMempoolEpoch(partialBlock);
          //console.log(`mempool_epoch = ${mempool_epoch}`);
          const confirmed = this.getConfirmed(partialBlock);
          //console.log(`confirmed = ${confirmed}`);
          console.log(`latestPartialBlock: ${chainId}, ${mempool_epoch}, ${confirmed} : ${height} - ${hash}`);
        }
        */

        return latestBlock;
      },
      [this.treeId]
    );

    return latestBlock;
  }

  async fetchMasterBlock(abi: string, blockchainAddress: string, blockHash: string): Promise<any> {
    const block = await this.partisiaConnection.call(
      PBCChain.TESTNET,
      abi,
      blockchainAddress,
      async (_state, trees, namedTypes) => {  // trees --> property 'blocks' in PBC Explorer
        const blockTree = trees[this.treeId](HashTypeSpec, namedTypes["PbcMasterChainBlock"], true);
        const blockTreeElement = blockTree.filter(x => x.key.hashValue().value.toString("hex") === blockHash).pop();
        return blockTreeElement?.value.structValue();
      },
      [this.treeId],
    );

    if (!block) {
      this.logger.warn(`⭕ Block with hash ${blockHash} not found.`);
    }

    return block;
  }

  /**
   * Fetch the height of the latest block from the blockchain.
   * As an example of how a single property can be fetched from the latest block on the blockchain.
   * Don't expect this to be used. 
   */
  async fetchLatestMasterBlockHeight(abi: string, blockchainAddress: string): Promise<number> {
    try {
      const latestBlock = await this.fetchLatestMasterBlock(abi, blockchainAddress);
      return this.getHeight(latestBlock);
    } catch (error) {
      const errMsg = `Error fetching height of latest MasterBlock from blockchain ${blockchainAddress}`;
      this.logger.error(errMsg, error);
      throw new Error(errMsg);
    }
  }

  /**
   * Retrieves the hash value from a given field's "inner" property and returns it as a hexadecimal string.
   * 
   * @param {any} fieldValue - The object containing the field from which the hash is to be extracted.
   * @returns {string} - The hexadecimal representation of the hash if available, or `"???"` if the field or hash is not found.
   */
  GetHashFromFieldWithInner(fieldValue: any) {
    return fieldValue?.structValue()?.getFieldValue("inner")?.hashValue().value.toString("hex") ?? "???";
  }

  /*** Methods to get properties from a Master- or PartialBlock ***/

  getHeight(block: any): number {
    return block?.getFieldValue("height").asBN().toNumber() ?? -1;
  }

  getPrevHash(block: any): string {
    return this.GetHashFromFieldWithInner(block?.getFieldValue("prev_block_hash"));
  }

  getHash(block: any): string {
    return this.GetHashFromFieldWithInner(block?.getFieldValue("block_hash"));
  }

  /*** Methods to get properties from a MasterBlock ***/

  getTimestamp(block: any): Date {
    const rawTimestamp = block?.getFieldValue("timestamp").asBN().toNumber() ?? Date.now();
    return new Date(rawTimestamp);
  }

  getMerkleRoot(block: any): string {
    return this.GetHashFromFieldWithInner(block?.getFieldValue("partial_blocks_root"));
  }

  getMintTransaction(_block: any): string {
    // ToDo: see how to get it
    return "not-implemented-yet-" + randomUUID();
    //return block?.getFieldValue("").toString() ?? "unknown-transaction";
  }

  getPartialBlockHashes(block: any): string[] {
    // Get the List of PartialBlocks
    const partialBlocks = block?.getFieldValue("partial_blocks").vals ?? [];
    const hashes: string[] = [];

    // Iterate over the PartialBlocks to get the hashes
    partialBlocks.forEach((partialBlock: any) => {
      const blockHash = this.GetHashFromFieldWithInner(partialBlock.structValue().getFieldValue("block_hash"));

      if (blockHash) {
        hashes.push(blockHash);
      }
    });

    return hashes;
  }

  /*** Methods to get properties from a PartialBlock ***/

  getChainId(block: any): number {
    return block?.getFieldValue("chain_id").number ?? -1;
  }

  getMempoolEpoch(block: any): number {
    return block?.getFieldValue("mempool_epoch").innerValue?.asBN().toNumber() ?? -1;
  }

  getMasterBlockHash(block: any): string {
    return this.GetHashFromFieldWithInner(block?.getFieldValue("master_block_hash"));
  }

  getTransactionRoot(block: any): string {
    return this.GetHashFromFieldWithInner(block?.getFieldValue("execution_parts_root"));
  }

  getSourceTransactionHash(_block: any): string {
    // ToDo: see how to get it
    return "not-implemented-yet-" + randomUUID();
    //return block?.getFieldValue("").toString() ?? "unknown-transaction";
  }

  getCommitTransactionHash(_block: any): string {
    // ToDo: see how to get it
    return "not-implemented-yet-" + randomUUID();
    //return block?.getFieldValue("").toString() ?? "unknown-transaction";
  }

  getCommitProof(_block: any): string {
    // ToDo: see how to get it
    return "not-implemented-yet-" + randomUUID();
    //return block?.getFieldValue("").toString() ?? "unknown-transaction";
  }

  getConfirmed(block: any): boolean {
    return block?.getFieldValue("confirmed").value;
  }

  async fetchPartialBlock(abi: string, blockchainAddress: string, blockHash: string): Promise<any> {
    const block = await this.partisiaConnection.call(
      PBCChain.TESTNET,
      abi,
      blockchainAddress,
      async (_state, trees, namedTypes) => {  // trees --> property 'partial_chain_blocks' in PBC Explorer
        const blockTree = trees[1](HashTypeSpec, namedTypes["PbcPartialChainBlock"], true);

        // The values of the elements of the tree are the PartialBlocks.
        // Find the applicable PartialBlock by filtering on field 'block_hash' of the Elements of the Tree
        const blockTreeElement = blockTree.filter(element =>
          this.GetHashFromFieldWithInner(element.value.structValue()?.getFieldValue("block_hash")) === blockHash).pop();

        return blockTreeElement?.value.structValue();
      },
      [1],
    );

    //const temp = this.registryContract.getBlochByNumber(3461);
    //console.log(temp);

    if (!block) {
      this.logger.warn(`⭕ Block with hash ${blockHash} not found.`);
    }

    return block;
  }

}

