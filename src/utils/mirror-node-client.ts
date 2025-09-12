export const getUserProfile = async (accountId: string) => {
  try {
    const response = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch account data");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};
export const getUserTokenHbarUsdcBalance = async (accountId: string) => {
  try {
    const response = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/balances`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch account balances");
    }
    const data = await response.json();
    const hbarBalance = data.balances.find(
      (balance: any) => balance.token_id === "0.0.0"
    )?.balance;
    const usdcBalance = data.balances.find(
      (balance: any) => balance.token_id === "0.0.364"
    )?.balance;
    return {
      hbar: hbarBalance ? parseFloat(hbarBalance) / 100000000 : 0,
      usdc: usdcBalance ? parseFloat(usdcBalance) / 1000000 : 0,
    };
  } catch (error) {
    console.error("Error fetching token balances:", error);
    return { hbar: 0, usdc: 0 };
  }
};
