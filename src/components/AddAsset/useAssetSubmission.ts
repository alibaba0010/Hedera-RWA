import { useState } from "react";
import { useNotification } from "@/contexts/notification-context";
import {
  createHederaToken,
  sendHcsMessage,
  publishToRegistry,
} from "@/utils/hedera-integration";
import { saveMetadataCIDToDatabase } from "@/utils/supabase";
import { hashFile, uploadFileToIPFS, uploadJSONToIPFS } from "@/utils";
import { DAppSigner } from "@hashgraph/hedera-wallet-connect";

export const SUBMISSION_STEPS = [
  "Uploading Files to IPFS",
  "Creating Asset Metadata",
  "Creating Hedera Token",
  "Publishing to Registry",
  "Anchoring Document Hashes",
];

export function useAssetSubmission() {
  const [loading, setLoading] = useState(false);
  const [currentSubmissionStep, setCurrentSubmissionStep] =
    useState<number>(-1);
  const [completedSubmissionSteps, setCompletedSubmissionSteps] = useState<
    number[]
  >([]);
  const [showStepComplete, setShowStepComplete] = useState<boolean>(false);
  const { showNotification } = useNotification();

  const submitAsset = async (params: {
    form: any;
    fileDataOptions: any;
    tokenomics: any;
    accountId: string;
    signer: DAppSigner;
    calculatedInitialSupply: number;
    supplyValue: number;
    onSuccess: () => void;
  }) => {
    const {
      form,
      accountId,
      signer,
      calculatedInitialSupply,
      supplyValue,
      tokenomics,
      onSuccess,
    } = params;

    setLoading(true);
    setCurrentSubmissionStep(0);
    setCompletedSubmissionSteps([]);
    setShowStepComplete(false);

    try {
      // Step 1: Upload files to IPFS and hash them
      const fileUploads = [];

      if (form.primaryImage) {
        fileUploads.push(
          uploadFileToIPFS(form.primaryImage).then(async (cid) => ({
            type: "primaryImage",
            cid,
            hash: await hashFile(form.primaryImage as File),
          })),
        );
      }

      if (form.additionalImages?.length > 0) {
        form.additionalImages.forEach((file: File) => {
          fileUploads.push(
            uploadFileToIPFS(file).then(async (cid) => ({
              type: "additionalImage",
              cid,
              hash: await hashFile(file),
            })),
          );
        });
      }

      if (form.legalDocs) {
        fileUploads.push(
          uploadFileToIPFS(form.legalDocs).then(async (cid) => ({
            type: "legalDocs",
            cid,
            hash: await hashFile(form.legalDocs as File),
          })),
        );
      }

      if (form.valuationReport) {
        fileUploads.push(
          uploadFileToIPFS(form.valuationReport).then(async (cid) => ({
            type: "valuationReport",
            cid,
            hash: await hashFile(form.valuationReport as File),
          })),
        );
      }

      let uploadResults;
      try {
        uploadResults = await Promise.all(fileUploads);
      } catch (ipfsUploadError: unknown) {
        throw new Error(
          "Failed to upload files to IPFS. Please check your connection and try again.",
        );
      }

      type FileData = {
        primaryImage?: { cid: string; hash: string };
        additionalImages?: { cid: string; hash: string }[];
        legalDocs?: { cid: string; hash: string };
        valuationReport?: { cid: string; hash: string };
      };

      const fileData = uploadResults.reduce((acc, result) => {
        if (result.type === "primaryImage") {
          acc.primaryImage = { cid: result.cid, hash: result.hash };
        } else if (result.type === "additionalImage") {
          if (!acc.additionalImages) acc.additionalImages = [];
          acc.additionalImages.push({ cid: result.cid, hash: result.hash });
        } else if (result.type === "legalDocs") {
          acc.legalDocs = { cid: result.cid, hash: result.hash };
        } else if (result.type === "valuationReport") {
          acc.valuationReport = { cid: result.cid, hash: result.hash };
        }
        return acc;
      }, {} as FileData);

      setCompletedSubmissionSteps((prev) => [...prev, 0]);
      setShowStepComplete(true);
      await new Promise((r) => setTimeout(r, 800));

      // Step 2: Create metadata
      setCurrentSubmissionStep(1);
      setShowStepComplete(false);

      const metadata = {
        name: form.assetName,
        description: form.assetDescription,
        category: form.category,
        location: form.geolocation,
        files: fileData,
        tokenomics,
        tokenConfig: {
          name: form.tokenName,
          symbol: form.tokenSymbol,
          decimals: Number(form.decimals),
          supplyType: form.supplyType,
          kycKey: form.kycKey || undefined,
          freezeKey: form.freezeKey || undefined,
        },
        additionalInfo: {
          insuranceDetails: form.insuranceDetails,
          specialRights: form.specialRights,
        },
        createdAt: new Date().toISOString(),
        owner: accountId,
      };

      let metadataCID;
      try {
        metadataCID = await uploadJSONToIPFS(metadata);
      } catch (metadataError: unknown) {
        // Rollback mechanism: We cannot easily delete IPFS files, but we can stop the token creation.
        throw new Error(
          "Failed to upload metadata to IPFS. The uploaded images are orphaned but no token was created yet.",
        );
      }

      setCompletedSubmissionSteps((prev) => [...prev, 1]);
      setShowStepComplete(true);
      await new Promise((r) => setTimeout(r, 800));

      // Step 3: Create Hedera Token
      setCurrentSubmissionStep(2);
      setShowStepComplete(false);

      let tokenId;
      try {
        tokenId = await createHederaToken({
          name: form.tokenName,
          symbol: form.tokenSymbol,
          decimals: Number(form.decimals),
          initialSupply: calculatedInitialSupply,
          accountId,
          signer,
          supplyType: form.supplyType === "infinite" ? "INFINITE" : "FINITE",
          maxSupply: form.supplyType === "finite" ? supplyValue : null,
          requireKyc: !!form.kycKey,
        });
      } catch (tokenError: unknown) {
        throw new Error(
          "Failed to mint token on Hedera. Previous IPFS uploads are orphaned. Please try again.",
        );
      }

      setCompletedSubmissionSteps((prev) => [...prev, 2]);
      setShowStepComplete(true);
      await new Promise((r) => setTimeout(r, 800));

      // Step 4: Publish to Registry
      setCurrentSubmissionStep(3);
      setShowStepComplete(false);

      try {
        const dbData = {
          metadataCID,
          tokenId,
          owner: accountId,
          created_at: new Date().toISOString(),
        };
        await saveMetadataCIDToDatabase(dbData);
        await publishToRegistry(tokenId, metadataCID);
      } catch (dbError: unknown) {
        console.error(
          "Database or Registry publishing failed. The Hedera Token exists but may not be visible in the marketplace.",
          dbError,
        );
        // We do not throw here to allow the process to finish, but we notify
        showNotification({
          title: "Warning: Partial Registration",
          message:
            "Token was minted, but marketplace registration encountered an issue. Please contact support.",
          variant: "error", // Using error variant or warning if available
        });
      }

      setCompletedSubmissionSteps((prev) => [...prev, 3]);
      setShowStepComplete(true);
      await new Promise((r) => setTimeout(r, 800));

      // Step 5: Anchor Document Hashes (HCS)
      setCurrentSubmissionStep(4);
      setShowStepComplete(false);

      try {
        await sendHcsMessage({
          type: "ASSET_CREATED",
          tokenId,
          metadataCID,
          fileHashes: fileData,
          timestamp: new Date().toISOString(),
        });
      } catch (hcsError: unknown) {
        console.error(
          "Failed to anchor to HCS. Not throwing error as token is minted.",
          hcsError,
        );
        showNotification({
          title: "Warning: Anchoring issue",
          message:
            "Token created successfully but Hedera Consensus Service anchoring failed.",
          variant: "error", // Use error visual for now
        });
      }

      setCompletedSubmissionSteps((prev) => [...prev, 4]);
      setShowStepComplete(true);
      await new Promise((r) => setTimeout(r, 1000));

      showNotification({
        title: "Asset Creation",
        message: "Asset created successfully!",
        variant: "success",
      });

      onSuccess();
    } catch (error: unknown) {
      console.error("Submission error:", error);
      const errMsg =
        error instanceof Error
          ? error.message
          : "Failed to create asset. Please try again.";
      showNotification({
        title: "Submission Error",
        message: errMsg,
        variant: "error",
      });
    } finally {
      setLoading(false);
      setCurrentSubmissionStep(-1);
      setShowStepComplete(false);
    }
  };

  return {
    submitAsset,
    loading,
    currentSubmissionStep,
    completedSubmissionSteps,
    showStepComplete,
  };
}
