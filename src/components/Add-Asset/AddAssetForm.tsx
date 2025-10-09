"use client";

import { ChangeEvent, type FC, FormEvent, useContext, useEffect } from "react";
import { useState, useCallback, useMemo } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Upload,
  ChevronRight,
  ChevronLeft,
  Star,
  Shield,
  Settings,
  MapPin,
  Coins,
  FileText,
  ImageIcon,
  HomeIcon,
} from "lucide-react";
import {
  imageExtensions,
  docExtensions,
  PAYOUT_OPTIONS,
  FORM_STEPS,
  initialForm,
  type AssetForm,
} from "@/utils/form";
import FileUploader from "./FileUploader";
import { SectionHeader, StepIndicator } from "./FromContent";
import LocationSelector from "./LocationSelector";
import AssetValueSupply from "./AssetValueSupply";
import {
  uploadFileToIPFS,
  uploadJSONToIPFS,
  createHederaToken,
  sendHcsMessage,
  publishToRegistry,
  hashFile,
} from "@/utils/hedera-integration";
import { WalletContext } from "@/contexts/WalletContext";
import { getEnv } from "@/utils";
import { saveMetadataCIDToDatabase } from "@/utils/supabase";

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const SUBMISSION_STEPS = [
  "Uploading Files to IPFS",
  "Creating Asset Metadata",
  "Creating Hedera Token",
  "Publishing to Registry",
  "Anchoring Document Hashes",
];

