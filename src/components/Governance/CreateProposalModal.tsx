import React, { useState, useContext, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Proposal, createProposalHCS } from "@/utils/governance-integration";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { WalletContext } from "@/contexts/WalletContext";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchDataFromDatabase } from "@/utils/supabase";
import { CalendarIcon, Loader2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function CreateProposalModal({ isOpen, onClose, onRefresh }: Props) {
  const { accountId } = useContext(WalletContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tokenId: "",
    durationDays: "7",
  });
  useEffect(() => {
    async function loadAssets() {
      try {
        const data = await fetchDataFromDatabase();
        if (data && data.length > 0) {
          setAssets(data);
          setFormData((prev) => ({ ...prev, tokenId: data[0].tokenId }));
        }
      } catch (e) {
        console.error("Failed to load assets", e);
      } finally {
        setLoadingAssets(false);
      }
    }
    if (isOpen) {
      loadAssets();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      toast.error("Please connect wallet first");
      return;
    }

    if (!formData.title || !formData.description) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const startTime = Date.now();
      const endTime =
        startTime + Number(formData.durationDays) * 24 * 60 * 60 * 1000;

      const status = await createProposalHCS({
        title: formData.title,
        description: formData.description,
        creator: accountId,
        tokenId: formData.tokenId,
        startTime,
        endTime,
        options: ["Yes", "No"],
      });

      if (status === "SUCCESS") {
        toast.success("Proposal submitted to HCS governance topic!");
        onRefresh();
        onClose();
      } else {
        toast.error("HCS submit failed: " + status);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to create proposal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Governance Proposal</DialogTitle>
          <DialogDescription>
            Submit a new proposal to the Hedera Consensus Service (HCS) for
            community voting.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Proposal Title</Label>
            <Input
              id="title"
              placeholder="e.g. Increase rental yield payout for RWA-001"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description</Label>
            <Textarea
              id="description"
              placeholder="Explain the proposal and why token holders should vote..."
              className="min-h-[120px]"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Voting Asset</Label>
              <Select
                value={formData.tokenId}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, tokenId: v }))
                }
              >
                <SelectTrigger disabled={loadingAssets}>
                  <SelectValue
                    placeholder={
                      loadingAssets ? "Loading assets..." : "Select Token"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.tokenId} value={a.tokenId}>
                      {a.name && a.symbol
                        ? `${a.name} (${a.symbol})`
                        : a.name || a.symbol || a.tokenId}
                    </SelectItem>
                  ))}
                  {assets.length === 0 && !loadingAssets && (
                    <SelectItem value="no-assets" disabled>
                      No assets created yet
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration (Days)</Label>
              <Select
                defaultValue={formData.durationDays}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, durationDays: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !accountId}
              className="gap-2 px-8"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Submit to HCS"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
