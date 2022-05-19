import { PublicKey, Client } from "@hashgraph/sdk";
import { FireblocksSDK, RawMessageData, TransactionArguments, TransactionOperation, PeerType, TransactionStatus, SignedMessageResponse } from "fireblocks-sdk";


export default class FireblocksProvider {
    fireblocksClient: FireblocksSDK;
    assetId: string;
    vaultAccountId: number;
    pubkey: PublicKey;
    client: Client;
    address: string;
    network: string;

    /**
     * 
     * 
     * @param fireblocksClient Fireblocks SDK client
     * @param vaultAccountId Vault account ID required for this Signer instance
     * @param network Either 'testnet' (default value) or 'mainnet'
     */
    constructor(fireblocksClient: FireblocksSDK, vaultAccountId: number, network: string = "testnet") {
        this.network = network;

        switch (this.network) {
            case "testnet":
                this.assetId = "HBAR_TEST";
                break;
            case "mainnet":
                this.assetId = "HBAR";
                break;
            default:
                throw new Error(`unkown network name: ${network}`);
        }

        this.fireblocksClient = fireblocksClient;
        this.vaultAccountId = vaultAccountId;
    }

    async getClient() {
        const pub = await this.fireblocksClient.getPublicKeyInfoForVaultAccount({
            assetId: this.assetId,
            vaultAccountId: this.vaultAccountId,
            change: 0,
            addressIndex: 0
        });
            
        this.pubkey = PublicKey.fromString(pub.publicKey);

        const addresses = await this.fireblocksClient.getDepositAddresses(this.vaultAccountId.toString(), this.assetId);
        this.address = addresses[0].address;

        // TODO replace with true account id
        this.client = Client.forName(this.network).setOperatorWith(
            this.address, this.pubkey, this.signer);
 
        return this.client;
    }

    /**
     * 
     * @param message Hashed message passed in via the signWith callback
     * @returns 
     */
    signer = async (message: Uint8Array) => {
        
        try {

            const rawMessageData: RawMessageData = {
                messages: [{
                    content: Buffer.from(message).toString('hex')
                }]
            };
    
            const tx: TransactionArguments = {
                operation: TransactionOperation.RAW,
                source: {
                    type: PeerType.VAULT_ACCOUNT,
                    id: this.vaultAccountId.toString()
                },
                assetId: this.assetId,
                note: "Hedera Contract Call",
                extraParameters: { rawMessageData }
            }
            
            const txId: string = (await this.fireblocksClient.createTransaction(tx)).id;
            console.log('Raw signing transaction submitted. Transaction ID: ' + txId);
    
            let status = await this.fireblocksClient.getTransactionById(txId);
    
            while (status.status != TransactionStatus.COMPLETED) {
                if(status.status == TransactionStatus.BLOCKED || status.status == TransactionStatus.FAILED || status.status == TransactionStatus.REJECTED || status.status == TransactionStatus.CANCELLED){
                    console.log("Transaction's status: " + status.status + ". Substatus: " + status.subStatus);
                    
                    throw Error("Exiting the operation");
                }
                console.log((await this.fireblocksClient.getTransactionById(txId)).status);
                setTimeout(() => { }, 1000);
                
                status = await this.fireblocksClient.getTransactionById(txId);
            }
    
            const signedTx: SignedMessageResponse[] = (await this.fireblocksClient.getTransactionById(txId)).signedMessages;
            const fullSig: string = signedTx[0].signature.fullSig;
    
            const signature = Buffer.from(fullSig, 'hex');
            
            console.log("RAW Response:");
            console.log(signedTx);
    
            return signature;
        
        } catch (e) {
            console.error(e);
        }
        
    }
}