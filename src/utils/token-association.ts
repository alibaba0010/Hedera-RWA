import {
  Client,
  AccountId,
  TokenId,
  ContractId,
  TokenAssociateTransaction,
  PrivateKey,
} from "@hashgraph/sdk";
import {
  checkTokenAssocationMirrorNode,
  initializeHederaClient,
} from "./hedera-integration";
import { DAppSigner } from "@hashgraph/hedera-wallet-connect";

interface WalletType {
  type: "hedera" | "evm" | null;
  accountId?: AccountId | string;
  signer?: DAppSigner;
  provider?: any; // MetaMask provider
  evmAddress?: string; // MetaMask account address
  snapEnabled?: boolean; // Whether Hedera Wallet Snap is available
  network?: "testnet" | "mainnet"; // Network configuration for Snap
}

export class TokenAssociationManager {
  constructor() {}

  async isTokenAssociated(
    wallet: WalletType,
    tokenId: TokenId | string
  ): Promise<boolean> {
    try {
      const { accountId, type, evmAddress } = wallet;

      // console.log("Wallet: ", evmAddress);
      let isAssociated = false;
      if (type === "hedera" && accountId) {
        // For HashPack, query account token balance
        const tokenInfo = await checkTokenAssocationMirrorNode(
          tokenId.toString(),
          accountId.toString()
        );
        console.log("Token Info from Mirror Node: ", tokenInfo);
        isAssociated = tokenInfo ? true : false;
      } else if (type === "evm" && accountId && evmAddress) {
        const tokenInfo = await checkTokenAssocationMirrorNode(
          tokenId.toString(),
          accountId.toString()
        );
        console.log("Token Info from Mirror Node: ", tokenInfo);
        // For MetaMask, query the contract
        const contractId = ContractId.fromString(tokenId.toString());
        // You'll need to implement this method based on your contract's ABI
        isAssociated = await this.checkMetaMaskAssociation(
          contractId,
          accountId.toString(),
          evmAddress
        );
        console.log("Account Info: ", isAssociated);
      }
      console.log("isssssssssaccccccoiated:::::::::::::.......", isAssociated);
      return isAssociated;
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
      // Input validation
      if (!wallet || !tokenId) {
        throw new Error("Wallet and tokenId are required");
      }

      const { accountId, type, signer, evmAddress } = wallet;
      const { client } = await initializeHederaClient();
      console.log(`Evm address ${evmAddress} Account ID: ${accountId}`);

      // Check if token is already associated
      const isAssociated = await this.isTokenAssociated(wallet, tokenId);
      if (isAssociated) {
        return "Token is already associated with this wallet";
      }
      // Create the transaction
      const tokenIdObj =
        typeof tokenId === "string" ? TokenId.fromString(tokenId) : tokenId;
      const accountIdObj =
        typeof accountId === "string"
          ? AccountId.fromString(accountId)
          : accountId;
      // Handle Hedera wallet (HashPack)
      if (!accountId || type !== "hedera" || !signer) {
        throw new Error("Hedera wallet requires accountId");
      }

      try {
        // Create the transaction
        const transaction = await new TokenAssociateTransaction()
          .setAccountId(accountIdObj!)
          .setTokenIds([tokenIdObj])
          .freezeWith(client)
          .signWithSigner(signer);

        // Execute the signed transaction
        const response = await transaction.execute(client);
        console.log("Response: ", response);
        const receipt = await response.getReceipt(client);
        console.log("Receipt: ", receipt);

        console.log("Token association complete:", receipt.status.toString());

        // Verify the association was successful
        const verifyAssociation = await this.isTokenAssociated(wallet, tokenId);
        if (!verifyAssociation) {
          throw new Error(
            "Token association verification failed for Hedera wallet"
          );
        }

        return "Token associated successfully with HashPack wallet";
      } catch (err) {
        console.error("Error in token association:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        throw new Error("Failed to associate token: " + errorMessage);
      }
    } catch (error) {
      console.error("Error associating token:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Failed to associate token: ${errorMessage}`);
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
    _account: string, // kept for backward compatibility
    evmAddress: string
  ): Promise<boolean> {
    try {
      // const evmAddress = account;
      const tokenIdStr = contractId.toString();
      // You may want to use mainnet or testnet endpoint based on your environment
      const mirrorNodeUrl = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${evmAddress}/tokens`;
      const response = await fetch(mirrorNodeUrl);
      if (!response.ok) {
        throw new Error(`Mirror Node API error: ${response.status}`);
      }
      const data = await response.json();
      console.log("Data from Mirror Node.........:", data);
      // data.tokens is an array of token objects with 'token_id' property
      const isAssociated = data.tokens?.some(
        (token: any) => token.token_id === tokenIdStr
      );
      return !!isAssociated;
    } catch (error) {
      console.error(
        "Error checking MetaMask token association via Mirror Node:",
        error
      );
      return false;
    }
  }
}
