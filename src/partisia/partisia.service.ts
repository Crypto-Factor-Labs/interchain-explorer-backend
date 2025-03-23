import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PartisiaBlockchainService } from '@unleashed-business/ts-web3-commons/dist/pbc/pbc.service.js';
import { ChainDefinition, PBCChain, PBCChainsIndex } from '@unleashed-business/ts-web3-commons/dist/pbc/pbc.chains.js';
import { HashTypeSpec, U32TypeSpec } from '@unleashed-business/ts-web3-commons/dist/pbc/spec/commons.tspec.js';
import { BN, StructTypeSpec } from "@partisiablockchain/abi-client";
import { PartisiaUtils } from "./partisia.utils.js";
import { Web3 } from "web3";
import { bn_wrap } from "@unleashed-business/ts-web3-commons";

@Injectable()
export class PartisiaService {
  private readonly logger = new Logger(PartisiaService.name);
  private readonly partisiaConnection = new PartisiaBlockchainService();
  private readonly partisiaChain: ChainDefinition;
  private readonly registryAddress: string;
  private readonly treeId = 0;  // ID of the AVL-tree of blocks to be used

  constructor(private configService: ConfigService) {
    // Get the PBC configuration from the .env-file
    const registryAddress = this.configService.get<string>('PBC_REGISTRY_ADDRESS');
    if (!registryAddress) {
      throw new Error('🛑 PBC_REGISTRY_ADDRESS is not defined in the environment variables (.env)!');
    }

    const chainName = this.configService.get<string>('PBC_CHAIN', PBCChain.TESTNET.name);
    let chainDefinition = PBCChainsIndex[chainName];

    const customRPC = this.configService.get<string>('PBC_RPC_URL');
    if (customRPC !== undefined) {
      chainDefinition = new ChainDefinition(
        chainDefinition.id,
        chainDefinition.name,
        [customRPC, ...chainDefinition.rpcList],
        chainDefinition.shards,
        chainDefinition.systemContracts,
        chainDefinition.explorer
      );
    }

    this.registryAddress = registryAddress;
    this.partisiaChain = chainDefinition;
  }

  /** Fetch data from the Partisia BlockChain */

  async fetchMasterBlocks(lastIndexedHeight: number): Promise<any[]> {
    let blocks: any[] = [];
    let forkNr = await this.fetchActiveForkNr();

    let indexingTip: string | undefined = undefined;
    //console.log(">>> Start fetching blocks");
    while (forkNr >= 0) {
      //console.log(`>>> Fetching blocks for fork ${forkNr}`);

      // Fetch the blockchain address for the current fork
      const blockchainAddress = await this.fetchBlockchainAddress(forkNr);
      //console.debug(`>>> Blockchain address for fork ${forkNr}: ${blockchainAddress}`);

      // Fetch all blocks for the current blockchain address.
      // Stop fetching when no new blocks were found in a fork.
      const fetchResult = await this.fetchNewMasterBlocks(forkNr, blockchainAddress, lastIndexedHeight, indexingTip);
      const newBlocks = fetchResult[0];
      indexingTip = fetchResult[1];

      if (newBlocks.length > 0)
        blocks = blocks.concat(newBlocks);

      if (newBlocks.length === 0 || !indexingTip)
        break;

      //break; // TESTING - only do active fork

      // Decrease the fork number for the next iteration
      forkNr--;
    }

    //console.log(">>> Finished fetching blocks");
    return blocks;
  }

