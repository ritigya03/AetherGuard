# AetherGuard: Intelligent On-chain Guardrails for AI Agents

AetherGuard is a decentralized security middleware designed to protect users from autonomous AI agent misbehavior. It establishes an on-chain "Constitution" that agents must follow, enforced by Merkle proofs and protocol-level constraints.

## 🛡️ Core Features

- **Merkle-Proof Policy Enforcement**: AI-proposed trades must prove compliance against a user-signed policy manifest before execution.
- **On-chain Guardrails**: Hardcoded smart contract limits (e.g., max allocation, token allowlists) provide a zero-trust fallback.
- **Decentralized Audit Log**: Every decision (approved or rejected) is logged on-chain and stored on Fileverse for transparent post-trade analysis.
- **ENS Integration**: Agents carry a verifiable identity (e.g., `trader.aetherguard.eth`) linked to their specific guardrail configuration.

## 🚀 Getting Started

### Prerequisites

- Node.js & npm
- MetaMask or any EIP-1193 wallet

### Installation

1.  Clone the repository:
    ```sh
    git clone https://github.com/your-username/AetherGuard.git
    cd AetherGuard/frontend
    ```

2.  Install dependencies:
    ```sh
    npm install
    ```

3.  Configure Environment Variables:
    Create a `.env` file in the `frontend` root:
    ```env
    VITE_GROQ_API_KEY=your_key_here
    VITE_CONTRACT_ADDRESS=0x...
    ```

4.  Start development server:
    ```sh
    npm run dev
    ```

## 🏗️ Technical Architecture

- **Smart Contracts**: Foundry-based Solidity contracts (Merkle Verifier, Policy Controller).
- **Frontend**: React + TypeScript + Vite.
- **AI Engine**: Llama-3 via Groq for high-speed, verifiable trade proposals.
- **Storage**: Fileverse (IPFS) for policy manifests and audit logs.
- **Identity**: ENS NameWrapper for agent sub-identities.

## 📄 License

MIT
