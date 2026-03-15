// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AetherGuardController} from "./AetherGuardController.sol";

contract AetherGuardFactory {
    event AgentDeployed(
        address indexed owner,
        address indexed agentAddress,
        bytes32 ensNode
    );

    mapping(address => address) public userAgent;

    function deployAgent(bytes32 ensNode) external returns (address) {
        require(userAgent[msg.sender] == address(0), "Agent already exists");

        AetherGuardController agent = new AetherGuardController(
            ensNode,
            msg.sender
        );

        userAgent[msg.sender] = address(agent);

        emit AgentDeployed(msg.sender, address(agent), ensNode);

        return address(agent);
    }

    function getAgent(address user) external view returns (address) {
        return userAgent[user];
    }

    function hasAgent(address user) external view returns (bool) {
        return userAgent[user] != address(0);
    }
}
