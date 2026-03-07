import React from "react";
import { Proposal } from "@/utils/governance-integration";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Users, Vote as VoteIcon } from "lucide-react";

interface Props {
  proposal: Proposal & { votes: { choice: string; weight: number }[] };
  onClick: (id: string) => void;
}

export function ProposalCard({ proposal, onClick }: Props) {
  const totalWeight = proposal.votes.reduce(
    (sum, v) => sum + Number(v.weight),
    0,
  );
  const yesWeight = proposal.votes
    .filter((v) => v.choice === "Yes")
    .reduce((sum, v) => sum + Number(v.weight), 0);
  const progressPercent = totalWeight > 0 ? (yesWeight / totalWeight) * 100 : 0;

  const getStatusBadge = (status: Proposal["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
            Active
          </Badge>
        );
      case "passed":
        return (
          <Badge variant="secondary" className="bg-green-500/10 text-green-500">
            Passed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="secondary" className="bg-red-500/10 text-red-500">
            Failed
          </Badge>
        );
    }
  };

  const timeLeft = Math.max(
    0,
    Math.floor((proposal.endTime - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick(proposal.id)}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold">{proposal.title}</CardTitle>
          {getStatusBadge(proposal.status)}
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeLeft > 0 ? `${timeLeft} days left` : "Ended"}
          </div>
          <Badge
            variant="outline"
            className="w-fit text-[10px] py-0 h-4 border-primary/20 bg-primary/5 text-primary"
          >
            {proposal.tokenName && proposal.tokenSymbol
              ? `${proposal.tokenName} (${proposal.tokenSymbol})`
              : proposal.tokenName || proposal.tokenSymbol || proposal.tokenId}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {proposal.description}
        </p>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Result (Yes)</span>
            <span>{progressPercent.toFixed(1)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4 text-xs">
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {proposal.votes.length} Voters
        </div>
        <div className="flex items-center gap-1">
          <VoteIcon className="h-3 w-3" />
          {totalWeight.toLocaleString()} Weight
        </div>
      </CardFooter>
    </Card>
  );
}
