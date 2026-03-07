"use client";

import { useState, useCallback, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Globe,
  CreditCard,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Search,
  FileImage,
  Loader2,
  Eye,
  Calendar,
  User,
  Hash,
  Flag,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COUNTRIES, type Country, type IdType } from "@/utils/kyc-data";
import {
  verifyIdDocument,
  type KYCVerificationResult,
} from "@/utils/kyc-ai-service";
import {
  saveKYCSubmission,
  getLatestKYCSubmission,
} from "@/utils/kyc-supabase";
import { WalletContext } from "@/contexts/WalletContext";

// ─── Step constants ───────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Select Country", icon: Globe },
  { id: 2, label: "Choose ID Type", icon: CreditCard },
  { id: 3, label: "Upload Document", icon: Upload },
  { id: 4, label: "Verification", icon: Shield },
];

// ─── Animation variants ───────────────────────────────────────────────────────

const pageVariants = {
  initial: (dir: number) => ({
    x: dir > 0 ? 80 : -80,
    opacity: 0,
  }),
  animate: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -80 : 80,
    opacity: 0,
  }),
};

const pageTransition = {
  type: "spring" as const,
  stiffness: 280,
  damping: 28,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 select-none">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  backgroundColor: isCompleted
                    ? "hsl(var(--primary))"
                    : isActive
                      ? "hsl(var(--primary))"
                      : "hsl(var(--muted))",
                }}
                transition={{ duration: 0.25 }}
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm
                  ${isCompleted || isActive ? "text-primary-foreground" : "text-muted-foreground"}`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </motion.div>
              <span
                className={`text-[10px] font-medium hidden sm:block ${
                  isActive
                    ? "text-primary"
                    : isCompleted
                      ? "text-primary/70"
                      : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <motion.div
                animate={{
                  backgroundColor:
                    currentStep > step.id
                      ? "hsl(var(--primary))"
                      : "hsl(var(--border))",
                }}
                transition={{ duration: 0.4 }}
                className="h-0.5 w-8 sm:w-16 mt-[-14px]"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const color =
    confidence >= 80
      ? "bg-emerald-500"
      : confidence >= 60
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-muted-foreground">AI Confidence</span>
        <span
          className={
            confidence >= 80
              ? "text-emerald-500"
              : confidence >= 60
                ? "text-amber-500"
                : "text-red-500"
          }
        >
          {confidence}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

function ExtractedDataRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <div className="mt-0.5 p-1.5 rounded-md bg-primary/10">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

// ─── Main KYC Wizard Component ────────────────────────────────────────────────

export function KYCContent() {
  const { accountId } = useContext(WalletContext);

  // wizard state
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // +1 = forward, -1 = backward

  // selections
  const [countryQuery, setCountryQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedIdType, setSelectedIdType] = useState<IdType | null>(null);

  // file uploads
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  // verification
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<KYCVerificationResult | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );

  // navigation helpers
  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 4));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const reset = useCallback(() => {
    setStep(1);
    setDirection(1);
    setCountryQuery("");
    setSelectedCountry(null);
    setSelectedIdType(null);
    setFrontFile(null);
    setBackFile(null);
    setFrontPreview(null);
    setBackPreview(null);
    setVerificationResult(null);
    setVerificationError(null);
  }, []);

  // Country search
  const filteredCountries = COUNTRIES.filter((c) =>
    (c.name + " " + c.code)
      .toLowerCase()
      .includes(countryQuery.toLowerCase().trim()),
  );

  // File change handler
  const handleFileChange = useCallback(
    (side: "front" | "back") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      if (side === "front") {
        setFrontFile(file);
        setFrontPreview(url);
      } else {
        setBackFile(file);
        setBackPreview(url);
      }
    },
    [],
  );

  const handleDrop = useCallback(
    (side: "front" | "back") => (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      if (side === "front") {
        setFrontFile(file);
        setFrontPreview(url);
      } else {
        setBackFile(file);
        setBackPreview(url);
      }
    },
    [],
  );

  // Verify
  const handleVerify = useCallback(async () => {
    if (!frontFile || !selectedCountry || !selectedIdType) return;

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const result = await verifyIdDocument(
        frontFile,
        selectedIdType.sides === "double" ? backFile : null,
        selectedCountry.name,
        selectedIdType.label,
      );

      setVerificationResult(result);

      // Persist to Supabase (best-effort — don't block UI on DB errors)
      if (accountId) {
        try {
          await saveKYCSubmission(
            accountId,
            selectedCountry.code,
            selectedCountry.name,
            selectedIdType.id,
            selectedIdType.label,
            result,
          );
        } catch (dbErr) {
          console.warn("KYC save skipped (DB unavailable):", dbErr);
        }
      }

      goNext();
    } catch (err: any) {
      setVerificationError(
        err.message ?? "Verification failed. Please try again.",
      );
    } finally {
      setIsVerifying(false);
    }
  }, [frontFile, backFile, selectedCountry, selectedIdType, accountId, goNext]);

  // ── Step content ─────────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      // STEP 1 — Country selection
      case 1:
        return (
          <motion.div
            key="step1"
            custom={direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Select Your Country</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Choose the country that issued your identity document
              </p>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="country-search"
                placeholder="Search countries…"
                value={countryQuery}
                onChange={(e) => setCountryQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredCountries.map((country) => (
                <motion.button
                  key={country.code}
                  id={`country-${country.code}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedCountry(country);
                    setSelectedIdType(null);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
                    ${
                      selectedCountry?.code === country.code
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}
                >
                  <span className="text-2xl">{country.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {country.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {country.idTypes.length} ID type
                      {country.idTypes.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {selectedCountry?.code === country.code && (
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  )}
                </motion.button>
              ))}

              {filteredCountries.length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No countries found for "{countryQuery}"</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button
                id="country-next-btn"
                disabled={!selectedCountry}
                onClick={goNext}
                className="gap-2"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        );

      // STEP 2 — ID type selection
      case 2:
        return (
          <motion.div
            key="step2"
            custom={direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-2xl">{selectedCountry!.flag}</span>
                <h2 className="text-2xl font-bold">{selectedCountry!.name}</h2>
              </div>
              <p className="text-muted-foreground text-sm">
                Select the type of ID document you want to verify
              </p>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {selectedCountry!.idTypes.map((idType) => (
                <motion.button
                  key={idType.id}
                  id={`idtype-${idType.id}`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedIdType(idType)}
                  className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all
                    ${
                      selectedIdType?.id === idType.id
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}
                >
                  <div
                    className={`p-2.5 rounded-lg shrink-0 ${
                      selectedIdType?.id === idType.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{idType.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {idType.description}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {idType.sides === "double"
                          ? "Front + Back"
                          : "Front only"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {idType.acceptedFormats}
                      </Badge>
                    </div>
                  </div>
                  {selectedIdType?.id === idType.id && (
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-1" />
                  )}
                </motion.button>
              ))}
            </div>

            <div className="flex justify-between mt-6">
              <Button
                id="idtype-back-btn"
                variant="outline"
                onClick={goBack}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                id="idtype-next-btn"
                disabled={!selectedIdType}
                onClick={goNext}
                className="gap-2"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        );

      // STEP 3 — File upload
      case 3:
        const needsBack = selectedIdType!.sides === "double";
        const canProceed =
          !!frontFile && (!needsBack || !!backFile) && !isVerifying;

        const DropZone = ({
          side,
          preview,
        }: {
          side: "front" | "back";
          preview: string | null;
        }) => (
          <div>
            <p className="text-sm font-medium mb-2 capitalize">
              {side === "front" ? "📄 Front Side" : "📋 Back Side"}{" "}
              <span className="text-red-500">*</span>
            </p>
            <div
              onDrop={handleDrop(side)}
              onDragOver={(e) => e.preventDefault()}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer hover:border-primary/50 hover:bg-muted/30
                ${preview ? "border-primary/60 bg-primary/5" : "border-border"}`}
            >
              <input
                type="file"
                id={`upload-${side}`}
                accept="image/*,.pdf"
                onChange={handleFileChange(side)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {preview ? (
                <div className="space-y-2">
                  <div className="relative inline-block">
                    <img
                      src={preview}
                      alt={`${side} preview`}
                      className="max-h-40 max-w-full mx-auto rounded-lg shadow object-contain"
                    />
                    <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click or drag to replace
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <FileImage className="w-10 h-10 mx-auto text-muted-foreground/50" />
                  <p className="text-sm font-medium">Drop image here</p>
                  <p className="text-xs text-muted-foreground">
                    or click to browse · {selectedIdType!.acceptedFormats}
                  </p>
                </div>
              )}
            </div>
          </div>
        );

        return (
          <motion.div
            key="step3"
            custom={direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Upload Your Document</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Upload a clear photo of your{" "}
                <span className="font-medium text-foreground">
                  {selectedIdType!.label}
                </span>
                {needsBack ? " (front and back)" : " (front side)"}
              </p>
            </div>

            {/* Tips */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-5 text-xs text-blue-600 dark:text-blue-400">
              <Eye className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Ensure the document is fully visible, well-lit, and all text is
                readable. Avoid glare and blurriness for best results.
              </span>
            </div>

            <div className={`grid gap-4 ${needsBack ? "sm:grid-cols-2" : ""}`}>
              <DropZone side="front" preview={frontPreview} />
              {needsBack && <DropZone side="back" preview={backPreview} />}
            </div>

            {verificationError && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mt-4 text-xs text-destructive"
              >
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{verificationError}</span>
              </motion.div>
            )}

            <div className="flex justify-between mt-6">
              <Button
                id="upload-back-btn"
                variant="outline"
                onClick={goBack}
                disabled={isVerifying}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>

              <Button
                id="verify-btn"
                disabled={!canProceed}
                onClick={handleVerify}
                className="gap-2 min-w-[140px]"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Verify Document
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        );

      // STEP 4 — Results
      case 4:
        if (!verificationResult) return null;

        const { recommendation, confidence, extractedData, issues } =
          verificationResult;

        const resultConfig = {
          APPROVE: {
            icon: CheckCircle2,
            title: "Identity Verified!",
            subtitle:
              "Your document has been successfully verified. KYC approved.",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/30",
            badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          },
          MANUAL_REVIEW: {
            icon: AlertTriangle,
            title: "Under Manual Review",
            subtitle:
              "Your document has been submitted. Our team will review it shortly.",
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            border: "border-amber-500/30",
            badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          },
          REJECT: {
            icon: XCircle,
            title: "Verification Failed",
            subtitle:
              "We could not verify your document. Please try again with a clearer image.",
            color: "text-red-500",
            bg: "bg-red-500/10",
            border: "border-red-500/30",
            badge: "bg-red-500/10 text-red-600 dark:text-red-400",
          },
        }[recommendation];

        const ResultIcon = resultConfig.icon;

        return (
          <motion.div
            key="step4"
            custom={direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            {/* Result Banner */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring" as const,
                stiffness: 200,
                damping: 20,
              }}
              className={`flex flex-col items-center p-6 rounded-2xl border-2 mb-6 ${resultConfig.bg} ${resultConfig.border}`}
            >
              <div className="relative mb-3">
                <ResultIcon
                  className={`w-14 h-14 ${resultConfig.color}`}
                  strokeWidth={1.5}
                />
                {recommendation === "APPROVE" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.3, 1] }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </motion.div>
                )}
              </div>
              <h2 className={`text-xl font-bold ${resultConfig.color}`}>
                {resultConfig.title}
              </h2>
              <p className="text-sm text-muted-foreground text-center mt-1 max-w-xs">
                {resultConfig.subtitle}
              </p>

              <div className="flex items-center gap-2 mt-3">
                <Badge
                  className={`text-xs font-semibold rounded-full px-3 ${resultConfig.badge}`}
                >
                  {recommendation === "APPROVE"
                    ? "KYC Approved"
                    : recommendation === "MANUAL_REVIEW"
                      ? "Manual Review"
                      : "KYC Rejected"}
                </Badge>
              </div>
            </motion.div>

            {/* Confidence Meter */}
            <div className="mb-5">
              <ConfidenceMeter confidence={confidence} />
            </div>

            {/* Extracted Data */}
            {Object.values(extractedData).some(Boolean) && (
              <div className="rounded-xl border bg-card p-4 mb-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-primary" />
                  Extracted Information
                </h3>
                <ExtractedDataRow
                  icon={User}
                  label="Full Name"
                  value={extractedData.fullName}
                />
                <ExtractedDataRow
                  icon={Calendar}
                  label="Date of Birth"
                  value={extractedData.dateOfBirth}
                />
                <ExtractedDataRow
                  icon={Hash}
                  label="Document Number"
                  value={extractedData.documentNumber}
                />
                <ExtractedDataRow
                  icon={Calendar}
                  label="Expiry Date"
                  value={extractedData.expiryDate}
                />
                <ExtractedDataRow
                  icon={Flag}
                  label="Nationality"
                  value={extractedData.nationality}
                />
              </div>
            )}

            {/* Issues */}
            {issues.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-4">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  Issues Detected
                </h3>
                <ul className="space-y-1">
                  {issues.map((issue, i) => (
                    <li
                      key={i}
                      className="text-xs text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-amber-500 mt-0.5">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              {recommendation === "REJECT" && (
                <Button
                  id="retry-kyc-btn"
                  variant="outline"
                  onClick={reset}
                  className="gap-2 flex-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
              )}
              {recommendation !== "REJECT" && (
                <Button
                  id="restart-kyc-btn"
                  variant="outline"
                  onClick={reset}
                  className="gap-2 flex-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  New Submission
                </Button>
              )}
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <Shield className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">KYC Verification</h1>
        <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">
          Complete identity verification to unlock trading and investment
          features. Your data is processed securely using AI.
        </p>

        {/* Wallet warning */}
        {!accountId && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 max-w-sm mx-auto">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Connect your wallet to save your KYC status on-chain.
            </p>
          </div>
        )}
      </div>

      <Card className="shadow-lg">
        <CardContent className="p-6 sm:p-8">
          {/* Step Indicator */}
          <StepIndicator currentStep={step} totalSteps={STEPS.length} />

          {/* Step Content with animations */}
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              {renderStep()}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Security footnote */}
      <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
        <Shield className="w-3 h-3" />
        Documents are analysed by AI and never stored in raw form. All data is
        encrypted and handled per GDPR guidelines.
      </p>
    </div>
  );
}
