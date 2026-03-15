import { BrowserProvider, Contract } from "ethers";

const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS;

const FACTORY_ABI = [
  "function deployAgent(bytes32 ensNode) external returns (address)",
  "function getAgent(address user) external view returns (address)",
  "function hasAgent(address user) external view returns (bool)",
  "event AgentDeployed(address indexed owner, address indexed agentAddress, bytes32 ensNode)",
];

export async function getFactory() {
  if (!window.ethereum) throw new Error("No wallet found.");
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
}

export async function checkUserHasAgent(userAddress: string): Promise<boolean> {
  if (!window.ethereum) return false;
  const provider = new BrowserProvider(window.ethereum);
  const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
  return await factory.hasAgent(userAddress);
}

export async function getUserAgentAddress(userAddress: string): Promise<string> {
  if (!window.ethereum) return "";
  const provider = new BrowserProvider(window.ethereum);
  const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
  return await factory.getAgent(userAddress);
}

export async function deployUserAgent(ensNode: string): Promise<string> {
  const factory = await getFactory();
  const tx = await factory.deployAgent(ensNode);
  const receipt = await tx.wait();

  // Parse AgentDeployed event to get the agent address
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log);
      if (parsed?.name === "AgentDeployed") {
        return parsed.args.agentAddress;
      }
    } catch {}
  }
  throw new Error("Could not find deployed agent address");
}

export function namehash(name: string): string {
  // Simple ENS namehash implementation
  let node = "0x0000000000000000000000000000000000000000000000000000000000000000";
  if (name === "") return node;

  const labels = name.split(".").reverse();
  for (const label of labels) {
    const labelHash = require("ethers").keccak256(require("ethers").toUtf8Bytes(label));
    node = require("ethers").keccak256(node + labelHash.slice(2));
  }
  return node;
}
