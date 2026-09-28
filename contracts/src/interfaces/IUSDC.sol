// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IUSDC — Minimal ERC-20 interface for USDC
/// @notice Used by Invoice and PaymentRouter to handle USDC transfers
interface IUSDC {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}
