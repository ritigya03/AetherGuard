// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/AetherGuardFactory.sol";
import "../src/AetherGuardController.sol";

contract AetherGuardFactoryTest is Test {
    AetherGuardFactory factory;

    address user1 = address(0x111);
    address user2 = address(0x222);
    address user3 = address(0x333);

    bytes32 ensNode1 = keccak256("user1.eth");
    bytes32 ensNode2 = keccak256("user2.eth");
    bytes32 ensNode3 = keccak256("user3.eth");

    event AgentDeployed(
        address indexed owner,
        address indexed agentAddress,
        bytes32 ensNode
    );

    function setUp() public {
        factory = new AetherGuardFactory();
    }

    // ================================================================
    // deployAgent
    // ================================================================

    function testDeployAgent_Succeeds() public {
        vm.prank(user1);
        address agent = factory.deployAgent(ensNode1);

        assertTrue(agent != address(0), "Agent address should not be zero");
    }

    function testDeployAgent_StoresUserAgent() public {
        vm.prank(user1);
        address agent = factory.deployAgent(ensNode1);

        assertEq(factory.userAgent(user1), agent, "userAgent mapping should store agent");
    }

    function testDeployAgent_SetsCorrectENSNode() public {
        vm.prank(user1);
        address agentAddr = factory.deployAgent(ensNode1);

        AetherGuardController agent = AetherGuardController(agentAddr);
        assertEq(agent.ensNode(), ensNode1, "Agent should have correct ENS node");
    }

    function testDeployAgent_SetsCallerAsAgentSigner() public {
        vm.prank(user1);
        address agentAddr = factory.deployAgent(ensNode1);

        AetherGuardController agent = AetherGuardController(agentAddr);
        assertEq(agent.agentSigner(), user1, "Agent signer should be the deploying user");
    }

    function testDeployAgent_EmitsEvent() public {
        vm.prank(user1);

        vm.expectEmit(true, false, false, true);
        emit AgentDeployed(user1, address(0), ensNode1);

        factory.deployAgent(ensNode1);
    }

    function testDeployAgent_RevertsIfAlreadyExists() public {
        vm.prank(user1);
        factory.deployAgent(ensNode1);

        vm.prank(user1);
        vm.expectRevert("Agent already exists");
        factory.deployAgent(ensNode1);
    }

    function testDeployAgent_DifferentUsersGetDifferentAgents() public {
        vm.prank(user1);
        address agent1 = factory.deployAgent(ensNode1);

        vm.prank(user2);
        address agent2 = factory.deployAgent(ensNode2);

        assertTrue(agent1 != agent2, "Different users should get different agents");
    }

    function testDeployAgent_MultipleUsersCanDeploy() public {
        vm.prank(user1);
        address agent1 = factory.deployAgent(ensNode1);

        vm.prank(user2);
        address agent2 = factory.deployAgent(ensNode2);

        vm.prank(user3);
        address agent3 = factory.deployAgent(ensNode3);

        assertEq(factory.userAgent(user1), agent1);
        assertEq(factory.userAgent(user2), agent2);
        assertEq(factory.userAgent(user3), agent3);
    }

    function testDeployAgent_SameENSNodeDifferentUsers() public {
        // Two users can use same ENS node (edge case)
        vm.prank(user1);
        address agent1 = factory.deployAgent(ensNode1);

        vm.prank(user2);
        address agent2 = factory.deployAgent(ensNode1);

        assertTrue(agent1 != agent2, "Should deploy separate contracts");
    }

    // ================================================================
    // getAgent
    // ================================================================

    function testGetAgent_ReturnsZeroIfNoAgent() public {
        address agent = factory.getAgent(user1);
        assertEq(agent, address(0), "Should return zero for user with no agent");
    }

    function testGetAgent_ReturnsCorrectAgent() public {
        vm.prank(user1);
        address deployed = factory.deployAgent(ensNode1);

        address fetched = factory.getAgent(user1);
        assertEq(fetched, deployed, "getAgent should return the deployed address");
    }

    function testGetAgent_DoesNotCrossUsers() public {
        vm.prank(user1);
        factory.deployAgent(ensNode1);

        // user2 has no agent
        assertEq(factory.getAgent(user2), address(0));
    }

    // ================================================================
    // hasAgent
    // ================================================================

    function testHasAgent_FalseBeforeDeploy() public {
        assertFalse(factory.hasAgent(user1), "Should be false before deploy");
    }

    function testHasAgent_TrueAfterDeploy() public {
        vm.prank(user1);
        factory.deployAgent(ensNode1);

        assertTrue(factory.hasAgent(user1), "Should be true after deploy");
    }

    function testHasAgent_DoesNotCrossUsers() public {
        vm.prank(user1);
        factory.deployAgent(ensNode1);

        assertFalse(factory.hasAgent(user2), "user2 should not have agent");
        assertFalse(factory.hasAgent(user3), "user3 should not have agent");
    }

    // ================================================================
    // Deployed agent functionality
    // ================================================================

    function testDeployedAgent_HasZeroMerkleRoot() public {
        vm.prank(user1);
        address agentAddr = factory.deployAgent(ensNode1);

        AetherGuardController agent = AetherGuardController(agentAddr);
        assertEq(agent.currentMerkleRoot(), bytes32(0), "Initial merkle root should be zero");
    }

    function testDeployedAgent_HasCorrectMaxAllocation() public {
        vm.prank(user1);
        address agentAddr = factory.deployAgent(ensNode1);

        AetherGuardController agent = AetherGuardController(agentAddr);
        assertEq(agent.maxAllocationBps(), 1000, "Default max allocation should be 10%");
    }

    function testDeployedAgent_AgentSignerCanUpdateMerkleRoot() public {
        // Mock ENS registry to return user1 as owner
        vm.mockCall(
            0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e,
            abi.encodeWithSelector(IENSRegistry.owner.selector, ensNode1),
            abi.encode(user1)
        );

        vm.prank(user1);
        address agentAddr = factory.deployAgent(ensNode1);
        AetherGuardController agent = AetherGuardController(agentAddr);

        bytes32 newRoot = keccak256("my strategy root");
        vm.prank(user1);
        agent.updateMerkleRoot(newRoot);

        assertEq(agent.currentMerkleRoot(), newRoot);
    }

    function testDeployedAgent_OtherUserCannotUpdateMerkleRoot() public {
        // Mock ENS registry to return user1 as owner
        vm.mockCall(
            0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e,
            abi.encodeWithSelector(IENSRegistry.owner.selector, ensNode1),
            abi.encode(user1)
        );

        vm.prank(user1);
        address agentAddr = factory.deployAgent(ensNode1);
        AetherGuardController agent = AetherGuardController(agentAddr);

        vm.prank(user2);
        vm.expectRevert("Not authorized");
        agent.updateMerkleRoot(keccak256("hack attempt"));
    }

    function testDeployedAgent_IsolatedBetweenUsers() public {
        vm.mockCall(
            0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e,
            abi.encodeWithSelector(IENSRegistry.owner.selector, ensNode1),
            abi.encode(user1)
        );
        vm.mockCall(
            0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e,
            abi.encodeWithSelector(IENSRegistry.owner.selector, ensNode2),
            abi.encode(user2)
        );

        vm.prank(user1);
        address agentAddr1 = factory.deployAgent(ensNode1);

        vm.prank(user2);
        address agentAddr2 = factory.deployAgent(ensNode2);

        AetherGuardController agent1 = AetherGuardController(agentAddr1);
        AetherGuardController agent2 = AetherGuardController(agentAddr2);

        // user1 updates their root
        bytes32 root1 = keccak256("user1 strategy");
        vm.prank(user1);
        agent1.updateMerkleRoot(root1);

        // user2 root should be unaffected
        assertEq(agent1.currentMerkleRoot(), root1);
        assertEq(agent2.currentMerkleRoot(), bytes32(0), "user2 root should still be zero");
    }

    // ================================================================
    // Gas and edge cases
    // ================================================================

    function testDeployAgent_ZeroENSNode() public {
        vm.prank(user1);
        address agent = factory.deployAgent(bytes32(0));
        assertTrue(agent != address(0), "Should deploy even with zero ENS node");
    }

    function testFactory_MultipleDeploysDoNotInterfere() public {
        // Deploy 5 agents and verify all are independent
        address[5] memory users = [
            address(0xA1), address(0xA2), address(0xA3), address(0xA4), address(0xA5)
        ];
        bytes32[5] memory nodes = [
            keccak256("a1.eth"), keccak256("a2.eth"), keccak256("a3.eth"),
            keccak256("a4.eth"), keccak256("a5.eth")
        ];

        address[5] memory agents;
        for (uint i = 0; i < 5; i++) {
            vm.prank(users[i]);
            agents[i] = factory.deployAgent(nodes[i]);
        }

        // Verify all stored correctly
        for (uint i = 0; i < 5; i++) {
            assertEq(factory.getAgent(users[i]), agents[i]);
            assertTrue(factory.hasAgent(users[i]));
        }

        // Verify all unique
        for (uint i = 0; i < 5; i++) {
            for (uint j = i + 1; j < 5; j++) {
                assertTrue(agents[i] != agents[j], "All agents should be unique");
            }
        }
    }
}