const AddAssetForm: FC = () => {
  const { accountId, signer } = useContext(WalletContext);

  const [form, setForm] = useState<AssetForm>(initialForm);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, setCompletedSubmissionSteps] = useState<number[]>([]);
  const [currentSubmissionStep, setCurrentSubmissionStep] =
    useState<number>(-1);
  const [showStepComplete, setShowStepComplete] = useState<boolean>(false);

  // Asset value supply state
  const [assetValueBase, setAssetValueBase] = useState("");
  const [assetValueMultiplier, setAssetValueMultiplier] = useState(0);
  const [supplyBase, setSupplyBase] = useState("");
  const [supplyMultiplier, setSupplyMultiplier] = useState(0);
  const [projectedIncome, setProjectedIncome] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [pricePerTokenUSD, setPricePerTokenUSD] = useState("");
  const [dividendYield, setDividendYield] = useState("");
  const [payoutFrequency, setPayoutFrequency] = useState(
    PAYOUT_OPTIONS[0].value
  );
  const [nextPayout, setNextPayout] = useState("");
  const [initialSupplyPercentage, setInitialSupplyPercentage] = useState("0");
  const [customInitialSupplyPercentage, setCustomInitialSupplyPercentage] =
    useState("");
  const [calculatedInitialSupply, setCalculatedInitialSupply] = useState(0);

  const debouncedDescription = useDebounce(form.assetDescription, 500);

  const validateStep1 = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!form.assetName) newErrors.assetName = "Asset name is required";
    if (!form.category) newErrors.category = "Category is required";
    if (!form.assetDescription)
      newErrors.assetDescription = "Description is required";
    if (!form.geolocation.country) newErrors.country = "Country is required";
    if (!form.geolocation.state) newErrors.state = "State is required";
    if (!form.geolocation.city) newErrors.city = "City is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form.assetName, form.category, form.assetDescription, form.geolocation]);

  const validateStep2 = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!form.primaryImage)
      newErrors.primaryImage = "Primary image is required";
    if (form.additionalImages.length > 5)
      newErrors.additionalImages = "Maximum 5 additional images allowed";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form.primaryImage, form.additionalImages]);

  const validateStep3 = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!assetValueBase) newErrors.assetValueBase = "Asset value is required";
    if (!supplyBase) newErrors.supplyBase = "Token supply is required";
    if (!projectedIncome)
      newErrors.projectedIncome = "Projected income is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [assetValueBase, supplyBase, projectedIncome]);

  const validateStep4 = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!form.tokenName) newErrors.tokenName = "Token name is required";
    if (!form.tokenSymbol) newErrors.tokenSymbol = "Token symbol is required";
    if (!form.decimals) newErrors.decimals = "Decimals is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form.tokenName, form.tokenSymbol, form.decimals]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;

      // Batch state updates to prevent multiple re-renders
      setForm((prev) => ({ ...prev, [name]: value }));

      // Clear error when a value is entered
      if (value.trim()) {
        setErrors((prev) => {
          if (prev[name]) {
            const { [name]: removed, ...rest } = prev;
            return rest;
          }
          return prev;
        });
      }
    },
    []
  );

  const handleSelectChange = useCallback(
    (name: keyof AssetForm, value: string) => {
      setForm((prev) => ({ ...prev, [name]: value }));

      // Clear error when a value is selected
      if (value) {
        setErrors((prev) => {
          if (prev[name]) {
            const { [name]: removed, ...rest } = prev;
            return rest;
          }
          return prev;
        });
      }
    },
    []
  );

  const handleDescriptionChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, assetDescription: value }));
    },
    []
  );

  useEffect(() => {
    if (debouncedDescription.length > 900) {
      setErrors((prev) => ({
        ...prev,
        assetDescription: "Description must be less than 900 characters",
      }));
    } else {
      setErrors((prev) => {
        const { assetDescription, ...rest } = prev;
        return rest;
      });
    }
  }, [debouncedDescription]);

  const handlePrimaryImageChange = useCallback((files: File[]) => {
    setForm((prev) => ({ ...prev, primaryImage: files[0] || null }));
    if (files.length > 0) {
      setErrors((prev) => {
        const { primaryImage, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  const handleAdditionalImagesChange = useCallback((files: File[]) => {
    if (files.length > 5) {
      setErrors((prev) => ({
        ...prev,
        additionalImages: "Maximum 5 additional images allowed",
      }));
      return;
    }
    setErrors((prev) => {
      const { additionalImages, ...rest } = prev;
      return rest;
    });
    setForm((prev) => ({ ...prev, additionalImages: files }));
  }, []);

  const handleLegalDocsChange = useCallback((files: File[]) => {
    setForm((prev) => ({ ...prev, legalDocs: files[0] || null }));
  }, []);

  const handleValuationReportChange = useCallback((files: File[]) => {
    setForm((prev) => ({ ...prev, valuationReport: files[0] || null }));
  }, []);

  const handleLocationChange = useCallback(
    (location: { country: string; state: string; city: string }) => {
      setForm((prev) => ({ ...prev, geolocation: location }));

      // Clear location-related errors when fields are filled
      setErrors((prev) => {
        const newErrors = { ...prev };
        if (location.country && newErrors.country) delete newErrors.country;
        if (location.state && newErrors.state) delete newErrors.state;
        if (location.city && newErrors.city) delete newErrors.city;
        return newErrors;
      });
    },
    []
  );

  // Handler for asset value and supply fields
  const handleAssetValueChange = useCallback((value: string) => {
    setAssetValueBase(value);
    if (value) {
      setErrors((prev) => {
        const { assetValueBase, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  const handleSupplyBaseChange = useCallback((value: string) => {
    setSupplyBase(value);
    if (value) {
      setErrors((prev) => {
        const { supplyBase, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  const handleProjectedIncomeChange = useCallback((value: string) => {
    setProjectedIncome(value);
    if (value) {
      setErrors((prev) => {
        const { projectedIncome, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  // Validate current step
  const validateStep = useCallback(
    (currentStep: number) => {
      switch (currentStep) {
        case 0:
          return validateStep1();
        case 1:
          return validateStep2();
        case 2:
          return validateStep3();
        case 3:
          return validateStep4();
        default:
          return true;
      }
    },
    [validateStep1, validateStep2, validateStep3, validateStep4]
  );

  const nextStep = useCallback(() => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, FORM_STEPS.length - 1));
    }
  }, [step, validateStep]);

  const prevStep = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  // Helper function to handle step progression
  const progressToNextStep = (stepIndex: number) => {
    setCurrentSubmissionStep(stepIndex);
    setShowStepComplete(false);

    // Simulate step completion after some time
    setTimeout(() => {
      setShowStepComplete(true);
      setCompletedSubmissionSteps((prev) => [...prev, stepIndex]);

      // Hide completed step after 1 second and move to next
      setTimeout(() => {
        if (stepIndex < SUBMISSION_STEPS.length - 1) {
          progressToNextStep(stepIndex + 1);
        } else {
          // All steps completed
          setCurrentSubmissionStep(-1);
          setShowStepComplete(false);
        }
      }, 1000);
    }, 2000); // Adjust timing as needed for your actual submission process
  };

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!validateStep(step)) return;

      setLoading(true);
      setCurrentSubmissionStep(0);
      setCompletedSubmissionSteps([]);
      progressToNextStep(0);

      try {
        // Step 1: Upload files to IPFS and hash them
        const fileUploads = [];

        // Upload primary image
        if (form.primaryImage) {
          fileUploads.push(
            uploadFileToIPFS(form.primaryImage).then((cid) => ({
              type: "primaryImage",
              cid,
              hash: hashFile(form.primaryImage!),
            }))
          );
        }
        // Upload additional images
        if (form.additionalImages.length > 0) {
          form.additionalImages.forEach((file) => {
            fileUploads.push(
              uploadFileToIPFS(file).then((cid) => ({
                type: "additionalImage",
                cid,
                hash: hashFile(file),
              }))
            );
          });
        }

        // Upload legal documents
        if (form.legalDocs) {
          fileUploads.push(
            uploadFileToIPFS(form.legalDocs).then((cid) => ({
              type: "legalDocs",
              cid,
              hash: hashFile(form.legalDocs!),
            }))
          );
        }

        // Upload valuation report
        if (form.valuationReport) {
          fileUploads.push(
            uploadFileToIPFS(form.valuationReport).then((cid) => ({
              type: "valuationReport",
              cid,
              hash: hashFile(form.valuationReport!),
            }))
          );
        }

        // Wait for all file uploads and hashing to complete
        const uploadResults = await Promise.all(fileUploads);

        // Organize upload results
        type FileData = {
          primaryImage?: { cid: string; hash: Promise<string> | string };
          additionalImages?: { cid: string; hash: Promise<string> | string }[];
          legalDocs?: { cid: string; hash: Promise<string> | string };
          valuationReport?: { cid: string; hash: Promise<string> | string };
        };

        const fileData = uploadResults.reduce<FileData>((acc, result) => {
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
        }, {});
        setCompletedSubmissionSteps((prev) => [...prev, 0]); // Mark file upload step complete
        setCurrentSubmissionStep(1);
        setShowStepComplete(true);

        // Step 2: Create metadata object
        const assetValue = Number(assetValueBase.replace(/,/g, ""));
        const supplyValue = Number(supplyBase.replace(/,/g, ""));

        setCompletedSubmissionSteps((prev) => [...prev, 1]); // Mark metadata creation step complete
        setCurrentSubmissionStep(2);
        setShowStepComplete(true);
        // Step 4: Create Hedera token
        if (!accountId || !signer) return;

        const tokenId = await createHederaToken({
          name: form.tokenName,
          symbol: form.tokenSymbol,
          decimals: Number(form.decimals),
          initialSupply: calculatedInitialSupply,
          accountId,
          signer,
          supplyType: form.supplyType === "infinite" ? "INFINITE" : "FINITE",
          maxSupply: form.supplyType === "finite" ? supplyValue : null,
        });

        setCompletedSubmissionSteps((prev) => [...prev, 2]); // Mark token creation step complete
        setCurrentSubmissionStep(3);
        setShowStepComplete(true);

        // Step 6: Publish to Registry
        setCompletedSubmissionSteps((prev) => [...prev, 3]); // Mark registry publishing step complete
        setCurrentSubmissionStep(4);
        setShowStepComplete(true);

        // Step 7: Send message to HCS topic with file hashes
        const metadata = {
          name: form.assetName,
          description: form.assetDescription,
          category: form.category,
          location: form.geolocation,
          files: fileData,
          tokenomics: {
            assetValue: assetValue,
            tokenSupply: supplyValue,
            projectedIncome: Number(projectedIncome),
            annualIncome: Number(annualIncome),
            pricePerTokenUSD: Number(pricePerTokenUSD),
            dividendYield: Number(dividendYield),
            payoutFrequency,
            nextPayout,
          },
          tokenConfig: {
            name: form.tokenName,
            symbol: form.tokenSymbol,
            decimals: Number(form.decimals),
            supplyType: form.supplyType,
            kycKey: form.kycKey || undefined,
            freezeKey: form.freezeKey || undefined,
            id: tokenId,
          },
          additionalInfo: {
            insuranceDetails: form.insuranceDetails,
            specialRights: form.specialRights,
          },
          createdAt: new Date().toISOString(),
          owner: accountId,
        };
        // Step 3: Upload metadata to IPFS
        const metadataCID = await uploadJSONToIPFS(metadata);
        console.log("Meta CID: ", metadataCID);
        const data = {
          metadataCID,
          tokenId,
          owner: accountId,
          created_at: new Date().toISOString(),
        };
        await saveMetadataCIDToDatabase(data);
        await publishToRegistry(tokenId, metadataCID);

        const hcsTopicId = getEnv("VITE_PUBLIC_HEDERA_ASSET_TOPIC_ID");
        await sendHcsMessage(hcsTopicId, {
          type: "ASSET_CREATED",
          tokenId,
          metadataCID,
          fileHashes: fileData,
          timestamp: new Date().toISOString(),
        });

        setCompletedSubmissionSteps((prev) => [...prev, 4]); // Mark document hash anchoring step complete
        setCurrentSubmissionStep(-1);
        setShowStepComplete(false);

        alert("Asset created successfully!");

        // Reset form
        setForm(initialForm);
        setStep(0);
      } catch (error: any) {
        console.error("Submission error:", error.message);
        alert(
          "Failed to create asset: " + (error.message || "Please try again.")
        );
      } finally {
        setLoading(false);
      }
    },
    [
      step,
      validateStep,
      form,
      assetValueBase,
      assetValueMultiplier,
      supplyBase,
      supplyMultiplier,
      projectedIncome,
      annualIncome,
      pricePerTokenUSD,
      dividendYield,
      payoutFrequency,
      nextPayout,
    ]
  );

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <SectionHeader
          title="Add New Asset"
          description="Tokenize a real estate asset and publish it to the marketplace."
          icon={HomeIcon}
        />
        <StepIndicator steps={FORM_STEPS} currentStep={step + 1} />
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Asset Details */}
          {step === 0 && (
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={FileText}
                  title="Basic Information & Location"
                  description="Provide essential details about your asset and its location"
                />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="assetName" className="text-sm font-medium">
                      Asset Name *
                    </Label>
                    <Input
                      id="assetName"
                      name="assetName"
                      value={form.assetName}
                      onChange={handleChange}
                      placeholder="e.g., Downtown Office Building"
                      className="h-11"
                      required
                    />
                    {errors.assetName && (
                      <div className="text-red-500 text-xs">
                        {errors.assetName}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-medium">
                      Category *
                    </Label>
                    <Select
                      value={form.category}
                      onValueChange={(value) =>
                        handleSelectChange("category", value)
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="real-estate">Real Estate</SelectItem>
                        <SelectItem value="art">Art & Collectibles</SelectItem>
                        <SelectItem value="commodities">Commodities</SelectItem>
                        <SelectItem value="other">Other Assets</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.category && (
                      <div className="text-red-500 text-xs">
                        {errors.category}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="assetDescription"
                    className="text-sm font-medium"
                  >
                    Asset Description *
                  </Label>
                  <Textarea
                    id="assetDescription"
                    name="assetDescription"
                    value={form.assetDescription}
                    onChange={handleDescriptionChange}
                    placeholder="Provide a detailed description of the asset, its features, and investment potential..."
                    className="min-h-[120px] resize-none"
                    maxLength={900}
                    required
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{form.assetDescription.length}/900</span>
                    {errors.assetDescription && (
                      <span className="text-red-500">
                        {errors.assetDescription}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <Label className="text-sm font-medium">
                      Asset Location *
                    </Label>
                  </div>
                  <LocationSelector
                    value={form.geolocation}
                    onChange={handleLocationChange}
                  />
                  {(errors.country || errors.state || errors.city) && (
                    <div className="text-red-500 text-xs">
                      {errors.country || errors.state || errors.city}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Images & Documents */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={ImageIcon}
                  title="Media & Documents"
                  description="Upload images and legal documentation"
                />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FileUploader
                      accept="image/png,image/jpeg,image/jpg"
                      allowedExtensions={imageExtensions}
                      multiple={false}
                      onFilesChange={handlePrimaryImageChange}
                      inputId="primary-image-uploader"
                      label="Primary Image"
                      required
                    />
                    {errors.primaryImage && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors.primaryImage}
                      </div>
                    )}
                  </div>
                  <div>
                    <FileUploader
                      accept="image/png,image/jpeg,image/jpg"
                      allowedExtensions={imageExtensions}
                      multiple={true}
                      onFilesChange={handleAdditionalImagesChange}
                      inputId="additional-images-uploader"
                      label="Additional Images (Max 5)"
                    />
                    {errors.additionalImages && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors.additionalImages}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FileUploader
                      accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      allowedExtensions={docExtensions}
                      multiple={false}
                      onFilesChange={handleLegalDocsChange}
                      inputId="legal-docs-uploader"
                      label="Legal Documents"
                    />
                  </div>
                  <div>
                    <FileUploader
                      accept="application/pdf"
                      allowedExtensions={[".pdf"]}
                      multiple={false}
                      onFilesChange={handleValuationReportChange}
                      inputId="valuation-report-uploader"
                      label="Valuation Report"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Tokenomics */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={Coins}
                  title="Token Economics"
                  description="Configure pricing, supply, and dividend information"
                />
              </CardHeader>
              <CardContent className="space-y-6">
                <AssetValueSupply
                  assetValueBase={assetValueBase}
                  setAssetValueBase={handleAssetValueChange}
                  assetValueMultiplier={assetValueMultiplier}
                  setAssetValueMultiplier={setAssetValueMultiplier}
                  supplyBase={supplyBase}
                  setSupplyBase={handleSupplyBaseChange}
                  supplyMultiplier={supplyMultiplier}
                  setSupplyMultiplier={setSupplyMultiplier}
                  projectedIncome={projectedIncome}
                  setProjectedIncome={handleProjectedIncomeChange}
                  annualIncome={annualIncome}
                  setAnnualIncome={setAnnualIncome}
                  pricePerTokenUSD={pricePerTokenUSD}
                  setPricePerTokenUSD={setPricePerTokenUSD}
                  dividendYield={dividendYield}
                  setDividendYield={setDividendYield}
                  payoutFrequency={payoutFrequency}
                  setPayoutFrequency={setPayoutFrequency}
                  nextPayout={nextPayout}
                  setNextPayout={setNextPayout}
                  initialSupplyPercentage={initialSupplyPercentage}
                  setInitialSupplyPercentage={setInitialSupplyPercentage}
                  customInitialSupplyPercentage={customInitialSupplyPercentage}
                  setCustomInitialSupplyPercentage={
                    setCustomInitialSupplyPercentage
                  }
                  onCalculateInitialSupply={setCalculatedInitialSupply}
                />
                {(errors.assetValueBase ||
                  errors.supplyBase ||
                  errors.projectedIncome) && (
                  <div className="text-red-500 text-xs">
                    {errors.assetValueBase ||
                      errors.supplyBase ||
                      errors.projectedIncome}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Token Config & Rights */}
          {step === 3 && (
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <SectionHeader
                    icon={Settings}
                    title="Token Configuration"
                    description="Set up token parameters and blockchain settings"
                  />
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="tokenName"
                        className="text-sm font-medium"
                      >
                        Token Name *
                      </Label>
                      <Input
                        id="tokenName"
                        name="tokenName"
                        value={form.tokenName}
                        onChange={handleChange}
                        placeholder="Downtown Office Token"
                        className="h-11"
                        required
                      />
                      {errors.tokenName && (
                        <div className="text-red-500 text-xs">
                          {errors.tokenName}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="tokenSymbol"
                        className="text-sm font-medium"
                      >
                        Token Symbol *
                      </Label>
                      <Input
                        id="tokenSymbol"
                        name="tokenSymbol"
                        value={form.tokenSymbol}
                        onChange={handleChange}
                        placeholder="DOT"
                        className="h-11"
                        required
                      />
                      {errors.tokenSymbol && (
                        <div className="text-red-500 text-xs">
                          {errors.tokenSymbol}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="decimals" className="text-sm font-medium">
                        Decimals *
                      </Label>
                      <Input
                        id="decimals"
                        name="decimals"
                        value={form.decimals}
                        onChange={handleChange}
                        placeholder="2"
                        className="h-11"
                        required
                      />
                      {errors.decimals && (
                        <div className="text-red-500 text-xs">
                          {errors.decimals}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="supplyType"
                        className="text-sm font-medium"
                      >
                        Supply Type *
                      </Label>
                      <Select
                        value={form.supplyType}
                        onValueChange={(value) =>
                          handleSelectChange("supplyType", value)
                        }
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="finite">Finite</SelectItem>
                          <SelectItem value="infinite">Infinite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="kycKey" className="text-sm font-medium">
                        KYC Key
                      </Label>
                      <Input
                        id="kycKey"
                        name="kycKey"
                        value={form.kycKey}
                        onChange={handleChange}
                        placeholder="Optional KYC key"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="freezeKey"
                        className="text-sm font-medium"
                      >
                        Freeze Key
                      </Label>
                      <Input
                        id="freezeKey"
                        name="freezeKey"
                        value={form.freezeKey}
                        onChange={handleChange}
                        placeholder="Optional Freeze key"
                        className="h-11"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <SectionHeader
                    icon={Star}
                    title="Additional Information"
                    description="Optional details to enhance your asset listing"
                  />
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="insuranceDetails"
                        className="text-sm font-medium flex items-center gap-2"
                      >
                        <Shield className="h-4 w-4" />
                        Insurance Details
                      </Label>
                      <Input
                        id="insuranceDetails"
                        name="insuranceDetails"
                        value={form.insuranceDetails}
                        onChange={handleChange}
                        placeholder="Enter insurance details"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="specialRights"
                        className="text-sm font-medium flex items-center gap-2"
                      >
                        <Star className="h-4 w-4" />
                        Special Rights
                      </Label>
                      <Input
                        id="specialRights"
                        name="specialRights"
                        value={form.specialRights}
                        onChange={handleChange}
                        placeholder="Describe any special rights"
                        className="h-11"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={step === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            {step < FORM_STEPS.length - 1 ? (
              <Button type="button" onClick={nextStep} disabled={hasErrors}>
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={loading}>
                {loading ? "Creating Asset..." : "Create Asset"}
                <Upload className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Submission Progress */}
          {loading &&
            currentSubmissionStep >= 0 &&
            currentSubmissionStep < SUBMISSION_STEPS.length && (
              <div className="mt-4 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 flex items-center justify-center">
                    {showStepComplete ? (
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                    )}
                  </div>
                  <span className="text-xs text-gray-600">
                    {SUBMISSION_STEPS[currentSubmissionStep]}
                  </span>
                </div>
              </div>
            )}
        </form>
      </CardContent>
    </Card>
  );
};

export default AddAssetForm;
