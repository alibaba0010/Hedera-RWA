import {
  Client,
  TopicMessageSubmitTransaction,
  PrivateKey,
  AccountId,
  TopicCreateTransaction,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  AccountInfoQuery,
  TransferTransaction,
  // TopicMessageQuery
  Hbar,
} from "@hashgraph/sdk";
import { getEnv, topicId } from "@/utils";
import { DAppSigner } from "@hashgraph/hedera-wallet-connect";

// Utility functions for Hedera, IPFS, and Mirror Node integration
// These are stubs to be filled with real logic and API keys as needed
export async function initializeHederaClient(): Promise<{
  client: Client;
  treasuryId: AccountId;
  treasuryKey: PrivateKey;
}> {
  try {
    const treasuryId = AccountId.fromString(
      getEnv("VITE_PUBLIC_TREASURY_ACCOUNT_ID")
    );
    const treasuryKey = PrivateKey.fromStringED25519(
      getEnv("VITE_PUBLIC_TREASURY_DER_PRIVATE_KEY")
    );
    console.log("Treasury: ", treasuryId, treasuryKey);
    if (!treasuryId || !treasuryKey) {
      throw new Error(
        "Missing Hedera environment variables: VITE_PUBLIC_TREASURY_ACCOUNT_ID or VITE_PUBLIC_TREASURY_HEX_PRIVATE_KEY"
      );
    }
    const client = Client.forTestnet().setOperator(treasuryId, treasuryKey);

    return { client, treasuryId, treasuryKey };
  } catch (error: any) {
    console.error("Failed to initialize Hedera client:", error);
    throw new Error(`Hedera client initialization failed: ${error.message}`);
  }
}

