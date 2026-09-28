// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ComplianceRules — On-chain compliance checks for invoice payments
/// @notice Replaces Circle Trust Engine (paid) with custom on-chain logic (free)
/// @dev Whitelist/blacklist + threshold checks, configurable by owner
contract ComplianceRules {
    // ─── State ───────────────────────────────────────────────────────
    address public owner;

    /// @notice Addresses explicitly allowed for large payments
    mapping(address => bool) public whitelist;

    /// @notice Addresses blocked from all payments
    mapping(address => bool) public blacklist;

    /// @notice Payment amount threshold above which whitelist is required
    /// @dev Set to type(uint256).max to effectively disable threshold checks
    uint256 public largePaymentThreshold;

    // ─── Events ──────────────────────────────────────────────────────
    event WhitelistUpdated(address indexed addr, bool status);
    event BlacklistUpdated(address indexed addr, bool status);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    // ─── Errors ──────────────────────────────────────────────────────
    error Unauthorized();

    // ─── Modifiers ───────────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
        // Default: no threshold (all payments pass)
        largePaymentThreshold = type(uint256).max;
    }

    // ─── Core Check ──────────────────────────────────────────────────

    /// @notice Check if a payment is allowed
    /// @param payer The address attempting to pay
    /// @param amount The USDC amount being paid
    /// @return allowed True if the payment passes all compliance checks
    function prePaymentCheck(address payer, uint256 amount) external view returns (bool allowed) {
        // Rule 1: Blacklisted addresses are always blocked
        if (blacklist[payer]) {
            return false;
        }

        // Rule 2: Large payments require whitelist
        if (amount >= largePaymentThreshold) {
            return whitelist[payer];
        }

        // Rule 3: All other payments are allowed
        return true;
    }

    // ─── Admin Functions ─────────────────────────────────────────────

    /// @notice Add or remove an address from the whitelist
    function setWhitelist(address addr, bool status) external onlyOwner {
        whitelist[addr] = status;
        emit WhitelistUpdated(addr, status);
    }

    /// @notice Add or remove an address from the blacklist
    function setBlacklist(address addr, bool status) external onlyOwner {
        blacklist[addr] = status;
        emit BlacklistUpdated(addr, status);
    }

    /// @notice Update the large payment threshold
    /// @param amount New threshold in USDC (6 decimals). Use type(uint256).max to disable.
    function setThreshold(uint256 amount) external onlyOwner {
        uint256 old = largePaymentThreshold;
        largePaymentThreshold = amount;
        emit ThresholdUpdated(old, amount);
    }

    /// @notice Batch update whitelist
    function batchSetWhitelist(address[] calldata addrs, bool status) external onlyOwner {
        for (uint256 i = 0; i < addrs.length; i++) {
            whitelist[addrs[i]] = status;
            emit WhitelistUpdated(addrs[i], status);
        }
    }

    /// @notice Batch update blacklist
    function batchSetBlacklist(address[] calldata addrs, bool status) external onlyOwner {
        for (uint256 i = 0; i < addrs.length; i++) {
            blacklist[addrs[i]] = status;
            emit BlacklistUpdated(addrs[i], status);
        }
    }

    /// @notice Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
