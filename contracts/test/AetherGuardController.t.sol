// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/AetherGuardController.sol";
import "../lib/ens-contracts/contracts/utils/NameCoder.sol";

contract AetherGuardControllerTest is Test {
    AetherGuardController controller;
    bytes32 constant TEST_ENS_NODE = keccak256(abi.encodePacked(keccak256("eth"), keccak256("aetherguard")));
    
    address owner = address(this);
    address nonOwner = address(0x123);
    address newAgentSigner = address(0x456);

    // Events for testing
    event MerkleRootUpdated(bytes32 newRoot);
    event AgentSignerUpdated(address newSigner);
    event PolicyUpdated(uint256 newMaxBps);
    event ProposalVerified(
        bytes32 indexed proposalHash,
        address approvedBy,
        uint256 timestamp,
        bool passed
    );

    function setUp() public {
        controller = new AetherGuardController(TEST_ENS_NODE, owner);
        
        vm.mockCall(
            0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e,
            abi.encodeWithSelector(IENSRegistry.owner.selector, TEST_ENS_NODE),
            abi.encode(owner)
        );
        
        vm.allowCheatcodes(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);
    }

    // ================================================================
    // EXISTING TESTS — untouched
    // ================================================================

    function testUpdateMerkleRoot() public {
        bytes32 newRoot = keccak256("test root");
        controller.updateMerkleRoot(newRoot);
        assertEq(controller.currentMerkleRoot(), newRoot);
    }
    
    function testUpdateMerkleRootUnauthorized() public {
        bytes32 newRoot = keccak256("test root");
        vm.prank(nonOwner);
        vm.expectRevert("Not authorized");  // was "Not ENS owner"
        controller.updateMerkleRoot(newRoot);
    }
    
    function testUpdateMerkleRootMultipleTimes() public {
        bytes32 root1 = keccak256("root 1");
        bytes32 root2 = keccak256("root 2");
        bytes32 root3 = keccak256("root 3");
        
        controller.updateMerkleRoot(root1);
        assertEq(controller.currentMerkleRoot(), root1);
        
        controller.updateMerkleRoot(root2);
        assertEq(controller.currentMerkleRoot(), root2);
        
        controller.updateMerkleRoot(root3);
        assertEq(controller.currentMerkleRoot(), root3);
    }
    
    function testUpdateMerkleRootZeroRoot() public {
        bytes32 zeroRoot = bytes32(0);
        controller.updateMerkleRoot(zeroRoot);
        assertEq(controller.currentMerkleRoot(), zeroRoot);
    }

    function testVerifyDecision() public {
        bytes32 leaf = keccak256("trade decision 1");
        bytes32 root = leaf;
        controller.updateMerkleRoot(root);

        bytes32[] memory proof = new bytes32[](0);
        bool valid = controller.verifyDecision(proof, leaf);
        assertTrue(valid);
    }
    
    function testVerifyDecisionWithMultipleLeaves() public {
        bytes32 leaf1 = keccak256("decision 1");
        bytes32 leaf2 = keccak256("decision 2");
        bytes32 leaf3 = keccak256("decision 3");
        bytes32 leaf4 = keccak256("decision 4");
        
        bytes32 node1 = keccak256(abi.encodePacked(leaf1, leaf2));
        bytes32 node2 = keccak256(abi.encodePacked(leaf3, leaf4));
        bytes32 root = keccak256(abi.encodePacked(node1, node2));
        
        controller.updateMerkleRoot(root);
        
        bytes32[] memory proof1 = new bytes32[](2);
        proof1[0] = leaf2;
        proof1[1] = node2;
        assertTrue(controller.verifyDecision(proof1, leaf1));
        
        bytes32[] memory proof3 = new bytes32[](2);
        proof3[0] = leaf4;
        proof3[1] = node1;
        assertTrue(controller.verifyDecision(proof3, leaf3));
    }
    
    function testVerifyDecisionInvalidProof() public {
        bytes32 leaf = keccak256("valid decision");
        controller.updateMerkleRoot(leaf);
        
        bytes32 wrongLeaf = keccak256("wrong decision");
        bytes32[] memory proof = new bytes32[](0);
        assertFalse(controller.verifyDecision(proof, wrongLeaf));
    }
    
    function testVerifyDecisionWithInvalidProofLength() public {
        bytes32 leaf1 = keccak256("decision 1");
        bytes32 leaf2 = keccak256("decision 2");
        bytes32 root = keccak256(abi.encodePacked(leaf1, leaf2));
        controller.updateMerkleRoot(root);
        
        bytes32[] memory invalidProof = new bytes32[](0);
        assertFalse(controller.verifyDecision(invalidProof, leaf2), "Empty proof should not verify leaf2");
    }

    function testVerifyDecisionWithWrongProofOrder() public {
        bytes32 leaf1 = keccak256("decision 1");
        bytes32 leaf2 = keccak256("decision 2");
        bytes32 root = keccak256(abi.encodePacked(leaf1, leaf2));
        controller.updateMerkleRoot(root);
        
        bytes32[] memory wrongProof = new bytes32[](1);
        wrongProof[0] = leaf2;
        assertFalse(controller.verifyDecision(wrongProof, leaf2), "Wrong proof should not verify");
    }

    function testVerifyDecisionWithExtraProofElements() public {
        bytes32 leaf1 = keccak256("decision 1");
        bytes32 leaf2 = keccak256("decision 2");
        bytes32 root = keccak256(abi.encodePacked(leaf1, leaf2));
        controller.updateMerkleRoot(root);
        
        bytes32[] memory extraProof = new bytes32[](2);
        extraProof[0] = leaf1;
        extraProof[1] = leaf2;
        assertFalse(controller.verifyDecision(extraProof, leaf2), "Proof with extra elements should not verify");
    }

    function testVerifyDecisionWithTamperedProof() public {
        bytes32 leaf1 = keccak256("decision 1");
        bytes32 leaf2 = keccak256("decision 2");
        bytes32 root = keccak256(abi.encodePacked(leaf1, leaf2));
        controller.updateMerkleRoot(root);
        
        bytes32[] memory tamperedProof = new bytes32[](1);
        tamperedProof[0] = keccak256("tampered");
        assertFalse(controller.verifyDecision(tamperedProof, leaf2), "Tampered proof should not verify");
    }

    function testVerifyDecisionWithDifferentTreeDepth() public {
        bytes32 leaf1 = keccak256("decision 1");
        bytes32 leaf2 = keccak256("decision 2");
        bytes32 leaf3 = keccak256("decision 3");
        bytes32 leaf4 = keccak256("decision 4");
        
        bytes32 node1 = keccak256(abi.encodePacked(leaf1, leaf2));
        bytes32 node2 = keccak256(abi.encodePacked(leaf3, leaf4));
        bytes32 root = keccak256(abi.encodePacked(node1, node2));
        controller.updateMerkleRoot(root);
        
        bytes32[] memory shallowProof = new bytes32[](1);
        shallowProof[0] = leaf2;
        assertFalse(controller.verifyDecision(shallowProof, leaf1), "Shallow proof should not verify");
    }

    function testVerifyDecisionWithRootMismatch() public {
        bytes32 leaf1 = keccak256("decision 1");
        bytes32 leaf2 = keccak256("decision 2");
        bytes32 leaf3 = keccak256("decision 3");
        bytes32 root1 = keccak256(abi.encodePacked(leaf1, leaf2));
        controller.updateMerkleRoot(root1);
        
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = leaf3;
        assertFalse(controller.verifyDecision(proof, leaf1), "Proof from different root should not verify");
    }

    function testVerifyDecisionCorrectProof() public {
        bytes32 leaf1 = keccak256("decision 1");
        bytes32 leaf2 = keccak256("decision 2");
        bytes32 root = keccak256(abi.encodePacked(leaf1, leaf2));
        controller.updateMerkleRoot(root);
        
        bytes32[] memory proof1 = new bytes32[](1);
        proof1[0] = leaf1;
        assertTrue(controller.verifyDecision(proof1, leaf2), "Correct proof should verify");
        
        bytes32[] memory proof2 = new bytes32[](1);
        proof2[0] = leaf2;
        assertTrue(controller.verifyDecision(proof2, leaf1), "Correct proof should verify");
    }
    
    function testVerifyDecisionBeforeRootSet() public {
        bytes32 leaf = keccak256("decision");
        bytes32[] memory proof = new bytes32[](0);
        assertFalse(controller.verifyDecision(proof, leaf));
    }

    function testUpdateAgentSigner() public {
        assertEq(controller.agentSigner(), owner);
        controller.updateAgentSigner(newAgentSigner);
        assertEq(controller.agentSigner(), newAgentSigner);
    }
    
    function testUpdateAgentSignerUnauthorized() public {
        vm.prank(nonOwner);
        vm.expectRevert("Not ENS owner");
        controller.updateAgentSigner(newAgentSigner);
    }
    
    function testUpdateAgentSignerSameAddress() public {
        controller.updateAgentSigner(owner);
        assertEq(controller.agentSigner(), owner);
    }
    
    function testUpdateAgentSignerZeroAddress() public {
        controller.updateAgentSigner(address(0));
        assertEq(controller.agentSigner(), address(0));
    }
    
    function testUpdateAgentSignerMultipleTimes() public {
        controller.updateAgentSigner(address(0x111));
        controller.updateAgentSigner(address(0x222));
        controller.updateAgentSigner(address(0x333));
        assertEq(controller.agentSigner(), address(0x333));
    }

    function testPolicyEnforcement() public {
        vm.expectRevert("Exceeds max allocation");
        controller.enforceAllocation(200 ether, 1000 ether);
    }
    
    function testPolicyEnforcementExactLimit() public {
        controller.enforceAllocation(100 ether, 1000 ether);
    }
    
    function testPolicyEnforcementBelowLimit() public {
        controller.enforceAllocation(50 ether, 1000 ether);
    }
    
    function testPolicyEnforcementZeroAmount() public {
        controller.enforceAllocation(0, 1000 ether);
    }
    
    function testPolicyEnforcementZeroTotal() public {
        vm.expectRevert();
        controller.enforceAllocation(100 ether, 0);
    }

    function testUpdateMaxAllocation() public {
        assertEq(controller.maxAllocationBps(), 1000);
        controller.updateMaxAllocation(2000);
        assertEq(controller.maxAllocationBps(), 2000);
        controller.enforceAllocation(200 ether, 1000 ether);
    }
    
    function testUpdateMaxAllocationTooHigh() public {
        vm.expectRevert("Max 50% allowed");
        controller.updateMaxAllocation(6000);
    }
    
    function testUpdateMaxAllocationUnauthorized() public {
        vm.prank(nonOwner);
        vm.expectRevert("Not owner");
        controller.updateMaxAllocation(2000);
    }
    
    function testUpdateMaxAllocationZero() public {
        controller.updateMaxAllocation(0);
        vm.expectRevert("Exceeds max allocation");
        controller.enforceAllocation(1, 1000 ether);
    }

    function testConstructor() public {
        assertEq(controller.ensNode(), TEST_ENS_NODE);
        assertEq(controller.agentSigner(), owner);
        assertEq(controller.maxAllocationBps(), 1000);
        assertEq(controller.currentMerkleRoot(), bytes32(0));
    }

    function testEvents() public {
        bytes32 newRoot = keccak256("new root");
        vm.expectEmit(true, false, false, true);
        emit MerkleRootUpdated(newRoot);
        controller.updateMerkleRoot(newRoot);
        
        vm.expectEmit(true, false, false, true);
        emit AgentSignerUpdated(newAgentSigner);
        controller.updateAgentSigner(newAgentSigner);
        
        vm.expectEmit(true, false, false, true);
        emit PolicyUpdated(2000);
        controller.updateMaxAllocation(2000);
    }
    
    function testMultipleOperations() public {
        bytes32 root = keccak256("operations root");
        controller.updateMerkleRoot(root);
        controller.updateAgentSigner(newAgentSigner);
        controller.updateMaxAllocation(1500);
        
        assertEq(controller.currentMerkleRoot(), root);
        assertEq(controller.agentSigner(), newAgentSigner);
        assertEq(controller.maxAllocationBps(), 1500);
        controller.enforceAllocation(150 ether, 1000 ether);
    }

    function testNamehash() public {
        string memory domain = "aetherguard.eth";
        bytes memory dnsName = NameCoder.encode(domain);
        bytes32 namecoderHash = NameCoder.namehash(dnsName, 0);
        
        bytes32 ethNode = 0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae;
        bytes32 labelHash = keccak256(bytes("aetherguard"));
        bytes32 manualHash = keccak256(abi.encodePacked(ethNode, labelHash));
        
        assertEq(namecoderHash, manualHash);
    }

    // ================================================================
    // NEW TESTS — verifyAndLogDecision
    // ================================================================

    // Helper: build a single-leaf tree (root = leaf itself, empty proof)
    function _singleLeafSetup(bytes32 leaf) internal {
        controller.updateMerkleRoot(leaf);
    }

    // Helper: build a two-leaf tree, return root
    function _twoLeafRoot(bytes32 leaf1, bytes32 leaf2) internal pure returns (bytes32) {
        if (leaf1 <= leaf2) {
            return keccak256(abi.encodePacked(leaf1, leaf2));
        } else {
            return keccak256(abi.encodePacked(leaf2, leaf1));
        }
    }

    // --- Happy path ---

    function testVerifyAndLogDecision_PassesWithValidProofAndPolicy() public {
        bytes32 leaf = keccak256("buy ETH 8%");
        _singleLeafSetup(leaf);

        bytes32[] memory proof = new bytes32[](0);

        // 8% of 1000 = 80, within 10% max
        bool result = controller.verifyAndLogDecision(proof, leaf, 80 ether, 1000 ether);
        assertTrue(result, "Should pass with valid proof and compliant allocation");
    }

    function testVerifyAndLogDecision_PassesWithZeroAmount() public {
        // Zero amount skips policy check - useful for "hold" decisions
        bytes32 leaf = keccak256("hold - no trade");
        _singleLeafSetup(leaf);

        bytes32[] memory proof = new bytes32[](0);
        bool result = controller.verifyAndLogDecision(proof, leaf, 0, 1000 ether);
        assertTrue(result, "Zero amount should skip policy and pass");
    }

    function testVerifyAndLogDecision_PassesAtExactPolicyLimit() public {
        bytes32 leaf = keccak256("buy ETH exactly 10%");
        _singleLeafSetup(leaf);

        bytes32[] memory proof = new bytes32[](0);
        // exactly 10% of 1000 = 100
        bool result = controller.verifyAndLogDecision(proof, leaf, 100 ether, 1000 ether);
        assertTrue(result, "Exactly at policy limit should pass");
    }

    function testVerifyAndLogDecision_PassesWithMultiLeafProof() public {
        bytes32 leaf1 = keccak256("buy ETH 8%");
        bytes32 leaf2 = keccak256("buy BTC 5%");

        bytes32 root = _twoLeafRoot(leaf1, leaf2);
        controller.updateMerkleRoot(root);

        // Build correct proof for leaf1
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = leaf2;

        bool result = controller.verifyAndLogDecision(proof, leaf1, 80 ether, 1000 ether);
        assertTrue(result, "Should pass with multi-leaf Merkle proof");
    }

    // --- Failing proof ---

    function testVerifyAndLogDecision_FailsWithInvalidProof() public {
        bytes32 leaf = keccak256("buy ETH 8%");
        _singleLeafSetup(leaf);

        bytes32[] memory badProof = new bytes32[](1);
        badProof[0] = keccak256("wrong sibling");

        bool result = controller.verifyAndLogDecision(badProof, leaf, 80 ether, 1000 ether);
        assertFalse(result, "Invalid proof should fail");
    }

    function testVerifyAndLogDecision_FailsWithWrongLeaf() public {
        bytes32 leaf = keccak256("buy ETH 8%");
        _singleLeafSetup(leaf);

        bytes32 wrongLeaf = keccak256("buy DOGE 50%");
        bytes32[] memory proof = new bytes32[](0);

        bool result = controller.verifyAndLogDecision(proof, wrongLeaf, 80 ether, 1000 ether);
        assertFalse(result, "Wrong leaf should fail proof check");
    }

    function testVerifyAndLogDecision_FailsWithNoRootSet() public {
        // Root is zero by default — nothing should verify
        bytes32 leaf = keccak256("buy ETH 8%");
        bytes32[] memory proof = new bytes32[](0);

        bool result = controller.verifyAndLogDecision(proof, leaf, 80 ether, 1000 ether);
        assertFalse(result, "Should fail when no root is set");
    }

    // --- Failing policy ---

    function testVerifyAndLogDecision_FailsWhenPolicyExceeded() public {
        bytes32 leaf = keccak256("buy ETH 20%");
        _singleLeafSetup(leaf);

        bytes32[] memory proof = new bytes32[](0);
        // 20% of 1000 = 200 — exceeds 10% max
        bool result = controller.verifyAndLogDecision(proof, leaf, 200 ether, 1000 ether);
        assertFalse(result, "Should fail when allocation exceeds policy");
    }

    function testVerifyAndLogDecision_FailsBothProofAndPolicy() public {
        bytes32 leaf = keccak256("buy ETH 8%");
        _singleLeafSetup(leaf);

        bytes32 wrongLeaf = keccak256("rug pull 99%");
        bytes32[] memory proof = new bytes32[](0);
        // Wrong leaf AND over policy
        bool result = controller.verifyAndLogDecision(proof, wrongLeaf, 990 ether, 1000 ether);
        assertFalse(result, "Should fail on both proof and policy");
    }

    // --- Event emission ---

    function testVerifyAndLogDecision_EmitsEventOnPass() public {
        bytes32 leaf = keccak256("buy ETH 8%");
        _singleLeafSetup(leaf);
        bytes32[] memory proof = new bytes32[](0);

        vm.expectEmit(true, false, false, false); // only check indexed proposalHash
        emit ProposalVerified(leaf, address(this), block.timestamp, true);

        controller.verifyAndLogDecision(proof, leaf, 80 ether, 1000 ether);
    }

    function testVerifyAndLogDecision_EmitsEventOnFail() public {
        bytes32 leaf = keccak256("buy ETH 8%");
        _singleLeafSetup(leaf);
        bytes32[] memory proof = new bytes32[](0);

        // Valid proof but policy exceeded
        vm.expectEmit(true, false, false, false);
        emit ProposalVerified(leaf, address(this), block.timestamp, false);

        controller.verifyAndLogDecision(proof, leaf, 999 ether, 1000 ether);
    }

    function testVerifyAndLogDecision_EmitsCorrectCaller() public {
        bytes32 leaf = keccak256("buy ETH 8%");
        _singleLeafSetup(leaf);
        bytes32[] memory proof = new bytes32[](0);

        // Call as nonOwner — proof still valid (no ENS gate on this fn), policy fine
        vm.prank(nonOwner);
        vm.expectEmit(true, true, false, false);
        emit ProposalVerified(leaf, nonOwner, block.timestamp, true);

        controller.verifyAndLogDecision(proof, leaf, 80 ether, 1000 ether);
    }

    // --- State doesn't change ---

    function testVerifyAndLogDecision_DoesNotChangeMerkleRoot() public {
        bytes32 leaf = keccak256("buy ETH 8%");
        _singleLeafSetup(leaf);
        bytes32 rootBefore = controller.currentMerkleRoot();

        bytes32[] memory proof = new bytes32[](0);
        controller.verifyAndLogDecision(proof, leaf, 80 ether, 1000 ether);

        assertEq(controller.currentMerkleRoot(), rootBefore, "Root must not change after verification");
    }

    function testVerifyAndLogDecision_DoesNotChangePolicy() public {
        bytes32 leaf = keccak256("buy ETH 8%");
        _singleLeafSetup(leaf);
        uint256 policyBefore = controller.maxAllocationBps();

        bytes32[] memory proof = new bytes32[](0);
        controller.verifyAndLogDecision(proof, leaf, 80 ether, 1000 ether);

        assertEq(controller.maxAllocationBps(), policyBefore, "Policy must not change after verification");
    }

    // --- Sequential decisions (the real AetherGuard flow) ---

    function testVerifyAndLogDecision_MultipleSequentialDecisions() public {
        // Simulate 3 consecutive AI proposals being verified
        bytes32 leaf1 = keccak256("buy ETH 8%");
        bytes32 leaf2 = keccak256("buy BTC 5%");
        bytes32 leaf3 = keccak256("sell USDC 3%");

        // Decision 1
        _singleLeafSetup(leaf1);
        bytes32[] memory proof = new bytes32[](0);
        assertTrue(controller.verifyAndLogDecision(proof, leaf1, 80 ether, 1000 ether));

        // Decision 2 — root updated for new proposal
        _singleLeafSetup(leaf2);
        assertTrue(controller.verifyAndLogDecision(proof, leaf2, 50 ether, 1000 ether));

        // Decision 3
        _singleLeafSetup(leaf3);
        assertTrue(controller.verifyAndLogDecision(proof, leaf3, 30 ether, 1000 ether));
    }

    function testVerifyAndLogDecision_RejectedThenApproved() public {
        // Claude proposes something risky, user rejects, Claude proposes compliant one
        bytes32 riskyLeaf = keccak256("buy DOGE 40%");
        bytes32 safeLeaf = keccak256("buy ETH 8%");

        _singleLeafSetup(riskyLeaf);
        bytes32[] memory proof = new bytes32[](0);

        // Risky proposal fails policy
        bool risky = controller.verifyAndLogDecision(proof, riskyLeaf, 400 ether, 1000 ether);
        assertFalse(risky, "Risky proposal should fail");

        // Safe proposal passes
        _singleLeafSetup(safeLeaf);
        bool safe = controller.verifyAndLogDecision(proof, safeLeaf, 80 ether, 1000 ether);
        assertTrue(safe, "Safe proposal should pass");
    }

    function testVerifyAndLogDecision_AnyoneCanCallVerify() public {
        // verifyAndLogDecision has no ENS gate — any address can submit a proof
        // (ENS gate is only on updateMerkleRoot and updateAgentSigner)
        bytes32 leaf = keccak256("buy ETH 8%");
        _singleLeafSetup(leaf);
        bytes32[] memory proof = new bytes32[](0);

        vm.prank(nonOwner);
        bool result = controller.verifyAndLogDecision(proof, leaf, 80 ether, 1000 ether);
        assertTrue(result, "Any caller can submit a valid proof");
    }

    function testVerifyAndLogDecision_PolicyUpdateAffectsVerification() public {
        bytes32 leaf = keccak256("buy ETH 15%");
        _singleLeafSetup(leaf);
        bytes32[] memory proof = new bytes32[](0);

        // 15% fails at default 10% max
        bool before = controller.verifyAndLogDecision(proof, leaf, 150 ether, 1000 ether);
        assertFalse(before, "Should fail at 10% max");

        // Update policy to 20%
        controller.updateMaxAllocation(2000);

        // 15% now passes
        bool resultAfter = controller.verifyAndLogDecision(proof, leaf, 150 ether, 1000 ether);
        assertTrue(resultAfter, "Should pass after policy updated to 20%");
    }
}