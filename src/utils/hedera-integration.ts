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
  TokenGrantKycTransaction,
  Hbar,
  TokenId,
} from "@hashgraph/sdk";
import { getEnv, topicId, usdcTokenId } from "@/utils";
import { DAppSigner } from "@hashgraph/hedera-wallet-connect";

// ─── Custom error for insufficient balance ────────────────────────────────────
export class InsufficientBalanceError extends Error {
  constructor(
    public readonly account: string,
    public readonly required: number,
    public readonly available: number,
    public readonly currency: string,
  ) {
    super(
      `Insufficient ${currency} balance on account ${account}. ` +
        `Required: ${required} ${currency}, Available: ${available} ${currency}.`,
    );
    this.name = "InsufficientBalanceError";
  }
}

// ─── Mirror-Node balance helpers ──────────────────────────────────────────────

/**
 * Returns the HBAR balance (in whole HBAR) for the given account.
 * Uses the Hedera Testnet Mirror Node REST API.
 */
export async function getHbarBalance(accountId: string): Promise<number> {
  const url = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch HBAR balance for ${accountId}: ${res.statusText}`,
    );
  }
  const data = await res.json();
  // Mirror Node returns balance in tinybars; convert to HBAR (1 HBAR = 100_000_000 tinybars)
  const tinybars: number = data?.balance?.balance ?? 0;
  return tinybars / 100_000_000;
}

/**
 * Returns the balance of a specific HTS token for the given account.
 * The returned value is in the token's smallest denomination (as stored on-chain).
 */
export async function getAccountTokenBalance(
  accountId: string,
  tokenId: string,
): Promise<number> {
  const url = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch token balance for account ${accountId}: ${res.statusText}`,
    );
  }
  const data = await res.json();
  const tokenEntry = (data?.tokens ?? []).find(
    (t: { token_id: string; balance: number }) => t.token_id === tokenId,
  );
  return tokenEntry?.balance ?? 0;
}
interface TradingOptions {
  tradingPair: "HBAR" | "USDC";
  value: number;
}
// Utility functions for Hedera, IPFS, and Mirror Node integration
// These are stubs to be filled with real logic and API keys as needed
export async function initializeHederaClient(): Promise<{
  client: Client;
  treasuryId: AccountId;
  treasuryKey: PrivateKey;
}> {
  try {
    const treasuryId = AccountId.fromString(
      getEnv("VITE_PUBLIC_TREASURY_ACCOUNT_ID"),
    );
    const treasuryKey = PrivateKey.fromStringED25519(
      getEnv("VITE_PUBLIC_TREASURY_DER_PRIVATE_KEY"),
    );
    if (!treasuryId || !treasuryKey) {
      throw new Error(
        "Missing Hedera environment variables: VITE_PUBLIC_TREASURY_ACCOUNT_ID or VITE_PUBLIC_TREASURY_HEX_PRIVATE_KEY",
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
  requireKyc,
}: {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
  supplyType: "INFINITE" | "FINITE";
  maxSupply?: number | null;
  accountId: string;
  signer: DAppSigner;
  requireKyc?: boolean;
}): Promise<string> {
  try {
    const { client, treasuryKey, treasuryId } = await initializeHederaClient();

    // Get treasury public key (or we could use the user's public key if we had it)
    const accountInfo = await new AccountInfoQuery()
      .setAccountId(treasuryId)
      .execute(client);
    const treasuryPublicKey = accountInfo.key;
    // Determine max supply based on supply type
    const tokenMaxSupply = supplyType === "FINITE" ? maxSupply : 10_000_000;
    if (!tokenMaxSupply) return "Supply should be greater than 0";
    // Create the token create transaction
    const isFinite = supplyType === "FINITE";
    const tokenCreateTx = new TokenCreateTransaction()
      .setTokenName(name)
      .setTokenSymbol(symbol)
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(decimals)
      .setInitialSupply(initialSupply || 0)
      .setTreasuryAccountId(treasuryId)
      .setAdminKey(treasuryPublicKey)
      .setSupplyKey(treasuryPublicKey)
      .setSupplyType(
        isFinite ? TokenSupplyType.Finite : TokenSupplyType.Infinite,
      )
      .setMaxTransactionFee(new Hbar(30));

    // If requireKyc is passed, default the KYC key to the treasury public key
    if (requireKyc) {
      tokenCreateTx.setKycKey(treasuryPublicKey);
    }

    if (supplyType === "FINITE" && maxSupply) {
      tokenCreateTx.setMaxSupply(maxSupply);
    }

    const frozenTx = await tokenCreateTx.freezeWithSigner(signer);

    // Sign the transaction with the treasury key
    const tokenCreateSign = await frozenTx.sign(treasuryKey);

    // Execute the transaction
    const tokenCreateSubmit = await tokenCreateSign.executeWithSigner(signer);

    // Get the transaction receipt
    const tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
    const tokenId = tokenCreateRx.tokenId;

    // Transfer initial supply to the specified account if it's different from treasury
    if (accountId !== treasuryId.toString() && initialSupply > 0) {
      const transferTx = await new TransferTransaction()
        .addTokenTransfer(tokenId!, treasuryId, -initialSupply)
        .addTokenTransfer(
          tokenId!,
          AccountId.fromString(accountId),
          initialSupply,
        )
        .freezeWith(client);

      const transferSign = await transferTx.sign(treasuryKey);
      const transferSubmit = await transferSign.execute(client);
      await transferSubmit.getReceipt(client);
    }

    if (!tokenId) {
      throw new Error("Token creation failed: No token ID returned");
    }

    return tokenId.toString();
  } catch (error: any) {
    console.error("❌ Error creating Hedera token:", error);
    throw new Error(`Failed to create token: ${error.message}`);
  }
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
    `📤 Registry message submitted | Status: ${receipt.status.toString()}`,
  );
}

// --- Mirror Node ---
export async function fetchAssetDataFromMirrorNode(
  tokenId: string,
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
  accountId: string,
): Promise<boolean> {
  try {
    // First check if the account exists and get its tokens
    const accountUrl = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens?limit=100`;
    const accountResponse = await fetch(accountUrl);

    if (!accountResponse.ok) {
      if (accountResponse.status === 404) {
        return false; // Account doesn't exist or has no token associations
      }
      throw new Error(
        `Failed to fetch account info: ${accountResponse.statusText}`,
      );
    }

    const accountData = await accountResponse.json();

    // Check if the token is in the account's token list
    if (accountData.tokens) {
      // Find the specific token in the account's token relationships
      const tokenAssociation = accountData.tokens.find(
        (token: { token_id: string }) => token.token_id === tokenId,
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
  signer: DAppSigner,
  tradingPair: "HBAR" | "USDC",
  value: number,
): Promise<{ status: string; receipt: any }> => {
  try {
    console.log("Buy Asset Token ", tradingPair, value);
    const { client, treasuryId, treasuryKey } = await initializeHederaClient();

    // ── Pre-flight balance check ──────────────────────────────────────────────
    if (tradingPair === "HBAR") {
      const buyerHbarBalance = await getHbarBalance(accountId);
      console.log(
        `Buyer HBAR balance: ${buyerHbarBalance} HBAR | Required: ${value} HBAR`,
      );
      if (buyerHbarBalance < value) {
        throw new InsufficientBalanceError(
          accountId,
          value,
          buyerHbarBalance,
          "HBAR",
        );
      }
    } else {
      // USDC: balance is stored in micro-units (6 decimals)
      const usdcAmountRequired = value * 1_000_000;
      const buyerUsdcBalance = await getAccountTokenBalance(
        accountId,
        usdcTokenId,
      );
      console.log(
        `Buyer USDC balance: ${buyerUsdcBalance} µUSDC | Required: ${usdcAmountRequired} µUSDC`,
      );
      if (buyerUsdcBalance < usdcAmountRequired) {
        throw new InsufficientBalanceError(
          accountId,
          value,
          buyerUsdcBalance / 1_000_000,
          "USDC",
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Handle payment based on trading pair
    if (tradingPair === "HBAR") {
      const hbarAmount = new Hbar(value);
      const deductHbarTx = await new TransferTransaction()
        .addHbarTransfer(accountId, hbarAmount.negated()) // Deduct HBAR from buyer
        .addHbarTransfer(treasuryId, hbarAmount) // Add HBAR to treasury
        .freezeWith(client)
        .sign(treasuryKey);
      const deductHbarSubmit = await deductHbarTx.executeWithSigner(signer);
      const deductHbarRx = await deductHbarSubmit.getReceipt(client);

      if (deductHbarRx.status.toString() !== "SUCCESS") {
        throw new Error(
          `HBAR payment failed with status: ${deductHbarRx.status}`,
        );
      }
      console.log(`HBAR payment successful: ${deductHbarRx.status} ✅`);
    } else {
      // For USDC trading pair
      const usdcAmount = value * 1_000_000; // Convert to lowest denomination
      const usdcTransferTx = await new TransferTransaction()
        .addTokenTransfer(usdcTokenId, accountId, -usdcAmount) // Deduct USDC from buyer
        .addTokenTransfer(usdcTokenId, treasuryId, usdcAmount) // Add USDC to treasury
        .freezeWith(client);

      const usdcTransferSign = await usdcTransferTx.sign(treasuryKey);
      const usdcTransferSubmit =
        await usdcTransferSign.executeWithSigner(signer);
      const usdcTransferRx = await usdcTransferSubmit.getReceipt(client);

      if (usdcTransferRx.status.toString() !== "SUCCESS") {
        throw new Error(
          `USDC payment failed with status: ${usdcTransferRx.status}`,
        );
      }
      console.log(`USDC payment successful: ${usdcTransferRx.status} ✅`);
    }

    // Transfer asset tokens from treasury → buyer
    const tokenTransferTx = await new TransferTransaction()
      .addTokenTransfer(tokenId, treasuryId, -amount) // Deduct from treasury
      .addTokenTransfer(tokenId, accountId, amount) // Add to buyer
      .freezeWith(client)
      .signWithSigner(signer);
    // Execute the transaction
    const tokenTransferSubmit = await tokenTransferTx.execute(client);
    const tokenTransferRx = await tokenTransferSubmit.getReceipt(client);

    if (tokenTransferRx.status.toString() !== "SUCCESS") {
      throw new Error(
        `Transaction failed with status: ${tokenTransferRx.status}`,
      );
    }

    console.log(`Token transfer successful: ${tokenTransferRx.status} ✅`);
    return {
      status: tokenTransferRx.status.toString(),
      receipt: tokenTransferRx,
    };
  } catch (error: any) {
    // Re-throw InsufficientBalanceError as-is so callers can inspect it
    if (error instanceof InsufficientBalanceError) throw error;
    console.error("Error in buyAssetToken:", error);
    throw new Error(`Failed to buy asset token: ${error.message}`);
  }
};

export const sellAssetToken = async (
  tokenId: string,
  accountId: string,
  amount: number,
  signer: DAppSigner,
  value: number,
): Promise<{ status: string; receipt: any }> => {
  try {
    const { client, treasuryId, treasuryKey } = await initializeHederaClient();

    // ── Pre-flight balance checks ─────────────────────────────────────────────

    // 1. Seller must hold enough asset tokens to sell
    const sellerTokenBalance = await getAccountTokenBalance(accountId, tokenId);
    console.log(
      `Seller token balance: ${sellerTokenBalance} | Required: ${amount}`,
    );
    if (sellerTokenBalance < amount) {
      throw new InsufficientBalanceError(
        accountId,
        amount,
        sellerTokenBalance,
        `token (${tokenId})`,
      );
    }

    // 2. Treasury must hold enough HBAR to pay the seller
    const treasuryHbarBalance = await getHbarBalance(treasuryId.toString());
    console.log(
      `Treasury HBAR balance: ${treasuryHbarBalance} HBAR | Required: ${value} HBAR`,
    );
    if (treasuryHbarBalance < value) {
      throw new InsufficientBalanceError(
        treasuryId.toString(),
        value,
        treasuryHbarBalance,
        "HBAR (treasury)",
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Transfer asset tokens from seller → treasury
    const tokenTransferTx = await new TransferTransaction()
      .addTokenTransfer(tokenId, accountId, -amount) // Deduct from seller
      .addTokenTransfer(tokenId, treasuryId, amount) // Add to treasury
      .freezeWith(client)
      .sign(treasuryKey);
    console.log("Token Transfer Transaction:", tokenTransferTx);
    // Execute the transaction
    const tokenTransferSubmit = await tokenTransferTx.executeWithSigner(signer);
    const tokenTransferRx = await tokenTransferSubmit.getReceipt(client);
    console.log("Token Transfer Receipt:", tokenTransferRx);

    if (tokenTransferRx.status.toString() !== "SUCCESS") {
      throw new Error(
        `Transaction failed with status: ${tokenTransferRx.status}`,
      );
    }

    // Pay the seller in HBAR from treasury
    const hbarAmount = new Hbar(value);
    const deductHbarTx = await new TransferTransaction()
      .addHbarTransfer(treasuryId, hbarAmount.negated()) // Deduct HBAR from treasury
      .addHbarTransfer(accountId, hbarAmount) // Add HBAR to seller account
      .freezeWith(client)
      .sign(treasuryKey);
    console.log("Deduct HBAR Transaction:", deductHbarTx);
    const deductHbarSubmit = await deductHbarTx.executeWithSigner(signer);
    console.log("Deduct HBAR Submit:", deductHbarSubmit);
    const deductHbarRx = await deductHbarSubmit.getReceipt(client);
    console.log("Deduct HBAR Receipt:", deductHbarRx);
    if (deductHbarRx.status.toString() !== "SUCCESS") {
      throw new Error(
        `HBAR payment failed with status: ${deductHbarRx.status}`,
      );
    }
    console.log(`HBAR payment successful: ${deductHbarRx.status} ✅`);

    return {
      status: tokenTransferRx.status.toString(),
      receipt: tokenTransferRx,
    };
  } catch (error: any) {
    // Re-throw InsufficientBalanceError as-is so callers can inspect it
    if (error instanceof InsufficientBalanceError) throw error;
    console.error("Error in sellAssetToken:", error);
    throw new Error(`Failed to sell asset token: ${error.message}`);
  }
};

export const getTokenBalanceByTokenId = async (
  tokenId: string,
  accountId: string,
) => {
  try {
    const { client } = await initializeHederaClient();

    const accountInfo = await new AccountInfoQuery()
      .setAccountId(accountId)
      .execute(client);

    // The SDK map uses TokenId objects as keys, so we must convert the string
    const tokenIdObj = TokenId.fromString(tokenId);
    const tokenBalance = accountInfo.tokenRelationships.get(tokenIdObj);

    if (!tokenBalance) {
      // Return 0 if not associated instead of throwing an error
      return "0";
    }
    return tokenBalance.balance.toString();
  } catch (error) {
    console.warn(`Could not fetch balance for token ${tokenId}:`, error);
    return "0";
  }
};

// mint nft function
export const mintNft = async (
  tokenId: string,
  metadata: Uint8Array[],
  accountId: string,
  signer: DAppSigner,
): Promise<string[]> => {
  try {
    const { client, treasuryKey } = await initializeHederaClient();

    const serialNumbers: string[] = [];

    for (const data of metadata) {
      const mintTx = await (
        await new TransferTransaction()
          .addTokenTransfer(tokenId, accountId, 1)
          .freezeWith(client)
          .sign(treasuryKey)
      ).executeWithSigner(signer);

      const mintRx = await mintTx.getReceipt(client);
      if (mintRx.status.toString() !== "SUCCESS") {
        throw new Error(`Minting failed with status: ${mintRx.status}`);
      }
      serialNumbers.push(mintRx.serials![0].toString());
    }

    return serialNumbers;
  } catch (error: any) {
    console.error("Error minting NFT:", error);
    throw new Error(`Failed to mint NFT: ${error.message}`);
  }
};

export const grantKyc = async (
  tokenId: string,
  accountIdToGrant: string,
): Promise<string> => {
  try {
    const { client, treasuryKey } = await initializeHederaClient();

    const transaction = new TokenGrantKycTransaction()
      .setTokenId(tokenId)
      .setAccountId(accountIdToGrant)
      .freezeWith(client);

    const signTx = await transaction.sign(treasuryKey);
    const txResponse = await signTx.execute(client);
    const receipt = await txResponse.getReceipt(client);

    if (receipt.status.toString() !== "SUCCESS") {
      throw new Error(`Grant KYC failed with status: ${receipt.status}`);
    }

    return receipt.status.toString();
  } catch (error: any) {
    console.error("Error granting KYC:", error);
    throw new Error(`Failed to grant KYC: ${error.message}`);
  }
};

export const distributeYield = async (
  tokenId: string,
  yieldAmountHbar: number,
  signer: DAppSigner,
): Promise<{ status: string; totalDistributed: number }> => {
  try {
    const { client, treasuryId } = await initializeHederaClient();

    // 1. Fetch current holders of the token from testnet mirror node
    const url = `https://testnet.mirrornode.hedera.com/api/v1/tokens/${tokenId}/balances`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch token balances");

    const data = await res.json();
    let balances = data.balances || [];

    // Filter out treasury account and empty balances
    balances = balances.filter(
      (b: any) => b.account !== treasuryId.toString() && Number(b.balance) > 0,
    );

    if (balances.length === 0) {
      throw new Error("No holders found to distribute yield to.");
    }

    // 2. Calculate proportions
    const totalHolderSupply = balances.reduce(
      (sum: number, b: any) => sum + Number(b.balance),
      0,
    );

    // 3. Prepare TransferTransaction
    const transferTx = new TransferTransaction();
    let totalDistributed = 0;

    // Distribute proportional HBAR
    balances.forEach((b: any) => {
      const share = Number(b.balance) / totalHolderSupply;
      let userReward = yieldAmountHbar * share;
      // Truncate to avoid too many decimal places
      userReward = Math.floor(userReward * 1e8) / 1e8;

      if (userReward > 0) {
        transferTx.addHbarTransfer(b.account, new Hbar(userReward));
        totalDistributed += userReward;
      }
    });

    if (totalDistributed <= 0) {
      throw new Error("Calculated distribution amount is zero.");
    }

    // Treasury pays the entire sum distributed
    transferTx.addHbarTransfer(treasuryId, new Hbar(-totalDistributed));
    transferTx.freezeWith(client);

    // 4. Sign and execute using the DappSigner (since owner triggered this)
    const transferSubmit = await transferTx.executeWithSigner(signer);
    const transferRx = await transferSubmit.getReceipt(client);

    if (transferRx.status.toString() !== "SUCCESS") {
      throw new Error(`Yield distribution failed: ${transferRx.status}`);
    }

    return { status: transferRx.status.toString(), totalDistributed };
  } catch (error: any) {
    console.error("Error in distributeYield:", error);
    throw new Error(`Failed to distribute yield: ${error.message}`);
  }
};
