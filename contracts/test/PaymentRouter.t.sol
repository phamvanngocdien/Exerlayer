// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {Invoice} from "../src/Invoice.sol";
import {PaymentRouter} from "../src/PaymentRouter.sol";
import {ComplianceRules} from "../src/ComplianceRules.sol";

/// @title MockUSDC for PaymentRouter tests
contract MockUSDC {
    uint8 public decimals = 6;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient");
        require(allowance[from][msg.sender] >= amount, "No allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @title PaymentRouterTest — Tests for PaymentRouter
contract PaymentRouterTest is Test {
    Invoice public invoiceContract;
    PaymentRouter public router;
    ComplianceRules public compliance;
    MockUSDC public usdc;

    address public deployer = address(this);
    address public creator = address(0x1);
    address public payer = address(0x2);
    address public agent = address(0x3);
    address public blacklisted = address(0x4);

    uint256 constant AMOUNT = 500 * 1e6; // 500 USDC
    uint256 constant DUE_DATE_OFFSET = 30 days;

    function setUp() public {
        usdc = new MockUSDC();
        compliance = new ComplianceRules();
        invoiceContract = new Invoice(address(usdc));
        router = new PaymentRouter(address(invoiceContract), address(compliance), address(usdc));

        // Link router to invoice contract
        invoiceContract.setPaymentRouter(address(router));

        // Fund payer
        usdc.mint(payer, 100_000 * 1e6);

        // Fund agent
        usdc.mint(agent, 50_000 * 1e6);

        // Authorize agent
        router.setAuthorizedAgent(agent, true);
    }

    // ─── Route Payment ───────────────────────────────────────────────

    function test_RoutePayment() public {
        // Create invoice (open payer)
        vm.prank(creator);
        invoiceContract.createInvoice(
            address(0), AMOUNT, block.timestamp + DUE_DATE_OFFSET, "Router test", bytes32(0)
        );

        // Payer approves router, then routes payment
        vm.startPrank(payer);
        usdc.approve(address(router), AMOUNT);
        router.routePayment(0);
        vm.stopPrank();

        Invoice.InvoiceData memory inv = invoiceContract.getInvoice(0);
        assertEq(uint256(inv.status), uint256(Invoice.InvoiceStatus.Paid));
        assertEq(usdc.balanceOf(creator), AMOUNT);
    }

    // ─── Compliance Blocking ─────────────────────────────────────────

    function test_RoutePayment_BlockedByBlacklist() public {
        vm.prank(creator);
        invoiceContract.createInvoice(
            address(0), AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0)
        );

        // Blacklist the payer
        compliance.setBlacklist(blacklisted, true);

        usdc.mint(blacklisted, AMOUNT);
        vm.startPrank(blacklisted);
        usdc.approve(address(router), AMOUNT);
        vm.expectRevert(PaymentRouter.ComplianceFailed.selector);
        router.routePayment(0);
        vm.stopPrank();
    }

    function test_RoutePayment_BlockedByThreshold() public {
        // Set threshold to 100 USDC
        compliance.setThreshold(100 * 1e6);

        vm.prank(creator);
        invoiceContract.createInvoice(
            address(0), AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0)
        );

        // Payer is not whitelisted, amount > threshold
        vm.startPrank(payer);
        usdc.approve(address(router), AMOUNT);
        vm.expectRevert(PaymentRouter.ComplianceFailed.selector);
        router.routePayment(0);
        vm.stopPrank();
    }

    function test_RoutePayment_WhitelistedPassesThreshold() public {
        compliance.setThreshold(100 * 1e6);
        compliance.setWhitelist(payer, true);

        vm.prank(creator);
        invoiceContract.createInvoice(
            address(0), AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0)
        );

        vm.startPrank(payer);
        usdc.approve(address(router), AMOUNT);
        router.routePayment(0);
        vm.stopPrank();

        Invoice.InvoiceData memory inv = invoiceContract.getInvoice(0);
        assertEq(uint256(inv.status), uint256(Invoice.InvoiceStatus.Paid));
    }

    // ─── Batch Payment ───────────────────────────────────────────────

    function test_RouteBatchPayment() public {
        // Create 3 invoices
        vm.startPrank(creator);
        invoiceContract.createInvoice(
            address(0), 100 * 1e6, block.timestamp + DUE_DATE_OFFSET, "Inv 1", bytes32(0)
        );
        invoiceContract.createInvoice(
            address(0), 200 * 1e6, block.timestamp + DUE_DATE_OFFSET, "Inv 2", bytes32(0)
        );
        invoiceContract.createInvoice(
            address(0), 300 * 1e6, block.timestamp + DUE_DATE_OFFSET, "Inv 3", bytes32(0)
        );
        vm.stopPrank();

        uint256 totalAmount = 600 * 1e6;

        uint256[] memory ids = new uint256[](3);
        ids[0] = 0;
        ids[1] = 1;
        ids[2] = 2;

        vm.startPrank(payer);
        usdc.approve(address(router), totalAmount);
        router.routeBatchPayment(ids);
        vm.stopPrank();

        // All invoices should be paid
        for (uint256 i = 0; i < 3; i++) {
            Invoice.InvoiceData memory inv = invoiceContract.getInvoice(i);
            assertEq(uint256(inv.status), uint256(Invoice.InvoiceStatus.Paid));
        }
        assertEq(usdc.balanceOf(creator), totalAmount);
    }

    function test_RevertWhen_RouteBatchPayment_Empty() public {
        uint256[] memory ids = new uint256[](0);
        vm.expectRevert(PaymentRouter.EmptyBatch.selector);
        router.routeBatchPayment(ids);
    }

    // ─── Agent Payment (Agentic Economy) ─────────────────────────────

    function test_AgentPayInvoice() public {
        vm.prank(creator);
        invoiceContract.createInvoice(
            address(0), AMOUNT, block.timestamp + DUE_DATE_OFFSET, "Agent pay", bytes32(0)
        );

        // Agent autonomously pays
        vm.startPrank(agent);
        usdc.approve(address(router), AMOUNT);
        router.agentPayInvoice(0);
        vm.stopPrank();

        Invoice.InvoiceData memory inv = invoiceContract.getInvoice(0);
        assertEq(uint256(inv.status), uint256(Invoice.InvoiceStatus.Paid));
        assertEq(usdc.balanceOf(creator), AMOUNT);
    }

    function test_RevertWhen_AgentPayInvoice_NotAuthorized() public {
        vm.prank(creator);
        invoiceContract.createInvoice(
            address(0), AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0)
        );

        address fakeAgent = address(0x99);
        usdc.mint(fakeAgent, AMOUNT);
        vm.startPrank(fakeAgent);
        usdc.approve(address(router), AMOUNT);
        vm.expectRevert(PaymentRouter.Unauthorized.selector);
        router.agentPayInvoice(0);
        vm.stopPrank();
    }

    function test_AgentPayInvoice_StillChecksCompliance() public {
        vm.prank(creator);
        invoiceContract.createInvoice(
            address(0), AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0)
        );

        // Blacklist the agent
        compliance.setBlacklist(agent, true);

        vm.startPrank(agent);
        usdc.approve(address(router), AMOUNT);
        vm.expectRevert(PaymentRouter.ComplianceFailed.selector);
        router.agentPayInvoice(0);
        vm.stopPrank();
    }

    // ─── Admin ───────────────────────────────────────────────────────

    function test_SetAuthorizedAgent() public {
        address newAgent = address(0x10);
        router.setAuthorizedAgent(newAgent, true);
        assertTrue(router.authorizedAgents(newAgent));

        router.setAuthorizedAgent(newAgent, false);
        assertFalse(router.authorizedAgents(newAgent));
    }

    function test_RevertWhen_SetAuthorizedAgent_NotOwner() public {
        vm.prank(payer);
        vm.expectRevert(PaymentRouter.Unauthorized.selector);
        router.setAuthorizedAgent(address(0x10), true);
    }
}