// --- Hedera Token Service (HTS) ---
export async function createHederaToken({
  name,
  symbol,
  decimals,
  initialSupply,
  supplyType,
  maxSupply,
  accountId,
  signer,
}: {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
  // supplyType: "INFINITE" | "FINITE";
  supplyType: string;
  maxSupply?: number | null;
  accountId: string;
  signer: DAppSigner;
}): Promise<string> {
  try {
    const { client, treasuryKey, treasuryId } = await initializeHederaClient();
    // Get user's public key from their account
    const accountInfo = await new AccountInfoQuery()
      .setAccountId(treasuryId)
      .execute(client);
    const userPublicKey = accountInfo.key;
    console.log("Max supply: ", maxSupply);
    // Determine max supply based on supply type
    const tokenMaxSupply = supplyType === "FINITE" ? maxSupply : 10_000_000;
    if (!tokenMaxSupply) return "Supply should be greater than 0";
    // Create the token create transaction
    let tokenCreateTx = await new TokenCreateTransaction()
      .setTokenName(name)
      .setTokenSymbol(symbol)
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(decimals)
      .setInitialSupply(tokenMaxSupply)
      .setMaxSupply(tokenMaxSupply)
      .setTreasuryAccountId(treasuryId)
      .setAdminKey(userPublicKey)
      .setSupplyKey(userPublicKey)
      .setSupplyType(
        supplyType === "INFINITE"
          ? TokenSupplyType.Infinite
          : TokenSupplyType.Finite
      )
      .setMaxTransactionFee(new Hbar(20))
      .freezeWithSigner(signer);

    console.log("Token Create Transaction:", tokenCreateTx);

    // Sign the transaction with the treasury key
    const tokenCreateSign = await tokenCreateTx.sign(treasuryKey);
    console.log("Token Create Signed:", tokenCreateSign);

    // Execute the transaction
    const tokenCreateSubmit = await tokenCreateSign.executeWithSigner(signer);
    console.log("Token Create submit: ", tokenCreateSubmit);

    // Get the transaction receipt
    const tokenCreateRx = await tokenCreateSubmit.getReceipt(client);

    // Get the token ID
    const tokenId = tokenCreateRx.tokenId;

    // Transfer initial supply to the specified account if it's different from treasury
    if (accountId !== treasuryId.toString() && initialSupply > 0) {
      const transferTx = await new TransferTransaction()
        .addTokenTransfer(tokenId!, treasuryId, -initialSupply)
        .addTokenTransfer(
          tokenId!,
          AccountId.fromString(accountId),
          initialSupply
        )
        .freezeWith(client);

      const transferSign = await transferTx.sign(treasuryKey);
      const transferSubmit = await transferSign.execute(client);
      await transferSubmit.getReceipt(client);
      console.log(`✅ Transferred initial supply to ${accountId}`);
    }

    if (!tokenId) {
      throw new Error("Token creation failed: No token ID returned");
    }

    console.log(`✅ Created token with ID: ${tokenId.toString()}`);
    return tokenId.toString();
  } catch (error: any) {
    console.error("❌ Error creating Hedera token:", error);
    throw new Error(`Failed to create token: ${error.message}`);
  }
}
// Helper: Hash a file (SHA-256)
export async function hashFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
// --- Hedera Consensus Service (HCS) ---
export async function sendHcsMessage(message: any): Promise<{
  messageContent: string;
  transactionStatus: string;
  mirrorResponse?: any;
}> {
  try {
    const { client } = await initializeHederaClient();
    // Convert message to string if it's not already
    const messageString =
      typeof message === "string" ? message : JSON.stringify(message);

    // Create and execute the message submission transaction
    const submitTx = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(messageString);

    // Submit the transaction
    const submitResult = await submitTx.execute(client);

    // Get the receipt of the transaction
    const receipt = await submitResult.getReceipt(client);

    // Optional: Wait and check Mirror Node for the message
    console.log("Waiting for Mirror Node to update...");
    await new Promise((r) => setTimeout(r, 6000));

    let mirrorResponse;
    try {
      const url = `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.messages?.length) {
        mirrorResponse = data.messages[data.messages.length - 1];
      }
    } catch (mirrorError) {
      console.warn("Failed to fetch from Mirror Node:", mirrorError);
    }

    return {
      messageContent: messageString,
      transactionStatus: receipt.status.toString(),
      mirrorResponse,
    };
  } catch (error: any) {
    console.error("Failed to send HCS message:", error);
    throw new Error(`Failed to send message: ${error.message}`);
  }
}

// Helper: Publish to Registry (stub)
export async function publishToRegistry(tokenId: string, metadataCID: string) {
  // Load credentials from env
  const { client } = await initializeHederaClient();

  // Prepare message
  const message = JSON.stringify({
    type: "RealEstateAsset",
    tokenId,
    metadataCID,
    timestamp: new Date().toISOString(),
  });
  console.log("Messsge: ", message);
  // Publish message to topic
  const submitMsgTx = await new TopicMessageSubmitTransaction({
    topicId,
    message,
  }).execute(client);
  const receipt = await submitMsgTx.getReceipt(client);
  console.log(
    `📤 Registry message submitted | Status: ${receipt.status.toString()}`
  );
}

export async function createTopic() {
  const { client } = await initializeHederaClient();
  const tx = new TopicCreateTransaction().setTopicMemo("Asset Registry");
  const submit = await tx.execute(client);
  const receipt = await submit.getReceipt(client);
  if (!receipt.topicId) {
    throw new Error("Failed to create topic: topicId is null");
  }
  const topicId = receipt.topicId.toString();
  console.log("New Topic ID:", topicId);
  return topicId;
}

// --- Mirror Node ---
export async function fetchAssetDataFromMirrorNode(
  tokenId: string
): Promise<any> {
  // TODO: Query Hedera Mirror Node REST API for token info, supply, transactions
  return {
    price: "$250",
    totalSupply: 10000,
    circulatingSupply: 3247,
    holders: 120,
  };
}

// --- Asset Metadata ---
export async function fetchAssetMetadataFromIPFS(cid: string): Promise<any> {
  try {
    // Use the IPFS gateway URL to fetch the metadata
    const gateway = "https://ipfs.io/ipfs/";
    const response = await fetch(`${gateway}${cid}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    const metadata = await response.json();
    return metadata;
  } catch (error: any) {
    console.error("Error fetching metadata from IPFS:", error);
    throw new Error(`Failed to fetch metadata: ${error.message}`);
  }
}
export async function checkTokenAssocationMirrorNode(
  tokenId: string,
  accountId: string
): Promise<boolean> {
  try {
    console.log("Checking token association for:", tokenId, accountId);
    // First check if the account exists and get its tokens
    const accountUrl = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens?limit=100`;
    const accountResponse = await fetch(accountUrl);

    if (!accountResponse.ok) {
      if (accountResponse.status === 404) {
        return false; // Account doesn't exist or has no token associations
      }
      throw new Error(
        `Failed to fetch account info: ${accountResponse.statusText}`
      );
    }

    const accountData = await accountResponse.json();
    console.log("Account Data from Mirror Node:", accountData);
    // Check if the token is in the account's token list
    if (accountData.tokens) {
      // Find the specific token in the account's token relationships
      const tokenAssociation = accountData.tokens.find(
        (token: { token_id: string }) => token.token_id === tokenId
      );

      return !!tokenAssociation; // Returns true if token is found, false otherwise
    }

    return false; // No tokens found for this account
  } catch (error: any) {
    console.error("Error checking token association in Mirror Node:", error);
    throw new Error(`Failed to check token association: ${error.message}`);
  }
}
interface TradingOptions {
  tradingPair: "HBAR" | "USDC";
  value: number;
  pricePerToken: number;
}

export const buyAssetToken = async (
  tokenId: string,
  accountId: string,
  amount: number,
  signer: DAppSigner,
  options: TradingOptions
): Promise<{ status: string; receipt: any }> => {
  try {
    const { client, treasuryId, treasuryKey } = await initializeHederaClient();
    console.log("Options: ", options);
    // Handle payment based on trading pair
    if (options.tradingPair === "HBAR") {
      const hbarAmount = new Hbar(options.value);
      const deductHbarTx = await new TransferTransaction()
        .addHbarTransfer(accountId, hbarAmount.negated()) // Deduct HBAR from buyer
        .addHbarTransfer(treasuryId, hbarAmount) // Add HBAR to treasury
        .freezeWith(client)
        .sign(treasuryKey);
      console.log("Deduct HBAR Transaction:", deductHbarTx);
      const deductHbarSubmit = await deductHbarTx.executeWithSigner(signer);
      console.log("Deduct HBAR Submit:", deductHbarSubmit);
      const deductHbarRx = await deductHbarSubmit.getReceipt(client);
      console.log("Deduct HBAR Receipt:", deductHbarRx);

      if (deductHbarRx.status.toString() !== "SUCCESS") {
        throw new Error(
          `HBAR payment failed with status: ${deductHbarRx.status}`
        );
      }
      console.log(`HBAR payment successful: ${deductHbarRx.status} ✅`);
    } else {
      // For USDC trading pair
      // TODO: Implement USDC token transfer once the USDC token ID is available
      // This would involve a similar token transfer transaction but with the USDC token
      console.log("USDC payment to be implemented");
    }
    // Create the transfer transaction
    const tokenTransferTx = await new TransferTransaction()

      .addTokenTransfer(tokenId, treasuryId, -amount) // Deduct from treasury
      .addTokenTransfer(tokenId, accountId, amount) // Add to buyer
      .freezeWith(client)
      .signWithSigner(signer);
    console.log("Token Transfer Transaction:", tokenTransferTx);
    // Execute the transaction
    const tokenTransferSubmit = await tokenTransferTx.execute(client);
    const tokenTransferRx = await tokenTransferSubmit.getReceipt(client);

    if (tokenTransferRx.status.toString() !== "SUCCESS") {
      throw new Error(
        `Transaction failed with status: ${tokenTransferRx.status}`
      );
    }

    console.log(`Token transfer successful: ${tokenTransferRx.status} ✅`);
    return {
      status: tokenTransferRx.status.toString(),
      receipt: tokenTransferRx,
    };
  } catch (error: any) {
    console.error("Error in buyAssetToken:", error);
    throw new Error(`Failed to buy asset token: ${error.message}`);
  }
};

export const sellAssetToken = async (
  tokenId: string,
  accountId: string,
  amount: number,
  signer: DAppSigner,
  options: TradingOptions
): Promise<{ status: string; receipt: any }> => {
  try {
    const { client, treasuryId } = await initializeHederaClient();

    // Create the transfer transaction
    const tokenTransferTx = await new TransferTransaction()
      .addTokenTransfer(tokenId, accountId, -amount) // Deduct from seller
      .addTokenTransfer(tokenId, treasuryId, amount) // Add to treasury
      .freezeWith(client)
      .signWithSigner(signer); // Sign with seller's key
    console.log("Token Transfer Transaction:", tokenTransferTx);
    // Execute the transaction
    const tokenTransferSubmit = await tokenTransferTx.execute(client);
    const tokenTransferRx = await tokenTransferSubmit.getReceipt(client);
    console.log("Token Transfer Receipt:", tokenTransferRx);

    if (tokenTransferRx.status.toString() !== "SUCCESS") {
      throw new Error(
        `Transaction failed with status: ${tokenTransferRx.status}`
      );
    }

    console.log(`Token transfer successful: ${tokenTransferRx.status} ✅`);
    // Optionally, transfer HBAR from treasury to seller as payment
    const deductHbarFromTreasuryTx = await new TransferTransaction()
      .addHbarTransfer(treasuryId, new Hbar(-0.1)) // Deduct 0.1 HBAR from treasury
      .addHbarTransfer(accountId, new Hbar(0.1)) // Add 0.1 HBAR to seller
      .freezeWith(client)
      .signWithSigner(signer);
    const deductHbarFromTreasurySubmit = await deductHbarFromTreasuryTx.execute(
      client
    );
    const deductHbarFromTreasuryRx =
      await deductHbarFromTreasurySubmit.getReceipt(client);
    if (deductHbarFromTreasuryRx.status.toString() !== "SUCCESS") {
      throw new Error(
        `HBAR transfer to seller failed with status: ${deductHbarFromTreasuryRx.status}`
      );
    }
    console.log(
      `HBAR transfer to seller successful: ${deductHbarFromTreasuryRx.status} ✅`
    );
    return {
      status: tokenTransferRx.status.toString(),
      receipt: tokenTransferRx,
    };
  } catch (error: any) {
    console.error("Error in sellAssetToken:", error);
    throw new Error(`Failed to sell asset token: ${error.message}`);
  }
};

// TODO: Get the available tokens available on treasury account
export const getTokenBalanceByTokenId = async (tokenId: string) => {
  // get hbar balance from treasury account

  const { client, treasuryId } = await initializeHederaClient();

  const accountInfo = await new AccountInfoQuery()
    .setAccountId(treasuryId)
    .execute(client);
  const hbarBalance = accountInfo.balance.toString();
  console.log("Hbar Balance: ", hbarBalance);
  const tokenBalance = accountInfo.tokenRelationships.get(tokenId);
  if (!tokenBalance) {
    throw new Error(`No token relationship found for token ID: ${tokenId}`);
  }
  return tokenBalance.balance;
};
