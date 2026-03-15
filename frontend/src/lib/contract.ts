import { BrowserProvider, Contract, parseEther } from "ethers";
import type { ProofResult } from "./proof";
import { getUserAgentAddress } from "./factory";

const FALLBACK_CONTRACT = import.meta.env.VITE_CONTRACT_ADDRESS;

const ABI = [
  "function updateMerkleRoot(bytes32 newRoot) external",
  "function verifyAndLogDecision(bytes32[] calldata proof, bytes32 decisionLeaf, uint256 proposedAmount, uint256 totalPortfolioValue) external returns (bool)",
  "function verifyDecision(bytes32[] calldata proof, bytes32 decisionLeaf) external view returns (bool)",
  "function currentMerkleRoot() external view returns (bytes32)",
  "event ProposalVerified(bytes32 indexed proposalHash, address approvedBy, uint256 timestamp, bool passed)",
];

export interface SubmitResult {
  txHash: string;
  passed: boolean;
  blockNumber: number;
}

export async function getContract() {
  if (!window.ethereum) throw new Error("No wallet found. Please install MetaMask.");
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const userAddress = await signer.getAddress();

  let contractAddress = FALLBACK_CONTRACT;
  try {
    const userAgent = await getUserAgentAddress(userAddress);
    console.log("👤 userAddress:", userAddress);
    console.log("🤖 userAgent:", userAgent);
    if (userAgent && userAgent !== "0x0000000000000000000000000000000000000000") {
      contractAddress = userAgent;
    }
  } catch (e) {
    console.log("❌ factory lookup failed:", e);
  }

  console.log("📝 using contract:", contractAddress);
  return new Contract(contractAddress, ABI, signer);
}

export async function submitProofToChain(
  proofResult: ProofResult,
  allocationPercent: number,
  totalPortfolioValue = 1000
): Promise<SubmitResult> {
  const contract = await getContract();

  const rootTx = await contract.updateMerkleRoot(proofResult.root);
  await rootTx.wait();

  const proposedAmount = parseEther(
    ((allocationPercent / 100) * totalPortfolioValue).toFixed(4)
  );
  const totalValue = parseEther(totalPortfolioValue.toString());

  const verifyTx = await contract.verifyAndLogDecision(
    proofResult.proof,
    proofResult.leaf,
    proposedAmount,
    totalValue
  );

  const receipt = await verifyTx.wait();

  let passed = true;
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "ProposalVerified") {
        passed = parsed.args.passed;
      }
    } catch {}
  }

  return { txHash: receipt.hash, passed, blockNumber: receipt.blockNumber };
}

export function getEtherscanUrl(txHash: string): string {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}
