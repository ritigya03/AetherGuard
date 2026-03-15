// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract MockPolicyEnforcer {
    address public immutable owner;

    // Layer 1 — Hardcoded constitution. NOBODY can change this. Ever.
    uint256 public constant ABSOLUTE_MAX_BPS = 5000; // 50% — immutable forever

    // Layer 2 — User configurable limit (default 10%)
    uint256 public maxAllocationBps = 5000;

    event PolicyUpdated(uint256 newMaxBps);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function enforceAllocation(uint256 proposedAmount, uint256 totalPortfolioValue) external view {
        require(totalPortfolioValue > 0, "Zero portfolio value");
        require(
            proposedAmount * 10000 <= totalPortfolioValue * ABSOLUTE_MAX_BPS,
            "L1: Exceeds absolute 50% limit"
        );
        require(
            proposedAmount * 10000 <= totalPortfolioValue * maxAllocationBps,
            "Exceeds max allocation"
        );
    }

    function updateMaxAllocation(uint256 newMaxBps) external onlyOwner {
        require(newMaxBps <= ABSOLUTE_MAX_BPS, "Max 50% allowed");
        maxAllocationBps = newMaxBps;
        emit PolicyUpdated(newMaxBps);
    }
}