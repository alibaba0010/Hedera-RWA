import { Hbar, TransferTransaction } from "@hashgraph/sdk";
import { initializeHederaClient } from "./hedera-integration";
import { DAppSigner } from "@hashgraph/hedera-wallet-connect";
import { usdcTokenId } from ".";

export const placeBuyOrderOnHedera = async (
  accountId: string,
  signer: DAppSigner,
  tradingPair: "HBAR" | "USDC",
  value: number
) => {
  // Placeholder function to simulate placing an order on the Hedera network
  try {
    // Simulate network call
    const { client, treasuryId, treasuryKey } = await initializeHederaClient();

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
          `HBAR payment failed with status: ${deductHbarRx.status}`
        );
      }
      console.log(`HBAR payment successful: ${deductHbarRx.status} ✅`);
      return { status: deductHbarRx.status.toString(), receipt: deductHbarRx };
    } else {
      // For USDC trading pair
      const usdcAmount = value * 1_000_000; // Convert to lowest denomination
      const usdcTransferTx = await new TransferTransaction()
        .addTokenTransfer(usdcTokenId, accountId, -usdcAmount) // Deduct USDC from buyer
        .addTokenTransfer(usdcTokenId, treasuryId, usdcAmount) // Add USDC to treasury
        .freezeWith(client);

      const usdcTransferSign = await usdcTransferTx.sign(treasuryKey);
      const usdcTransferSubmit = await usdcTransferSign.executeWithSigner(
        signer
      );
      const usdcTransferRx = await usdcTransferSubmit.getReceipt(client);

      if (usdcTransferRx.status.toString() !== "SUCCESS") {
        throw new Error(
          `USDC payment failed with status: ${usdcTransferRx.status}`
        );
      }
      console.log(`USDC payment successful: ${usdcTransferRx.status} ✅`);
      return {
        status: usdcTransferRx.status.toString(),
        receipt: usdcTransferRx,
      };
    }
  } catch (error) {
    console.error("Error placing order on Hedera:", error);
    throw error;
  }
};
export const placeSellOrderOnHedera = async (
  tokenId: string,
  accountId: string,
  amount: number,
  signer: DAppSigner
) => {
  try {
    const { client, treasuryId, treasuryKey } = await initializeHederaClient();
    // Create the transfer transaction
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
        `Transaction failed with status: ${tokenTransferRx.status}`
      );
    }
    return {
      status: tokenTransferRx.status.toString(),
      receipt: tokenTransferRx,
    };
  } catch (error) {
    console.error("Error placing sell order on Hedera:", error);
    throw error;
  }
};
export const finalizeBuyOrder = async (
  tokenId: string,
  accountId: string,
  amount: number
) => {
  try {
    const { client, treasuryId, treasuryKey } = await initializeHederaClient();
    // Create the transfer transaction
    const tokenTransferTx = await new TransferTransaction()

      .addTokenTransfer(tokenId, treasuryId, -amount) // Deduct from treasury
      .addTokenTransfer(tokenId, accountId, amount) // Add to buyer
      .freezeWith(client)
      .sign(treasuryKey);
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
  } catch (error) {
    console.error("Error finalizing buy order on Hedera:", error);
    throw error;
  }
};
export const finalizeSellOrder = async (accountId: string, value: number) => {
  try {
    const { client, treasuryId, treasuryKey } = await initializeHederaClient();
    // Create the transfer transaction
    const amount = new Hbar(value);
    const tokenTransferTx = await new TransferTransaction()
      .addHbarTransfer(treasuryId, -amount) // Deduct from buyer
      .addHbarTransfer(accountId, amount) // Add to treasury
      .freezeWith(client)
      .sign(treasuryKey);
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
  } catch (error) {
    console.error("Error finalizing sell order on Hedera:", error);
    throw error;
  }
};
