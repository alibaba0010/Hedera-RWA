import {
  Client,
  TopicMessageSubmitTransaction,
  TopicId,
  PrivateKey,
  AccountId,
  TopicCreateTransaction,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  AccountInfoQuery,
  TransferTransaction,
  Hbar,
  TokenMintTransaction,
} from "@hashgraph/sdk";
import { getEnv } from "@/utils";
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
      getEnv("VITE_PUBLIC_ENCODED_PRIVATE_KEY")
    );
    if (!treasuryId || !treasuryKey) {
      throw new Error(
        "Missing Hedera environment variables: VITE_PUBLIC_TREASURY_ACCOUNT_ID or VITE_PUBLIC_ENCODED_PRIVATE_KEY"
      );
    }
    const client = Client.forTestnet().setOperator(treasuryId, treasuryKey);

    return { client, treasuryId, treasuryKey };
  } catch (error: any) {
    console.error("Failed to initialize Hedera client:", error);
    throw new Error(`Hedera client initialization failed: ${error.message}`);
  }
}
// --- IPFS ---
export async function uploadFileToIPFS(file: File): Promise<string> {
  // TODO: Integrate with IPFS pinning service (e.g., Pinata, web3.storage)
  const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getEnv("VITE_PUBLIC_PINATA_JWT")}`,
    },
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload file to IPFS");
  const data = await res.json();
  // Return the IPFS hash (CID)
  return data.IpfsHash;
}
// Helper: Upload metadata (JSON) to IPFS via Pinata
export async function uploadJSONToIPFS(json: any): Promise<string> {
  const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getEnv("VITE_PUBLIC_PINATA_JWT")}`,
    },
    body: JSON.stringify(json),
  });
  if (!res.ok) throw new Error("Failed to upload metadata to IPFS");
  const data = await res.json();
  return data.IpfsHash;
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
  supplyType: "INFINITE" | "FINITE";
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
    // Create the token create transaction
    let tokenCreateTx = await new TokenCreateTransaction()
      .setTokenName(name)
      .setTokenSymbol(symbol)
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(decimals)
      .setInitialSupply(initialSupply)
      .setMaxSupply(maxSupply || 0)
      .setTreasuryAccountId(accountId)
      .setAdminKey(userPublicKey)
      .setSupplyKey(userPublicKey)
      .setSupplyType(
        supplyType === "INFINITE"
          ? TokenSupplyType.Infinite
          : TokenSupplyType.Finite
      )
      .setMaxTransactionFee(new Hbar(20))
      .freezeWithSigner(signer);

    // If supply type is finite, set the max supply
    if (supplyType === "FINITE" && maxSupply) {
      tokenCreateTx.setMaxSupply(maxSupply);
    }
    console.log("Token Create Transaction:", tokenCreateTx);

    // Sign the transaction with the signer

    const tokenCreateSign = await tokenCreateTx.signWithSigner(signer);
    console.log("Token Create Signed:", tokenCreateSign);
    const tokenCreateSubmit = await tokenCreateSign.executeWithSigner(signer);
    console.log("Token Create submit: ", tokenCreateSubmit);
    // Get the transaction receipt
    const tokenCreateRx = await tokenCreateSubmit.getReceiptWithSigner(signer);

    // Get the token ID
    const tokenId = tokenCreateRx.tokenId;
    // Mint remaining supply to treasury if needed
    if (supplyType === "FINITE" && maxSupply) {
      console.log(`Max Supply: ${maxSupply}, Initial Supply: ${initialSupply}`);
      const remaining = maxSupply - initialSupply;
      console.log("Remaining to mint:", remaining);
      const mintTx = await new TokenMintTransaction()
        .setTokenId(tokenId!)
        .setAmount(remaining)
        .freezeWith(client);
      const mintSign = await mintTx.sign(treasuryKey);
      const mintSubmit = await mintSign.execute(client);
      const mintRx = await mintSubmit.getReceipt(client);
      console.log(`Minted remaining supply: ${mintRx.status.toString()} ✅`);
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
export async function sendHcsMessage(
  topicId: string,
  message: any
): Promise<{
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
      .setTopicId(TopicId.fromString(topicId))
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
  const topicId = TopicId.fromString(getEnv("VITE_PUBLIC_HEDERA_ASSET_TOPIC"));

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
export const buyAssetToken = async (
  tokenId: string,
  accountId: string,
  amount: number,
  signer: DAppSigner
): Promise<{ status: string; receipt: any }> => {
  try {
    const { client, treasuryId } = await initializeHederaClient();

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
  accountKey: PrivateKey,
  amount: number
): Promise<any> => {
  try {
    const { client, treasuryId } = await initializeHederaClient();

    // Create the transfer transaction
    const tokenTransferTx = await new TransferTransaction()
      .addTokenTransfer(tokenId, accountId, -amount) // Deduct from seller
      .addTokenTransfer(tokenId, treasuryId, amount) // Add to treasury
      .freezeWith(client)
      .sign(accountKey); // Sign with seller's key
    console.log("Token Transfer Transaction:", tokenTransferTx);
    // Execute the transaction
    const tokenTransferSubmit = await tokenTransferTx.execute(client);
    const tokenTransferRx = await tokenTransferSubmit.getReceipt(client);
    console.log();
  } catch (e) {}
};
