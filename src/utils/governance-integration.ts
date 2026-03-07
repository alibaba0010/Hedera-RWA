import {
  TopicMessageSubmitTransaction,
  Client,
  AccountId,
  PrivateKey,
} from "@hashgraph/sdk";
import { governanceTopicId, getEnv } from "./index";
import {
  getAccountTokenBalance,
  getTokenMetadata,
  initializeHederaClient,
} from "./hedera-integration";
import { fetchDataFromDatabase } from "./supabase";

export interface Proposal {
  id: string; // HCS sequence number or unique ID
  title: string;
  description: string;
  creator: string;
  tokenId: string; // Token that grants voting rights
  tokenName?: string; // Cache the name
  tokenSymbol?: string; // Cache the symbol if known
  startTime: number;
  endTime: number;
  options: string[];
  status: "active" | "passed" | "failed";
}

export interface Vote {
  proposalId: string;
  voter: string;
  choice: string;
  weight: number;
  timestamp: string;
}

/**
 * Submits a new proposal to the HCS governance topic.
 */
export async function createProposalHCS(
  proposal: Omit<Proposal, "id" | "status">,
): Promise<string> {
  const { client } = await initializeHederaClient();

  const message = JSON.stringify({
    type: "PROPOSAL_CREATE",
    payload: {
      ...proposal,
      createdAt: new Date().toISOString(),
    },
  });

  const submitTx = await new TopicMessageSubmitTransaction({
    topicId: governanceTopicId,
    message,
  }).execute(client);

  const receipt = await submitTx.getReceipt(client);
  return receipt.status.toString();
}

/**
 * Casts a vote on a proposal.
 */
export async function castVoteHCS(
  proposalId: string,
  choice: string,
  voter: string,
): Promise<string> {
  const { client } = await initializeHederaClient();

  const message = JSON.stringify({
    type: "VOTE_CAST",
    payload: {
      proposalId,
      choice,
      voter,
      timestamp: new Date().toISOString(),
    },
  });

  const submitTx = await new TopicMessageSubmitTransaction({
    topicId: governanceTopicId,
    message,
  }).execute(client);

  const receipt = await submitTx.getReceipt(client);
  return receipt.status.toString();
}

/**
 * Fetches all governance messages from the Mirror Node and reconstructs the state.
 * This is "Hedera-native DAO" because the source of truth is HCS.
 */
export async function fetchGovernanceState() {
  const assets = await fetchDataFromDatabase();
  const tokenNameMap = new Map(assets?.map((a: any) => [a.tokenId, a.name]));
  const tokenSymbolMap = new Map(
    assets?.map((a: any) => [a.tokenId, a.symbol]),
  );

  const url = `https://testnet.mirrornode.hedera.com/api/v1/topics/${governanceTopicId}/messages?order=asc`;
  const res = await fetch(url);
  const data = await res.json();

  const proposals: Map<string, Proposal & { votes: Vote[] }> = new Map();

  for (const msg of data.messages) {
    try {
      const decoded = JSON.parse(atob(msg.message));
      const sequenceNumber = msg.sequence_number.toString();

      if (decoded.type === "PROPOSAL_CREATE") {
        let tokenName = tokenNameMap.get(decoded.payload.tokenId);
        let tokenSymbol = tokenSymbolMap.get(decoded.payload.tokenId);

        // Fallback to Network lookup if not in local DB
        if (!tokenName || !tokenSymbol) {
          const networkMetadata = await getTokenMetadata(
            decoded.payload.tokenId,
          );
          if (networkMetadata) {
            tokenName = tokenName || networkMetadata.name;
            tokenSymbol = tokenSymbol || networkMetadata.symbol;
          }
        }

        proposals.set(sequenceNumber, {
          id: sequenceNumber,
          ...decoded.payload,
          tokenName,
          tokenSymbol,
          status: "active",
          votes: [],
        });
      } else if (decoded.type === "VOTE_CAST") {
        const { proposalId, choice, voter, timestamp } = decoded.payload;
        const proposal = proposals.get(proposalId);
        if (proposal) {
          // Verify if vote is within time range
          const voteTime = new Date(timestamp).getTime();
          if (voteTime >= proposal.startTime && voteTime <= proposal.endTime) {
            // Check voter balance (weight)
            // Note: In production we'd use balance AT proposal.startTime,
            // but for this demo mirrored balance from Mirror Node works.
            const weight = await getAccountTokenBalance(
              voter,
              proposal.tokenId,
            );

            // Allow updating vote: check if voter already voted
            const existingVoteIdx = proposal.votes.findIndex(
              (v) => v.voter === voter,
            );
            if (existingVoteIdx > -1) {
              proposal.votes[existingVoteIdx] = {
                proposalId,
                voter,
                choice,
                weight,
                timestamp,
              };
            } else {
              proposal.votes.push({
                proposalId,
                voter,
                choice,
                weight,
                timestamp,
              });
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse HCS message", e);
    }
  }

  return Array.from(proposals.values()).map((p) => {
    // Update status based on current time
    const now = Date.now();
    if (now > p.endTime) {
      // Simple Pass/Fail logic: pass if more than 50% weight
      const totalWeight = p.votes.reduce((sum, v) => sum + v.weight, 0);
      const yesWeight = p.votes
        .filter((v) => v.choice === "Yes")
        .reduce((sum, v) => sum + v.weight, 0);
      p.status = yesWeight > totalWeight / 2 ? "passed" : "failed";
    }
    return p;
  });
}