  private async fetchNewMasterBlocks(forkNr: number, blockchainAddress: string, lastIndexedHeight: number, indexingTip: string | undefined): Promise<[any[], string | undefined]> {
    let blocks: any[] = [];  // Array to collect blocks for the current fork

    // Start with the latest block of the blockchain
    let block = indexingTip === undefined
      ? await this.fetchLatestMasterBlock(blockchainAddress)
      : await this.fetchMasterBlock(blockchainAddress, indexingTip);
    let blockHeight = this.getHeight(block);
    const backlog = blockHeight - lastIndexedHeight;
    let lastTip: string | undefined = undefined;

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
        const prevBlockHash = lastTip = this.getPrevHash(block);
        block = await this.fetchMasterBlock(blockchainAddress, prevBlockHash);

        if (!block) {
          console.log(`>>> Block not found for hash: ${prevBlockHash}. End of fork ${forkNr} reached.`);
        } else {
          blockHeight--;

          // Stop if the block is already indexed
          if (blockHeight <= lastIndexedHeight) {
            lastTip = "";  // Prevent from trying the previous fork
            break;
          }
        }
      }
    }

    return [blocks, lastTip];
  }

  async fetchActiveForkNr(): Promise<number> {
    try {
      const activeForkNr = await this.partisiaConnection.call(
        this.partisiaChain,
        this.registryAddress,
        async (state, _trees, _namedTypes) => {
          const activeForkNr = state!["active_fork"]?.asNumber();
          if (typeof activeForkNr !== "number" || isNaN(activeForkNr)) {
            throw new Error("Invalid active fork number received");
          }
          return activeForkNr;
        },
        true,
      );

      return activeForkNr;

    } catch (error) {
      console.error("Error fetching active fork number:", error);

      // Return a default value in case of an error
      return -1;  // or null?
    }
  }

  fetchForkByHeight(height: BN): Promise<[number, string]> {
    return this.partisiaConnection.call(
      this.partisiaChain,
      this.registryAddress,
      async (state, trees, namedTypes) => {
        let forkNr = state!['active_fork'].asNumber();
        const forkInfo = trees[this.treeId](
          true, U32TypeSpec, namedTypes["MasterChainFork"] as StructTypeSpec,
          valueRaw => PartisiaUtils.toU32AvlKey(valueRaw.asNumber()),
          valueRaw => valueRaw.structValue());

        let fork = await forkInfo.get(PartisiaUtils.toU32AvlKey(forkNr));
        while (forkNr >= 0 && fork!.getFieldValue("activate_height")!.asBN().gt(new BN.BN(height.toString(16), "hex"))) {
          forkNr -= 1;
          fork = await forkInfo.get(PartisiaUtils.toU32AvlKey(forkNr));
        }

        if (forkNr < 0 || fork === undefined) {
          this.logger.warn(`⭕ No active fork found for height ${height} (${new BN.BN(height.toString(16), "hex")})`)
          return [-1, ''];
        }

        return [forkNr, fork!.getFieldValue("chain_address")!.addressValue().value.toString("hex")];
      },
      true,
      [this.treeId]
    );
  }

  fetchBlockchainAddress(forkNr: number): Promise<string> {
    return this.partisiaConnection.call(
      this.partisiaChain,
      this.registryAddress,
      async (_state, trees, namedTypes) => {
        // Extract the blockchain address from the response
        const forkInfo = trees[this.treeId](
          true, U32TypeSpec, namedTypes["MasterChainFork"] as StructTypeSpec,
          valueRaw => PartisiaUtils.toU32AvlKey(valueRaw.asNumber()),
          valueRaw => valueRaw.structValue());
        const fork = await forkInfo.get(PartisiaUtils.toU32AvlKey(forkNr));

        return fork?.getFieldValue('chain_address')?.addressValue()?.value?.toString("hex") ?? "";
      },
      false,
      [this.treeId]
    );
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

  async fetchLatestMasterBlock(blockchainAddress: string): Promise<any> {
    const latestBlock = await this.partisiaConnection.call(
      this.partisiaChain,
      blockchainAddress,
      async (state, trees, namedTypes) => {
        // Extract the tip hash from the state
        const tipHash = this.GetHashFromFieldWithInner(state!["tip"]);
        //console.log(`>>> Tip of blockchain = ${tipHash}`);

        // Extract the block tree and find the last block by tip hash
        const blockTree = trees[this.treeId](
          true, HashTypeSpec, namedTypes["PbcMasterChainBlock"] as StructTypeSpec,
          valueRaw => PartisiaUtils.toHashAvlKey(valueRaw.hashValue().value.toString("hex")),
          valueRaw => valueRaw.structValue()
        );

        const latestBlock = await blockTree.get(PartisiaUtils.toHashAvlKey(tipHash));
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
      true,
      [this.treeId]
    );

    return latestBlock;
  }

  async fetchMasterBlock(blockchainAddress: string, blockHash: string): Promise<any> {
    const block = await this.partisiaConnection.call(
      this.partisiaChain,
      blockchainAddress,
      async (_state, trees, namedTypes) => {  // trees --> property 'blocks' in PBC Explorer
        const blockTree = trees[this.treeId](
          true, HashTypeSpec, namedTypes["PbcMasterChainBlock"] as StructTypeSpec,
          valueRaw => PartisiaUtils.toHashAvlKey(valueRaw.hashValue().value.toString("hex")),
          valueRaw => valueRaw.structValue()
        );

        return blockTree.get(PartisiaUtils.toHashAvlKey(blockHash));
      },
      false,
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
  async fetchLatestMasterBlockHeight(blockchainAddress: string): Promise<number> {
    try {
      const latestBlock = await this.fetchLatestMasterBlock(blockchainAddress);

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
    return fieldValue?.structValue()?.getFieldValue("inner")?.hashValue().value.toString("hex") ?? "";
  }

  /*** Methods to get properties from a Master- or PartialBlock ***/

  //TODO: number is not good for height, needs to be BN
  getHeight(block: any): number {
    return block?.getFieldValue("height").asBN().toNumber() ?? -1;
  }

  getHeightBN(block: any): BN {
    return block?.getFieldValue("height").asBN() ?? new BN(-1);
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

  /*
  getPartialBlockHashes(forkNr: number, block: any): { chainId: number, hash: string }[] {
    // Get the List of PartialBlocks
    const partialBlocks = block?.getFieldValue("partial_blocks").vals ?? [];
    const hashes: { chainId: number, hash: string }[] = [];

    // Iterate over the PartialBlocks to get the hashes.
    // Note that early forks (<=1) have a different structure!
    partialBlocks.forEach((partialBlock: any) => {
      let chainId = -1;
      let hash = "";

      if (forkNr > 1) {
        chainId = partialBlock.structValue().getFieldValue("chain_id")?.asNumber();
        hash = this.GetHashFromFieldWithInner(partialBlock.structValue().getFieldValue("block_hash"));
      } else { // Early forks
        chainId = 1131;  // chain_id is not present, default to 1131
        hash = partialBlock.getFieldValue("inner")?.hashValue().value.toString("hex") ?? "???"
      }

      if (hash) {
        hashes.push({ chainId: chainId, hash: hash });
      }
    });

    return hashes;
  }
  */

  getPartialBlockHashes(block: any): { chainId: number, hash: string }[] {
    // Get the List of PartialBlocks
    const partialBlocks = block?.getFieldValue("partial_blocks").vals ?? [];
    const hashes: { chainId: number, hash: string }[] = [];

    // Iterate over the PartialBlocks to get the hashes.
    // Note that early forks (<=1) have a different structure!
    partialBlocks.forEach((partialBlock: any) => {
      let hash = "";
      let chainId = partialBlock.structValue().getFieldValue("chain_id")?.asNumber() ?? -1;

      if (chainId !== -1) {
        hash = this.GetHashFromFieldWithInner(partialBlock.structValue().getFieldValue("block_hash"));
      } else {// Assume an early fork
        chainId = 1131;  // chain_id is not present, use 1131
        hash = partialBlock.getFieldValue("inner")?.hashValue().value.toString("hex") ?? ""
      }

      if (hash) {
        hashes.push({ chainId: chainId, hash: hash });
      }
    });

    return hashes;
  }

  /*** Methods to get properties from a PartialBlock ***/

  getChainId(block: any): number {
    return block?.getFieldValue("chain_id").number ?? -1;
  }

  getMempoolEpoch(block: any): number {  // Is only present from height 2629 onwards
    return block?.getFieldValue("mempool_epoch")?.innerValue?.asBN().toNumber() ?? -1;
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

  async fetchPartialBlock(blockchainAddress: string, chainId: number, blockHash: string): Promise<any> {
    const block = await this.partisiaConnection.call(
      this.partisiaChain,
      blockchainAddress,
      async (_state, trees, namedTypes) => {  // trees --> property 'partial_chain_blocks' in PBC Explorer
        const blockTree = trees[1](
          true, HashTypeSpec, namedTypes["PbcPartialChainBlock"] as StructTypeSpec,
          valueRaw => PartisiaUtils.toHashAvlKey(valueRaw.hashValue().value.toString("hex")),
          valueRaw => valueRaw.structValue()
        );

        // Key in AVL tree = keccak256(chainId + partialBlockHash)
        const partialBlockKey = Web3.utils.sha3(`0x${bn_wrap(chainId).toString(16).padStart(8, "0")}${blockHash}`)!;

        return blockTree.get(PartisiaUtils.toHashAvlKey(partialBlockKey.substring(2)))
      },
      false,
      [1],
    );

    if (!block) {
      this.logger.warn(`⭕ Block with hash ${blockHash} not found for chainId ${chainId}. blockchainAddress = ${blockchainAddress}`);
    }

    return block;
  }

}

