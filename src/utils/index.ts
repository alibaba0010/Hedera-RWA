import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const tokens = [
  { symbol: "SAUCE", token_id: "0.0.731861" }, // 0.0.731861 // checked
  { symbol: "WHBAR", token_id: "0.0.1456986" }, // checked // testnet 0.0.5816542
  { symbol: "USDC", token_id: "0.0.456858" }, // 0.0.429274 // checked
  { symbol: "USDT", token_id: "0.0.1055472" }, //not confirmed on coingecko // let's see how it goes
  { symbol: "PANGOLIN", token_id: "0.0.1738930" },
];

export async function getHbarUsdPrice(): Promise<number> {
  // Use CoinGecko API for real-time HBAR/USD price
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd"
  );
  const data = await res.json();
  if (!data["hedera-hashgraph"] || !data["hedera-hashgraph"].usd)
    throw new Error("Could not fetch HBAR price");
  return data["hedera-hashgraph"].usd;
}

export function usdToHbar(usd: number, rate: number): number {
  return usd / rate;
}

export function hbarToUsd(hbar: number, rate: number): number {
  return hbar * rate;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function getEnv(key: string): string {
  // Try Vite env (import.meta.env), fallback to process.env for Node
  if (
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    key in import.meta.env
  ) {
    return import.meta.env[key] as string;
  }
  if (typeof process !== "undefined" && process.env && key in process.env) {
    return process.env[key] as string;
  }
  throw new Error(`Environment variable ${key} is not defined`);
}
