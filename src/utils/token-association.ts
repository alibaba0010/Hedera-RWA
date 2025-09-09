import {
  Client,
  AccountId,
  TokenId,
  ContractId,
  AccountInfoQuery,
  TokenAssociateTransaction,
  TokenMintTransaction,
  PrivateKey,
} from "@hashgraph/sdk";
import {
  fetchTokenInfoFromMirrorNode,
  initializeHederaClient,
} from "./hedera-integration";
import { getEnv } from ".";
import { hc } from "@/hooks/walletConnect";

interface WalletType {
  type: "hedera" | "evm" | null;
  accountId?: AccountId | string;
  accountKey?: PrivateKey;
  provider?: any; // MetaMask provider
  evmAddress?: string; // MetaMask account address
  snapEnabled?: boolean; // Whether Hedera Wallet Snap is available
  network?: "testnet" | "mainnet"; // Network configuration for Snap
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
      const { accountId, type } = wallet;
      const { client } = await initializeHederaClient();

      const evmAddress = "0x5518Bd143bf64807104DdB2421f4D8d3A60828F9";
      // console.log("Wallet: ", evmAddress);
      let isAssociated = false;
      if (type === "hedera" && accountId) {
        // For HashPack, query account token balance
        const tokenInfo = await fetchTokenInfoFromMirrorNode(
          tokenId.toString()
        );
        isAssociated = tokenInfo ? true : false;
      } else if (type === "evm" && accountId && evmAddress) {
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
    tokenId: TokenId | string,
    accountKey: string | null
  ): Promise<string> {
    try {
      // Input validation
      if (!wallet || !tokenId) {
        throw new Error("Wallet and tokenId are required");
      }

      const { accountId, type } = wallet;
      const { client } = await initializeHederaClient();
      const evmAddress = "0x5518Bd143bf64807104DdB2421f4D8d3A60828F9";
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
      if (type === "hedera") {
        if (!accountId) {
          throw new Error("Hedera wallet requires accountId");
        }

        try {
          // Create the transaction
          const transaction = await new TokenAssociateTransaction()
            .setAccountId(accountIdObj!)
            .setTokenIds([tokenIdObj])
            .freezeWith(client)
            .sign(PrivateKey.fromStringECDSA(accountKey!));

          // Execute the signed transaction
          const response = await transaction.execute(client);
          console.log("Response: ", response);
          const receipt = await response.getReceipt(client);
          console.log("Receipt: ", receipt);

          console.log("Token association complete:", receipt.status.toString());

          // Verify the association was successful
          const verifyAssociation = await this.isTokenAssociated(
            wallet,
            tokenId
          );
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
      }

      // Handle EVM wallet (MetaMask)
      if (type === "evm") {
        if (!accountId || !evmAddress) {
          throw new Error("EVM wallet requires both accountId and evmAddress");
        }

        // Check if window.ethereum is available
        if (!window.ethereum) {
          throw new Error("MetaMask is not installed");
        }
        await window.ethereum.request({
          method: "wallet_requestSnaps",
          params: {
            "npm:@hashgraph/hedera-wallet-snap": {}, // request Hedera Snap
          },
        });

        try {
          const network = wallet.network || "testnet";
          const tokenIdStr =
            typeof tokenId === "string" ? tokenId : tokenId.toString();

          // Use Hedera Wallet Snap for token association
          const associateResult = await window.ethereum.request({
            method: "wallet_invokeSnap",
            params: {
              snapId: "npm:@hashgraph/hedera-wallet-snap",
              request: {
                method: "hts.associateTokens",
                params: {
                  accountId: accountId.toString(),
                  tokenIds: [tokenIdStr],
                  network,
                },
              },
            },
          });

          console.log("Hedera Snap association status:", associateResult);

          // Wait for a short period and verify the association
          await new Promise((resolve) => setTimeout(resolve, 5000));
          const verifyAssociation = await this.isTokenAssociated(
            wallet,
            tokenId
          );
          if (!verifyAssociation) {
            console.warn(
              "Token association transaction sent but verification pending. Snap result:",
              associateResult
            );
          }

          return typeof associateResult === "string"
            ? associateResult
            : "Token associated successfully with EVM wallet via Hedera Snap";
        } catch (snapError) {
          console.warn(
            "Hedera Snap association failed, falling back to standard association:",
            snapError
          );
        }
        // Fallback to standard association if Snap is not available or fails
        const tokenIdObj =
          typeof tokenId === "string" ? TokenId.fromString(tokenId) : tokenId;
        const accountIdObj =
          typeof evmAddress === "string"
            ? AccountId.fromString(evmAddress)
            : evmAddress;

        // Create the transaction
        const transaction = new TokenAssociateTransaction()
          .setAccountId(accountIdObj)
          .setTokenIds([tokenIdObj])
          .freezeWith(client);

        // Execute the transaction
        const response = await transaction.execute(client);
        const receipt = await response.getReceipt(client);

        // Wait for a short period and verify the association
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const verifyAssociation = await this.isTokenAssociated(wallet, tokenId);
        if (!verifyAssociation) {
          console.warn(
            "Token association transaction sent but verification pending."
          );
        }

        return "Token associated successfully with EVM wallet";
      }

      throw new Error(`Unsupported wallet type: ${type}`);
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
    // Use Hedera Mirror Node REST API to check token association
    try {
      // Mirror Node expects the EVM address in hex format (0x...)
      // const evmAddress = account;
      const tokenIdStr = contractId.toString();
      // You may want to use mainnet or testnet endpoint based on your environment
      const mirrorNodeUrl = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${evmAddress}/tokens`;
      const response = await fetch(mirrorNodeUrl);
      if (!response.ok) {
        throw new Error(`Mirror Node API error: ${response.status}`);
      }
      const data = await response.json();
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
