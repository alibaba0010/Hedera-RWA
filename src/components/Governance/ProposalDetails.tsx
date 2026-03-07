import React, { useState, useContext } from "react";
import { Proposal, castVoteHCS, Vote } from "@/utils/governance-integration";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { WalletContext } from "@/contexts/WalletContext";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ArrowLeft, Send } from "lucide-react";

interface Props {
  proposal: Proposal & { votes: Vote[] };
  onBack: () => void;
  onRefresh: () => void;
}

export function ProposalDetails({ proposal, onBack, onRefresh }: Props) {
  const { accountId } = useContext(WalletContext);
  const [isVoting, setIsVoting] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  const totalWeight = proposal.votes.reduce(
    (sum, v) => sum + Number(v.weight),
    0,
  );
  const yesWeight = proposal.votes
    .filter((v) => v.choice === "Yes")
    .reduce((sum, v) => sum + Number(v.weight), 0);
  const noWeight = totalWeight - yesWeight;
  const yesPercent = totalWeight > 0 ? (yesWeight / totalWeight) * 100 : 0;
  const noPercent = totalWeight > 0 ? (noWeight / totalWeight) * 100 : 0;

  const currentVote = proposal.votes.find((v) => v.voter === accountId);

  const handleVote = async () => {
    if (!accountId || !selectedChoice) {
      toast.error("Please select a choice and connect wallet");
      return;
    }

    setIsVoting(true);
    try {
      const status = await castVoteHCS(proposal.id, selectedChoice, accountId);
      if (status === "SUCCESS") {
        toast.success("Vote cast successfully on HCS!");
        onRefresh();
      } else {
        toast.error("HCS submit failed: " + status);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to cast vote");
    } finally {
      setIsVoting(false);
    }
  };

  const isExpired = Date.now() > proposal.endTime;

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="gap-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Back to Proposals
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-2xl font-bold">
                  {proposal.title}
                </CardTitle>
                <Badge variant="outline">{proposal.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 items-center">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  KYC Token:{" "}
                  {proposal.tokenName && proposal.tokenSymbol
                    ? `${proposal.tokenName} (${proposal.tokenSymbol})`
                    : proposal.tokenName ||
                      proposal.tokenSymbol || (
                        <>
                          ID:{" "}
                          <code className="bg-muted px-1 rounded">
                            {proposal.tokenId}
                          </code>
                        </>
                      )}
                </div>
                <span className="opacity-50">|</span>
                <span>
                  By:{" "}
                  <span className="text-primary truncate max-w-[100px] inline-block align-bottom">
                    {proposal.creator}
                  </span>
                </span>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert">
              <p className="text-muted-foreground whitespace-pre-wrap">
                {proposal.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cast Your Vote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  disabled={isVoting || isExpired}
                  variant={selectedChoice === "Yes" ? "default" : "outline"}
                  className="flex-1 py-10 text-xl font-bold gap-3"
                  onClick={() => setSelectedChoice("Yes")}
                >
                  <CheckCircle2 className="h-6 w-6" /> Yes
                </Button>
                <Button
                  disabled={isVoting || isExpired}
                  variant={selectedChoice === "No" ? "default" : "outline"}
                  className="flex-1 py-10 text-xl font-bold gap-3"
                  onClick={() => setSelectedChoice("No")}
                >
                  <XCircle className="h-6 w-6" /> No
                </Button>
              </div>

              {currentVote && (
                <div className="p-4 rounded-lg bg-primary/5 text-sm flex justify-between items-center bg-blue-500/10 text-blue-500">
                  <span>
                    Your current vote: <strong>{currentVote.choice}</strong>
                  </span>
                  <span>
                    Weight:{" "}
                    <strong>
                      {Number(currentVote.weight).toLocaleString()}
                    </strong>
                  </span>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full gap-2 py-6 text-lg"
                disabled={
                  !selectedChoice || isVoting || isExpired || !accountId
                }
                onClick={handleVote}
              >
                {isVoting
                  ? "Verifying Weight..."
                  : isExpired
                    ? "Voting Ended"
                    : `Confirm Vote with ${proposal.tokenName || "Tokens"}`}
                <Send className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Governance Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Yes</span>
                  <span>{yesPercent.toFixed(1)}%</span>
                </div>
                <Progress
                  value={yesPercent}
                  className="h-2 bg-green-500/10"
                  indicatorClassName="bg-green-500"
                />
                <span className="text-xs text-muted-foreground">
                  {yesWeight.toLocaleString()} weight
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>No</span>
                  <span>{noPercent.toFixed(1)}%</span>
                </div>
                <Progress
                  value={noPercent}
                  className="h-2 bg-red-500/10"
                  indicatorClassName="bg-red-500"
                />
                <span className="text-xs text-muted-foreground">
                  {noWeight.toLocaleString()} weight
                </span>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Quorum</span>
                  <span>Reached</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Total voters</span>
                  <span>{proposal.votes.length}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-primary">
                  <span>Total weight</span>
                  <span>{totalWeight.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {proposal.votes
                  .slice(-5)
                  .reverse()
                  .map((v, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-[10px] border-b pb-2 last:border-0"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {v.voter.slice(0, 7)}...
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(v.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          v.choice === "Yes"
                            ? "text-green-500 font-bold border-green-500/20"
                            : "text-red-500 font-bold border-red-500/20"
                        }
                      >
                        {v.choice}
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
