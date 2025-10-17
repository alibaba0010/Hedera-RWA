import { TopicId } from "@hashgraph/sdk";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const tokens = [
  { symbol: "SAUCE", token_id: "0.0.731861" }, // 0.0.731861 // checked
  { symbol: "WHBAR", token_id: "0.0.1456986" }, // checked // testnet 0.0.5816542
  { symbol: "USDC", token_id: "0.0.429274" }, // 0.0.429274 // checked
  { symbol: "USDT", token_id: "0.0.1055472" }, //not confirmed on coingecko // let's see how it goes
  { symbol: "PANGOLIN", token_id: "0.0.1738930" },
];
export const USDC_TOKEN_ID = "0.0.429274"; 

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
 export const topicId = TopicId.fromString(getEnv("VITE_PUBLIC_HEDERA_ASSET_TOPIC_ID"));

 // Helper: Hash a file (SHA-256)
export async function hashFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}