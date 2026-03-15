import MerkleTree from "merkletreejs";
import { keccak256, toUtf8Bytes } from "ethers";
import type { TradeProposal } from "./claude";

export interface ProofResult {
  root: string;
  leaf: string;
  proof: string[];
  proposalString: string;
  allLeaves: string[];
  layers: string[][];
}

export function generateProposalProof(
  proposal: TradeProposal,
  strategyRules: string[]
): ProofResult {
  const proposalString = JSON.stringify({
    action: proposal.action,
    token: proposal.token,
    allocationPercent: proposal.allocationPercent,
  });

  const proposalLeaf = keccak256(toUtf8Bytes(proposalString));

  const ruleLeaves = strategyRules
    .filter((r) => r.trim().length > 0)
    .map((r) => keccak256(toUtf8Bytes(r.trim())));

  const allLeaves = [...ruleLeaves, proposalLeaf];
  const tree = new MerkleTree(allLeaves, keccak256, { sortPairs: true });

  return {
    root: tree.getHexRoot(),
    leaf: proposalLeaf,
    proof: tree.getHexProof(proposalLeaf),
    proposalString,
    allLeaves: tree.getHexLeaves(),
    layers: tree.getLayers().map(layer => layer.map(node => "0x" + node.toString('hex')))
  };
}

export function formatHashShort(hash: string): string {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}
