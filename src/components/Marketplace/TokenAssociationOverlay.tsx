import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EyeIcon, EyeOffIcon, CheckIcon, CopyIcon, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface TokenAssociationOverlayProps {
  isOpen: boolean;
  tokenId: string;
  onClose: () => void;
  onCheckAssociation: () => Promise<boolean>;
  onAssociateWithPrivateKey: (privateKey: string) => Promise<void>;
}

export function TokenAssociationOverlay({
  isOpen,
  tokenId,
  onClose,
  onCheckAssociation,
  onAssociateWithPrivateKey,
}: TokenAssociationOverlayProps) {
  const [showOption1Details, setShowOption1Details] = useState(false);
  const [showOption2Details, setShowOption2Details] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAssociating, setIsAssociating] = useState(false);

  const handleCopyTokenId = () => {
    navigator.clipboard.writeText(tokenId);
    toast({
      title: "Token ID copied",
      description: "The token ID has been copied to your clipboard",
    });
  };

  const handleCheckAssociation = async () => {
    setIsChecking(true);
    try {
      const isAssociated = await onCheckAssociation();
      if (isAssociated) {
        toast({
          title: "Success",
          description: "Token is now associated with your wallet",
        });
        onClose();
      } else {
        toast({
          title: "Not Associated",
          description: "The token is not yet associated with your wallet",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error checking association:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleAssociateWithPrivateKey = async () => {
    if (privateKey.length !== 64) {
      toast({
        title: "Invalid Private Key",
        description: "Please enter a valid 64-character private key",
        variant: "destructive",
      });
      return;
    }

    setIsAssociating(true);
    try {
      await onAssociateWithPrivateKey(privateKey);
      toast({
        title: "Success",
        description: "Token has been associated with your wallet",
      });
      setPrivateKey(""); // Reset private key after successful association
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to associate token",
        variant: "destructive",
      });
    } finally {
      setIsAssociating(false);
    }
  };

  const handleClose = () => {
    setPrivateKey(""); // Reset private key when closing the overlay
    setShowPrivateKey(false); // Reset the show/hide password state
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="bg-gray-900 text-white border border-gray-800">
        <AlertDialogHeader className="flex justify-between items-center">
          <AlertDialogTitle>Token Association Required</AlertDialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-6 w-6 rounded-full hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDialogHeader>
        <div className="space-y-4">
          {/* Option 1 */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => {
                setShowOption1Details(!showOption1Details);
                setShowOption2Details(false);
              }}
            >
              <span>Manual Association</span>
              {showOption1Details ? "-" : "+"}
            </Button>

            {showOption1Details && (
              <div className="space-y-4 p-4 bg-gray-800 rounded-md">
                <div className="flex items-center space-x-2">
                  <Input
                    readOnly
                    value={tokenId}
                    className="bg-gray-700 text-white"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCopyTokenId}
                    className="hover:bg-gray-700"
                  >
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  onClick={handleCheckAssociation}
                  disabled={isChecking}
                  className="w-full"
                >
                  {isChecking ? (
                    "Checking..."
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CheckIcon className="h-4 w-4" />
                      <span>Verify Association</span>
                    </div>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Option 2 */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => {
                setShowOption2Details(!showOption2Details);
                setShowOption1Details(false);
              }}
            >
              <span>Automatic Association with Private Key</span>
              {showOption2Details ? "-" : "+"}
            </Button>

            {showOption2Details && (
              <div className="space-y-4 p-4 bg-gray-800 rounded-md">
                <div className="space-y-2">
                  <Label htmlFor="privateKey">Private Key</Label>
                  <div className="relative">
                    <Input
                      id="privateKey"
                      type={showPrivateKey ? "text" : "password"}
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      className="bg-gray-700 text-white pr-10"
                      placeholder="Enter your private key"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-0 top-0 hover:bg-gray-700"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                    >
                      {showPrivateKey ? (
                        <EyeOffIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={handleAssociateWithPrivateKey}
                  disabled={privateKey.length !== 64 || isAssociating}
                  className="w-full"
                >
                  {isAssociating ? "Associating..." : "Associate Token"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
