import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function WalletTypeSelector({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (type: "hedera" | "evm") => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>Select Wallet Type</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-4">
          <Button
            onClick={() => {
              onSelect("hedera");
              onClose();
            }}
            className="w-full"
          >
            Native Hedera Wallet
          </Button>
          <Button
            onClick={() => {
              onSelect("evm");
              onClose();
            }}
            className="w-full"
            variant="outline"
          >
            EVM Wallet (MetaMask, etc)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
