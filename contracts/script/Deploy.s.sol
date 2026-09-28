// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {Invoice} from "../src/Invoice.sol";
import {PaymentRouter} from "../src/PaymentRouter.sol";
import {ComplianceRules} from "../src/ComplianceRules.sol";

/// @title Deploy — Foundry deployment script for Arc Testnet
/// @notice Deploys ComplianceRules → Invoice → PaymentRouter, then links them
contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdcAddress = vm.envAddress("USDC_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ComplianceRules
        ComplianceRules compliance = new ComplianceRules();
        console.log("ComplianceRules deployed at:", address(compliance));

        // 2. Deploy Invoice
        Invoice invoice = new Invoice(usdcAddress);
        console.log("Invoice deployed at:", address(invoice));

        // 3. Deploy PaymentRouter
        PaymentRouter router = new PaymentRouter(
            address(invoice),
            address(compliance),
            usdcAddress
        );
        console.log("PaymentRouter deployed at:", address(router));

        // 4. Link router to invoice contract
        invoice.setPaymentRouter(address(router));
        console.log("PaymentRouter linked to Invoice");

        vm.stopBroadcast();

        // Output summary
        console.log("\n=== Deployment Summary ===");
        console.log("Network: Arc Testnet (Chain ID 5042002)");
        console.log("USDC:", usdcAddress);
        console.log("ComplianceRules:", address(compliance));
        console.log("Invoice:", address(invoice));
        console.log("PaymentRouter:", address(router));
    }
}
