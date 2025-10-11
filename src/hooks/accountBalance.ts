import { AccountBalanceQuery, Client } from "@hashgraph/sdk";

const accountBalance = async (accountId: string): Promise<string | null> => {
  try {
    // Initialize the Hedera client for testnet
    const client: Client = Client.forTestnet();

    // Execute the AccountBalanceQuery with the account ID
    const accountBalance = await new AccountBalanceQuery()
      .setAccountId(accountId)
      .execute(client);

    // Extract the HBAR balance
    const hbarBalance: string = accountBalance.hbars.toString();

    const formattedBalance: string = parseFloat(hbarBalance).toLocaleString(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );

    return formattedBalance + " HBAR";
  } catch (error: unknown) {
    console.error("Error fetching account balance:", error);
    return null;
  }
};

export default accountBalance;
// get account balance from mirror node client

export const getBalanceFromMirrorNode = async (
  accountId: string
): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
    );
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    console.log("Balance data from mirror node: ", data);
    // get balance of usdc token also

    if (data && data.balance) {
      const hbarBalance = parseFloat(data.balance.balance);
      return hbarBalance.toFixed(2) + " HBAR";
    } else {
      console.error("Invalid balance data received from mirror node");
      return null;
    }
  } catch (error) {
    console.error("Error fetching balance from mirror node:", error);
    return null;
  }
};
