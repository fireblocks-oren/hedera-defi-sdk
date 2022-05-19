import fs from "fs";
import path from "path";
import { ContractCallQuery, ContractCreateTransaction, ContractExecuteTransaction, ContractFunctionParameters, Client, AccountId, FileCreateTransaction, Hbar } from '@hashgraph/sdk';
import { FireblocksSDK } from 'fireblocks-sdk';
import FireblocksProvider from "./utils/FireblocksProvider";

/**
 * Define required parameters
 */
const network = 'testnet';
const privkeyPath = "";
const apiKey = "";
const vaultAccountId = 0;

(async () => {

    /**
     * Initializing all required runtime objects
     */
    const apiSecret = fs.readFileSync(path.resolve(__dirname, privkeyPath), "utf8");
    const fireblocks = new FireblocksSDK(apiSecret, apiKey);
    const provider = new FireblocksProvider(fireblocks, vaultAccountId, network);
    const client = await provider.getClient();

    /**
     * Example code to create Contract File on-chain
     * setNodeAccountIds is set to a single Node Account to avoid multiple signatures
     */
     let helloHedera = require("./contract.json");
     const bytecode = helloHedera.data.bytecode.object;
     const fileCreateTx = new FileCreateTransaction()
             .setNodeAccountIds([new AccountId(3)])
             .setContents(bytecode);
 
     const submitTx = await fileCreateTx.execute(client);
     const fileReceipt = await submitTx.getReceipt(client);
     const bytecodeFileId = fileReceipt.fileId;
     console.log("The smart contract byte code file ID is " +bytecodeFileId)
 
     /**
      * Example code to create a contract instance on-chain
      * setNodeAccountIds is set to a single Node Account to avoid multiple signatures
      */
     const contractTx = await new ContractCreateTransaction()
     .setBytecodeFileId(bytecodeFileId)
     .setNodeAccountIds([new AccountId(3)])
     .setGas(100000)
     .setConstructorParameters(new ContractFunctionParameters().addString("Hello from Hedera!"));
 
     const contractResponse = await contractTx.execute(client);
     const contractReceipt = await contractResponse.getReceipt(client);
     const newContractId = contractReceipt.contractId;
     console.log("The smart contract ID is " + newContractId);

    /**
     * Example code for calling a read method of a deployed smart contract
     * setNodeAccountIds is set to a single Node Account to avoid multiple signatures
     */
    const getMessage = await new ContractCallQuery()
        .setContractId(newContractId)
        .setGas(75000)
        .setNodeAccountIds([new AccountId(3)])
        .setFunction("get_message")
        .setQueryPayment(new Hbar(2))
        .execute(client);

    const message = getMessage.getString(0);
    console.log("The contract message: " + message);

    /**
     * Example code for calling a write method of a deployed smart contract
     * setNodeAccountIds is set to a single Node Account to avoid multiple signatures
     */
    const result = await new ContractExecuteTransaction()
            .setContractId(newContractId)
            .setGas(75000)
            .setNodeAccountIds([new AccountId(3)])
            .setFunction("set_message", new ContractFunctionParameters()
                .addString("Hello from Hedera again!"))
            .execute(client);

    const receipt = await result.getReceipt(client);
    console.log(receipt);

})();