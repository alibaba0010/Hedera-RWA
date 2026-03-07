import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/layouts/Navbar";
import { Proposal, fetchGovernanceState } from "@/utils/governance-integration";
import { ProposalCard } from "@/components/Governance/ProposalCard";
import { ProposalDetails } from "@/components/Governance/ProposalDetails";
import { CreateProposalModal } from "@/components/Governance/CreateProposalModal";
import { Button } from "@/components/ui/button";
import {
  Plus,
  RefreshCcw,
  Loader2,
  Landmark,
  Filter,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function GovernancePage() {
  const [proposals, setProposals] = useState<(Proposal & { votes: any[] })[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadProposals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchGovernanceState();
      setProposals(data);
    } catch (e: any) {
      toast.error("Failed to fetch HCS governance data: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const selectedProposal = proposals.find((p) => p.id === selectedProposalId);

  const filteredProposals = proposals.filter((p) => {
    const matchesTab = activeTab === "all" || p.status === activeTab;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <AnimatePresence mode="wait">
          {selectedProposalId && selectedProposal ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ProposalDetails
                proposal={selectedProposal}
                onBack={() => setSelectedProposalId(null)}
                onRefresh={loadProposals}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-extrabold tracking-tight">
                      On-Chain Governance
                    </h1>
                  </div>
                  <p className="text-muted-foreground">
                    Community-driven decision making via Hedera Consensus
                    Service (HCS).
                  </p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={loadProposals}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )}
                    Sync HCS
                  </Button>
                  <Button
                    className="gap-2 font-semibold bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <Plus className="h-4 w-4" /> New Proposal
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search proposals..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Tabs
                  defaultValue="all"
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="passed">Passed</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="animate-pulse">
                    Reconstructing DAO state from Mirror Node...
                  </p>
                </div>
              ) : filteredProposals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProposals
                    .slice()
                    .reverse()
                    .map((p) => (
                      <ProposalCard
                        key={p.id}
                        proposal={p}
                        onClick={setSelectedProposalId}
                      />
                    ))}
                </div>
              ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-muted/50">
                  <Landmark className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                  <h3 className="text-xl font-semibold">No proposals found</h3>
                  <p className="text-muted-foreground mt-2">
                    Be the first to create a governance proposal for the RWA
                    community.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Create Proposal
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <CreateProposalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRefresh={loadProposals}
      />
    </div>
  );
}
