import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ProposalGenerator } from "@/components/proposals/proposal-generator";

export const metadata: Metadata = {
  title: "AI Proposals",
};

export default function ProposalsPage() {
  return (
    <div>
      <PageHeader
        title="AI Proposal Generator"
        description="Generate personalized Upwork bids and Fiverr quotes in seconds."
      />
      <ProposalGenerator />
    </div>
  );
}
