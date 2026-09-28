// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ICCTP — Interface for Circle CCTP V2 TokenMessengerV2
/// @notice Stubbed for Phase 2 cross-chain USDC transfers (burn-and-mint)
/// @dev On-chain call only, no API key needed. Free (gas only).
interface ICCTP {
    /// @notice Burn USDC on source chain for minting on destination chain
    /// @param amount Amount of USDC to burn (6 decimals)
    /// @param destinationDomain CCTP domain ID of the destination chain
    /// @param mintRecipient Address (bytes32) to receive minted USDC on destination
    /// @param burnToken Address of USDC token to burn on source chain
    /// @return nonce Unique nonce for the burn message
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64 nonce);
}
