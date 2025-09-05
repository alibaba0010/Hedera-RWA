import {
  Client,
  AccountId,
  PrivateKey,
  TokenId,
  ContractId,
  ContractFunctionParameters,
} from "@hashgraph/sdk";
import { associateAccountWithToken } from "./associate";
import { appConfig } from "./config";

interface WalletType {
  type: "hedera" | "evm" | null;
  accountId?: AccountId | string;
  accountKey?: PrivateKey;
  provider?: any; // MetaMask provider
}

export class TokenAssociationManager {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Check if an account is associated with a token
   * @param wallet Wallet information (HashPack or MetaMask)
   * @param tokenId Token to check association for
   * @returns Promise<boolean>
   */
  async isTokenAssociated(
    wallet: WalletType,
    tokenId: TokenId | string
  ): Promise<boolean> {
    try {
      if (wallet.type === "hedera" && wallet.accountId) {
        // For HashPack, query account token balance
        const accountInfo =
          await new (require("@hashgraph/sdk").AccountInfoQuery)()
            .setAccountId(AccountId.fromString(wallet.accountId.toString()))
            .execute(this.client);
        return accountInfo.tokenRelationships.hasOwnProperty(
          tokenId.toString()
        );
      } else if (wallet.type === "evm" && wallet.accountId) {
        // For MetaMask, query the contract
        const contractId = ContractId.fromString(tokenId.toString());
        // You'll need to implement this method based on your contract's ABI
        const isAssociated = await this.checkMetaMaskAssociation(
          contractId,
          wallet.accountId.toString()
        );
        return isAssociated;
      }
      return false;
    } catch (error) {
      console.error("Error checking token association:", error);
      return false;
    }
  }

  /**
   * Associate a token with a wallet
   * @param wallet Wallet information (HashPack or MetaMask)
   * @param tokenId Token to associate
   * @returns Promise<string> Transaction hash or receipt
   */
  async associateToken(
    wallet: WalletType,
    tokenId: TokenId | string
  ): Promise<string> {
    try {
      if (wallet.type === "hedera" && wallet.accountId && wallet.accountKey) {
        // Use existing HashPack association function
        await associateAccountWithToken({
          client: this.client,
          accountId: wallet.accountId,
          accountKey: wallet.accountKey,
          tokenId: tokenId,
        });
        return "Token associated successfully with HashPack wallet";
      } else if (wallet.type === "evm" && wallet.provider) {
        // For MetaMask, call the contract's associate function
        const contractId = ContractId.fromString(tokenId.toString());
        const hash = await this.associateMetaMaskToken(
          contractId,
          wallet.provider
        );
        return hash;
      }
      throw new Error("Invalid wallet configuration");
    } catch (error) {
      console.error("Error associating token:", error);
      throw error;
    }
  }

  /**
   * Check if a MetaMask account is associated with a token
   * @param contractId Contract ID of the token
   * @param account MetaMask account address
   * @returns Promise<boolean>
   */
  private async checkMetaMaskAssociation(
    contractId: ContractId,
    account: string
  ): Promise<boolean> {
    // Implement contract call to check association
    // This will depend on your specific contract implementation
    // Example placeholder:
    return false;
  }

  /**
   * Associate a token with a MetaMask account
   * @param contractId Contract ID of the token
   * @param provider MetaMask provider
   * @returns Promise<string> Transaction hash
   */
  private async associateMetaMaskToken(
    contractId: ContractId,
    provider: any
  ): Promise<string> {
    // Call the contract's associate function
    const hash = await this.executeContractFunction(
      contractId,
      "associate",
      new ContractFunctionParameters(),
      appConfig.constants.METAMASK_GAS_LIMIT_ASSOCIATE
    );
    return hash;
  }

  private async executeContractFunction(
    contractId: ContractId,
    functionName: string,
    params: ContractFunctionParameters,
    gasLimit: number
  ): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    try {
      // Get the current account
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No MetaMask accounts found");
      }

      const account = accounts[0];

      // Create the transaction parameters
      const transactionParameters = {
        from: account,
        to: contractId.toString(), // The token contract address
        gas: `0x${gasLimit.toString(16)}`, // Convert gas limit to hex
        data: this.encodeFunction(functionName, params), // Encode the function call
      };

      // Send the transaction using MetaMask
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [transactionParameters],
      });

      return txHash;
    } catch (error) {
      console.error("Error executing contract function:", error);
      throw error;
    }
  }

  private encodeFunction(
    _functionName: string,
    _params: ContractFunctionParameters
  ): string {
    // This is a simplified version. In a real implementation, you would:
    // 1. Use ethers.js or web3.js to encode the function call
    // 2. Include the actual parameters from the ContractFunctionParameters object

    // For now, we'll return a basic function signature for 'associate()'
    // The actual implementation would use the functionName and params to create the proper encoded data
    return "0x095ea7b3"; // This is a placeholder function signature for token association
  }
}
