import { createClient } from "@supabase/supabase-js";
import { getEnv } from ".";

const supabaseUrl = getEnv("VITE_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("VITE_PUBLIC_SUPABASE_ANON_KEY");

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Save asset metadata CID and related info to Supabase
 * @param {Object} data - { tokenId?: string, metadataCID: string, [other fields] }
 */
export async function saveMetadataCIDToDatabase(data: {
  metadataCID: string;
  tokenId: string;
  owner: string;
  created_at: string;
}) {
  // Ensure the table exists before inserting
  // await ensureAssetMetadataTable();

  // Insert the data
  const { error } = await supabase.from("asset_metadata").insert([data]);
  if (error) {
    console.error("Failed to save metadata CID to Supabase:", error);
    throw new Error("Failed to save metadata CID to database");
  }
}

export async function getMetadataCIDFromDatabase() {
  // Table: asset_metadata (must exist in Supabase)
  const { data, error } = await supabase.from("asset_metadata").select("*");
  console.log("Fetching data....", data);
  if (error) {
    console.error("Failed to fetch metadata CID from Supabase:", error);
    throw new Error("Failed to fetch metadata CID from database");
  }
}

export async function getTokenIdByMetadataCID(metadataCID: string) {
  const { data, error } = await supabase
    .from("asset_metadata")
    .select("tokenId")
    .eq("metadataCID", metadataCID)
    .single();

  if (error) {
    console.error("Failed to fetch tokenId from Supabase:", error);
    throw new Error("Failed to fetch tokenId from database");
  }

  return data?.tokenId;
}
export async function fetchDataFromDatabase() {
  const { data, error } = await supabase.from("asset_metadata").select("*");
  if (error) {
    console.error("Failed to fetch data from Supabase:", error);
    throw new Error("Failed to fetch data from database");
  }
  return data;
}
