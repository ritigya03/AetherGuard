// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {MerkleVerifier} from "./MerkleVerifier.sol";
import {MockPolicyEnforcer} from "./MockPolicyEnforcer.sol";

interface IENSRegistry {
    function owner(bytes32 node) external view returns (address);
}

contract AetherGuardController is MockPolicyEnforcer {
    using MerkleVerifier for bytes32[];

    IENSRegistry public constant ENS_REGISTRY =
        IENSRegistry(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);

    bytes32 public currentMerkleRoot;
    bytes32 public immutable ensNode;
    address public agentSigner;

    event MerkleRootUpdated(bytes32 newRoot);
    event AgentSignerUpdated(address newSigner);
    event ProposalVerified(
        bytes32 indexed proposalHash,
        address approvedBy,
        uint256 timestamp,
        bool passed
    );

    constructor(bytes32 _ensNode, address _initialAgentSigner) {
        ensNode = _ensNode;
        agentSigner = _initialAgentSigner;
    }

    modifier onlyENSOwner() {
        require(ENS_REGISTRY.owner(ensNode) == msg.sender, "Not ENS owner");
        _;
    }

    // agentSigner OR ENS owner can update root
    // This allows factory-deployed agents to work without real ENS registration
    modifier onlyAuthorized() {
        require(
            msg.sender == agentSigner ||
            ENS_REGISTRY.owner(ensNode) == msg.sender,
            "Not authorized"
        );
        _;
    }

    function updateMerkleRoot(bytes32 newRoot) external onlyAuthorized {
        currentMerkleRoot = newRoot;
        emit MerkleRootUpdated(newRoot);
    }

    function verifyDecision(
        bytes32[] calldata proof,
        bytes32 decisionLeaf
    ) external view returns (bool) {
        return proof.verifyProof(currentMerkleRoot, decisionLeaf);
    }

    function verifyAndLogDecision(
        bytes32[] calldata proof,
        bytes32 decisionLeaf,
        uint256 proposedAmount,
        uint256 totalPortfolioValue
    ) external returns (bool) {
        bool proofValid = proof.verifyProof(currentMerkleRoot, decisionLeaf);

        bool policyValid = true;
        if (proposedAmount > 0) {
            policyValid = (proposedAmount * 10000 <=
                totalPortfolioValue * maxAllocationBps);
        }

        bool passed = proofValid && policyValid;

        emit ProposalVerified(
            decisionLeaf,
            msg.sender,
            block.timestamp,
            passed
        );

        return passed;
    }

    function updateAgentSigner(address newSigner) external onlyENSOwner {
        agentSigner = newSigner;
        emit AgentSignerUpdated(newSigner);
    }
}
