/*
import { PartisiaBlockchainService } from "@unleashed-business/ts-web3-commons/dist/pbc/pbc.service.js";
import { PBCChain } from "@unleashed-business/ts-web3-commons/dist/pbc/pbc.chains.js";
import { ForkRegistryAbi, MasterChainAbi, MasterChainMempoolAbi } from "@crypto-factor-labs/interchain-ts-abi";
import { HashTypeSpec, U32TypeSpec, U64TypeSpec } from "@unleashed-business/ts-web3-commons/dist/pbc/spec/commons.tspec.js";

(async function (): Promise<void> {

  const partisiaConnection = new PartisiaBlockchainService(undefined);

  // Target Smart Contract: Interchain Testnet Partisia fork MasterChain
  const targetSmartContract = "026a2ed097009a83301d88eef1305b69c5cb89bdf2"

  // ID of the AVL-tree of blocks to be used
  const treeId = 0;

  /**
   * To execute a state read from a smart contract on Partisia we use the .call() method of the
   * created service. We will have to register a callback that receives the state, and we can then query for
   * parameters from it.
   *
  const lastBlockHeight = await partisiaConnection.call(
    PBCChain.TESTNET,
    MasterChainAbi,
    targetSmartContract,
    (state, trees, namedTypes) => { // Callback used to consume the smart contract state and AVL-trees

      // Use the `state` to get the blockHash of the tip of the blockchain
      const tipHash = state["tip"]?.structValue()?.getFieldValue("inner")?.hashValue().value.toString("hex");
      console.log(`Tip = ${tipHash}`)


      /**
       * Here the `trees` variable is a "map" that contains "builders" for AVL-trees selected by the 5-th parameter
       * of the call function.
       * To execute a builder we need to provide three parameters:
       * 1. A type for the tree key as a type spec, which are predefined in CFR and PBC libraries, used in the AVL-tree.
       *    Here `HashTypeSpec` is provided because the type used in the tree is Hash.
       * 2. A type for the tree value as a type spec, which are predefined in CFR and PBC libraries or comes from the
       *    NamedTypesMap, used in the AVL-tree.
       *    Here we are using a custom struct, for which we have to access the `namedTypes` parameter.
       *    Our struct is called `PbcMasterChainBlock` and we can access the type spec from `namedTypes` using this name as key.
       * 3. Boolean flag indicating if we provided a named type for the value spec of the map or a simple type.
       *    For this example we provide `true` as we are using `namedTypes`.
       * 
       * After calling the builder we have an instance of the tree which we can query and deserialize.
       *
      const blockTree = trees[0](HashTypeSpec, namedTypes["PbcMasterChainBlock"], true);
      const lastBlock = blockTree.filter(x => x.key.hashValue().value.toString("hex") === tipHash).pop();
      const lastBlockHeight = lastBlock?.value.structValue().getFieldValue("height")!.asBN() ?? -1;

      return lastBlockHeight;
    },
    [0]  // A list of tree ids to be deserialized and available in our callback
  );

  console.log(`lastBlockHeight: ${lastBlockHeight}`);

})().then(() => console.log("Executed!"));
*/