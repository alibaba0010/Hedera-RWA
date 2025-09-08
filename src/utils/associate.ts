import {
  AccountId,
  AccountUpdateTransaction,
  TokenAssociateTransaction,
  TokenId,
  Client,
  PrivateKey,
} from "@hashgraph/sdk";

interface AssociateParams {
  client: Client;
  accountId: AccountId | string;
  accountKey?: PrivateKey;
  tokenId: TokenId | string;
  desiredAutoSlots?: number;
}

interface AssociateResult {
  ok: boolean;
  mode?: "auto" | "manual";
  tx?: string;
  error?: string;
}

async function signAndExecute(
  client: Client,
  tx: any,
  privateKey: PrivateKey
): Promise<string> {
  try {
    const signed = await tx.freezeWith(client).sign(privateKey);
    const response = await signed.execute(client);
    const receipt = await response.getReceipt(client);
    return receipt.status.toString();
  } catch (error) {
    console.error("Error in signAndExecute:", error);
    throw error;
  }
}

export async function associateAccountWithToken({
  client,
  accountId,
  accountKey,
  tokenId,
  desiredAutoSlots = 10,
}: AssociateParams): Promise<AssociateResult> {
  try {
    // Convert IDs to their respective objects if they're strings
    const accountIdObj =
      typeof accountId === "string"
        ? AccountId.fromString(accountId)
        : accountId;
    const tokenIdObj =
      typeof tokenId === "string" ? TokenId.fromString(tokenId) : tokenId;

    // If accountId starts with "0x", it's an EVM address
    const isEvmAddress = accountId.toString().startsWith("0x");

    // For EVM addresses, we can still use the Hedera SDK with their corresponding account
    if (isEvmAddress) {
      // Direct token association for EVM-based accounts
      const assocTx = await new TokenAssociateTransaction()
        .setAccountId(accountIdObj)
        .setTokenIds([tokenIdObj]);

      if (!accountKey) throw new Error("accountKey is required for signing");
      const status = await signAndExecute(client, assocTx, accountKey);
      console.log("Token association complete for EVM account:", status);
      return { ok: true, mode: "manual", tx: status };
    }

    // For native Hedera accounts, try automatic first then manual
    try {
      // 1) Try automatic association by increasing maxAutoAssociations
      const autoTx = await new AccountUpdateTransaction()
        .setAccountId(accountIdObj)
        .setMaxAutomaticTokenAssociations(desiredAutoSlots);

      if (!accountKey) throw new Error("accountKey is required for signing");
      const status = await signAndExecute(client, autoTx, accountKey);
      console.log("Auto-association setting updated:", status);
      return { ok: true, mode: "auto", tx: status };
    } catch (e) {
      console.warn(
        "Auto-association update failed, falling back to manual:",
        e
      );
    }

    // 2) Manual association using HTS
    const assocTx = await new TokenAssociateTransaction()
      .setAccountId(accountIdObj)
      .setTokenIds([tokenIdObj]);

    if (!accountKey) throw new Error("accountKey is required for signing");
    const status = await signAndExecute(client, assocTx, accountKey);
    console.log("Manual association complete:", status);
    return { ok: true, mode: "manual", tx: status };
  } catch (error: any) {
    console.error("Error during token association:", error);
    return { ok: false, error: error.message };
  }
}
