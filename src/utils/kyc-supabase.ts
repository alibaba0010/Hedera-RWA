// ─── KYC Supabase Persistence Layer ───────────────────────────────────────────
// Persists KYC submissions and results in a dedicated `kyc_submissions` table.
// The table schema is designed to be created via Supabase SQL editor.
//
// Required table SQL (run once in Supabase):
//
//   CREATE TABLE IF NOT EXISTS kyc_submissions (
//     id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//     account_id    text NOT NULL,
//     country_code  text NOT NULL,
//     country_name  text NOT NULL,
//     id_type_id    text NOT NULL,
//     id_type_label text NOT NULL,
//     status        text NOT NULL DEFAULT 'pending',   -- pending | approved | manual_review | rejected
//     confidence    integer,
//     full_name     text,
//     date_of_birth text,
//     document_number text,
//     expiry_date   text,
//     nationality   text,
//     gender        text,
//     issues        text[],
//     raw_analysis  text,
//     recommendation text,
//     created_at    timestamptz NOT NULL DEFAULT now(),
//     updated_at    timestamptz NOT NULL DEFAULT now()
//   );
//
//   -- Index for fast account lookups
//   CREATE INDEX IF NOT EXISTS idx_kyc_account_id ON kyc_submissions(account_id);
//
//   -- Enable RLS (Row Level Security) for production — skip for demo
//   -- ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;

import { supabase } from "./supabase";
import type { KYCVerificationResult } from "./kyc-ai-service";

export type KYCStatus = "pending" | "approved" | "manual_review" | "rejected";

export interface KYCSubmission {
  id?: string;
  account_id: string;
  country_code: string;
  country_name: string;
  id_type_id: string;
  id_type_label: string;
  status: KYCStatus;
  confidence?: number;
  full_name?: string;
  date_of_birth?: string;
  document_number?: string;
  expiry_date?: string;
  nationality?: string;
  gender?: string;
  issues?: string[];
  raw_analysis?: string;
  recommendation?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Save a new KYC verification result to Supabase.
 */
export async function saveKYCSubmission(
  accountId: string,
  countryCode: string,
  countryName: string,
  idTypeId: string,
  idTypeLabel: string,
  result: KYCVerificationResult,
): Promise<KYCSubmission> {
  const statusMap: Record<KYCVerificationResult["recommendation"], KYCStatus> =
    {
      APPROVE: "approved",
      MANUAL_REVIEW: "manual_review",
      REJECT: "rejected",
    };

  const payload: Omit<KYCSubmission, "id" | "created_at" | "updated_at"> = {
    account_id: accountId,
    country_code: countryCode,
    country_name: countryName,
    id_type_id: idTypeId,
    id_type_label: idTypeLabel,
    status: statusMap[result.recommendation],
    confidence: result.confidence,
    full_name: result.extractedData.fullName,
    date_of_birth: result.extractedData.dateOfBirth,
    document_number: result.extractedData.documentNumber,
    expiry_date: result.extractedData.expiryDate,
    nationality: result.extractedData.nationality,
    gender: result.extractedData.gender,
    issues: result.issues,
    raw_analysis: result.rawAnalysis,
    recommendation: result.recommendation,
  };

  const { data, error } = await supabase
    .from("kyc_submissions")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Failed to save KYC submission:", error);
    // Return the payload with a fallback id so callers don't explode
    return { ...payload, id: "offline-" + Date.now() };
  }

  return data as KYCSubmission;
}

/**
 * Fetch the latest KYC submission for a given Hedera account ID.
 * Returns null if no submission exists.
 */
export async function getLatestKYCSubmission(
  accountId: string,
): Promise<KYCSubmission | null> {
  const { data, error } = await supabase
    .from("kyc_submissions")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch KYC submission:", error);
    return null;
  }

  return data as KYCSubmission | null;
}

/**
 * Fetch all KYC submissions for a given account (useful for history view).
 */
export async function getAllKYCSubmissions(
  accountId: string,
): Promise<KYCSubmission[]> {
  const { data, error } = await supabase
    .from("kyc_submissions")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch KYC submissions:", error);
    return [];
  }

  return (data ?? []) as KYCSubmission[];
}
