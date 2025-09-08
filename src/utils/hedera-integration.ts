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
} from "@hashgraph/sdk";
import { getEnv } from "@/utils";

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
  totalSupply,
  supplyType,
  maxSupply,
  accountId,
}: {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
  totalSupply: number;
  supplyType: "INFINITE" | "FINITE";
  maxSupply?: number | null;

  accountId: string;
}): Promise<string> {
  try {
    const { client, treasuryId, treasuryKey } = await initializeHederaClient();
    // Get user's public key from their account
    const accountInfo = await new AccountInfoQuery()
      .setAccountId(accountId)
      .execute(client);
    const userPublicKey = accountInfo.key;
    console.log("User Public Key:", userPublicKey.toString());

    // Create the token create transaction
    let tokenCreateTx = await new TokenCreateTransaction()
      .setTokenName(name)
      .setTokenSymbol(symbol)
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(decimals)
      .setInitialSupply(initialSupply)
      .setMaxSupply(totalSupply)
      .setTreasuryAccountId(treasuryId)
      .setAdminKey(userPublicKey)
      .setSupplyKey(userPublicKey)
      .setSupplyType(
        supplyType === "INFINITE"
          ? TokenSupplyType.Infinite
          : TokenSupplyType.Finite
      );

    // If supply type is finite, set the max supply
    if (supplyType === "FINITE" && maxSupply) {
      tokenCreateTx.setMaxSupply(maxSupply);
    }

    // Freeze the transaction for signing
    const frozenTx = await tokenCreateTx.freezeWith(client);

    // Sign the transaction with the treasury key
    const signedTx = await frozenTx.sign(treasuryKey);

    // Submit the transaction
    const tokenCreateSubmit = await signedTx.execute(client);

    // Get the transaction receipt
    const tokenCreateRx = await tokenCreateSubmit.getReceipt(client);

    // Get the token ID
    const tokenId = tokenCreateRx.tokenId;

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
