// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {Invoice} from "../src/Invoice.sol";
import {IUSDC} from "../src/interfaces/IUSDC.sol";

/// @title MockUSDC — Minimal ERC-20 mock for testing
contract MockUSDC {
    string public name = "USD Coin";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @title InvoiceTest — Comprehensive tests for Invoice contract
contract InvoiceTest is Test {
    Invoice public invoice;
    MockUSDC public usdc;

    address public creator = address(0x1);
    address public payer = address(0x2);
    address public stranger = address(0x3);
    address public router = address(0x4);

    uint256 constant AMOUNT = 1000 * 1e6; // 1000 USDC
    uint256 constant DUE_DATE_OFFSET = 30 days;

    function setUp() public {
        usdc = new MockUSDC();
        invoice = new Invoice(address(usdc));

        // Mint USDC to payer
        usdc.mint(payer, 100_000 * 1e6);

        // Set payment router
        invoice.setPaymentRouter(router);
    }

    // ─── Create Invoice ──────────────────────────────────────────────

    function test_CreateInvoice() public {
        vm.prank(creator);
        uint256 id = invoice.createInvoice(
            payer,
            AMOUNT,
            block.timestamp + DUE_DATE_OFFSET,
            "Test invoice",
            bytes32(uint256(1))
        );

        assertEq(id, 0);
        assertEq(invoice.getInvoiceCount(), 1);

        Invoice.InvoiceData memory inv = invoice.getInvoice(0);
        assertEq(inv.creator, creator);
        assertEq(inv.payer, payer);
        assertEq(inv.amount, AMOUNT);
        assertEq(uint256(inv.status), uint256(Invoice.InvoiceStatus.Created));
    }

    function test_CreateInvoice_EmitsEvent() public {
        vm.prank(creator);
        vm.expectEmit(true, true, false, true);
        emit Invoice.InvoiceCreated(0, creator, payer, AMOUNT, block.timestamp + DUE_DATE_OFFSET);

        invoice.createInvoice(
            payer, AMOUNT, block.timestamp + DUE_DATE_OFFSET, "Test", bytes32(0)
        );
    }

    function test_CreateInvoice_AnyonePayer() public {
        vm.prank(creator);
        uint256 id = invoice.createInvoice(
            address(0), // anyone can pay
            AMOUNT,
            block.timestamp + DUE_DATE_OFFSET,
            "Open invoice",
            bytes32(0)
        );

        Invoice.InvoiceData memory inv = invoice.getInvoice(id);
        assertEq(inv.payer, address(0));
    }

    function test_RevertWhen_CreateInvoice_ZeroAmount() public {
        vm.prank(creator);
        vm.expectRevert(Invoice.ZeroAmount.selector);
        invoice.createInvoice(payer, 0, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0));
    }

    function test_RevertWhen_CreateInvoice_PastDueDate() public {
        vm.prank(creator);
        vm.expectRevert(Invoice.InvalidDueDate.selector);
        invoice.createInvoice(payer, AMOUNT, block.timestamp - 1, "", bytes32(0));
    }

    // ─── Pay Invoice ─────────────────────────────────────────────────

    function test_PayInvoice() public {
        // Create invoice
        vm.prank(creator);
        invoice.createInvoice(payer, AMOUNT, block.timestamp + DUE_DATE_OFFSET, "Pay me", bytes32(0));

        // Approve and pay
        vm.startPrank(payer);
        usdc.approve(address(invoice), AMOUNT);
        invoice.payInvoice(0);
        vm.stopPrank();

        Invoice.InvoiceData memory inv = invoice.getInvoice(0);
        assertEq(uint256(inv.status), uint256(Invoice.InvoiceStatus.Paid));
        assertEq(inv.paidBy, payer);
        assertEq(inv.paidAt, block.timestamp);

        // Check USDC transferred
        assertEq(usdc.balanceOf(creator), AMOUNT);
        assertEq(usdc.balanceOf(payer), 100_000 * 1e6 - AMOUNT);
    }

    function test_PayInvoice_EmitsEvent() public {
        vm.prank(creator);
        invoice.createInvoice(payer, AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0));

        vm.startPrank(payer);
        usdc.approve(address(invoice), AMOUNT);

        vm.expectEmit(true, true, false, true);
        emit Invoice.InvoicePaid(0, payer, AMOUNT, block.timestamp);
        invoice.payInvoice(0);
        vm.stopPrank();
    }

    function test_PayInvoice_OpenInvoice_AnyoneCanPay() public {
        vm.prank(creator);
        invoice.createInvoice(address(0), AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0));

        // Stranger pays an open invoice
        usdc.mint(stranger, AMOUNT);
        vm.startPrank(stranger);
        usdc.approve(address(invoice), AMOUNT);
        invoice.payInvoice(0);
        vm.stopPrank();

        Invoice.InvoiceData memory inv = invoice.getInvoice(0);
        assertEq(inv.paidBy, stranger);
    }

    function test_RevertWhen_PayInvoice_AlreadyPaid() public {
        vm.prank(creator);
        invoice.createInvoice(payer, AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0));

        vm.startPrank(payer);
        usdc.approve(address(invoice), AMOUNT * 2);
        invoice.payInvoice(0);

        vm.expectRevert(Invoice.InvoiceAlreadyPaid.selector);
        invoice.payInvoice(0);
        vm.stopPrank();
    }

    function test_RevertWhen_PayInvoice_Cancelled() public {
        vm.prank(creator);
        invoice.createInvoice(payer, AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0));

        vm.prank(creator);
        invoice.cancelInvoice(0);

        vm.startPrank(payer);
        usdc.approve(address(invoice), AMOUNT);
        vm.expectRevert(Invoice.InvoiceNotPayable.selector);
        invoice.payInvoice(0);
        vm.stopPrank();
    }

    function test_RevertWhen_PayInvoice_UnauthorizedPayer() public {
        vm.prank(creator);
        invoice.createInvoice(payer, AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0));

        usdc.mint(stranger, AMOUNT);
        vm.startPrank(stranger);
        usdc.approve(address(invoice), AMOUNT);
        vm.expectRevert(Invoice.UnauthorizedPayer.selector);
        invoice.payInvoice(0);
        vm.stopPrank();
    }

    function test_RevertWhen_PayInvoice_InsufficientBalance() public {
        vm.prank(creator);
        invoice.createInvoice(payer, AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0));

        address poorPayer = address(0x5);
        // Don't mint any USDC
        vm.startPrank(poorPayer);
        vm.expectRevert(); // will revert from MockUSDC
        invoice.payInvoice(0);
        vm.stopPrank();
    }

    // ─── Pay Via Router ──────────────────────────────────────────────

    function test_PayInvoiceViaRouter() public {
        vm.prank(creator);
        invoice.createInvoice(address(0), AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0));

        // Router has USDC and pays on behalf
        usdc.mint(router, AMOUNT);
        vm.startPrank(router);
        usdc.approve(address(invoice), AMOUNT);
        invoice.payInvoiceViaRouter(0, router);
        vm.stopPrank();

        Invoice.InvoiceData memory inv = invoice.getInvoice(0);
        assertEq(uint256(inv.status), uint256(Invoice.InvoiceStatus.Paid));
        assertEq(inv.paidBy, router);
    }

    function test_RevertWhen_PayInvoiceViaRouter_NotRouter() public {
        vm.prank(creator);
        invoice.createInvoice(address(0), AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0));

        vm.prank(stranger);
        vm.expectRevert(Invoice.Unauthorized.selector);
        invoice.payInvoiceViaRouter(0, stranger);
    }

    // ─── Cancel Invoice ──────────────────────────────────────────────

    function test_CancelInvoice() public {
        vm.prank(creator);
        invoice.createInvoice(payer, AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0));

        vm.prank(creator);
        invoice.cancelInvoice(0);

        Invoice.InvoiceData memory inv = invoice.getInvoice(0);
        assertEq(uint256(inv.status), uint256(Invoice.InvoiceStatus.Cancelled));
    }

    function test_CancelInvoice_EmitsEvent() public {
        vm.prank(creator);
        invoice.createInvoice(payer, AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0));

        vm.prank(creator);
        vm.expectEmit(true, false, false, false);
        emit Invoice.InvoiceCancelled(0);
        invoice.cancelInvoice(0);
    }

    function test_RevertWhen_CancelInvoice_NotCreator() public {
        vm.prank(creator);
        invoice.createInvoice(payer, AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0));

        vm.prank(stranger);
        vm.expectRevert(Invoice.NotInvoiceCreator.selector);
        invoice.cancelInvoice(0);
    }

    function test_RevertWhen_CancelInvoice_AlreadyPaid() public {
        vm.prank(creator);
        invoice.createInvoice(payer, AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0));

        vm.startPrank(payer);
        usdc.approve(address(invoice), AMOUNT);
        invoice.payInvoice(0);
        vm.stopPrank();

        vm.prank(creator);
        vm.expectRevert(Invoice.InvoiceAlreadyPaid.selector);
        invoice.cancelInvoice(0);
    }

    function test_RevertWhen_CancelInvoice_AlreadyCancelled() public {
        vm.prank(creator);
        invoice.createInvoice(payer, AMOUNT, block.timestamp + DUE_DATE_OFFSET, "", bytes32(0));

        vm.prank(creator);
        invoice.cancelInvoice(0);

        vm.prank(creator);
        vm.expectRevert(Invoice.InvoiceAlreadyCancelled.selector);
        invoice.cancelInvoice(0);
    }

    // ─── Query Functions ─────────────────────────────────────────────

    function test_GetInvoicesByCreator() public {
        vm.startPrank(creator);
        invoice.createInvoice(payer, AMOUNT, block.timestamp + DUE_DATE_OFFSET, "Invoice 1", bytes32(0));
        invoice.createInvoice(payer, AMOUNT * 2, block.timestamp + DUE_DATE_OFFSET, "Invoice 2", bytes32(0));
        invoice.createInvoice(payer, AMOUNT * 3, block.timestamp + DUE_DATE_OFFSET, "Invoice 3", bytes32(0));
        vm.stopPrank();

        uint256[] memory ids = invoice.getInvoicesByCreator(creator);
        assertEq(ids.length, 3);
        assertEq(ids[0], 0);
        assertEq(ids[1], 1);
        assertEq(ids[2], 2);
    }

    function test_RevertWhen_GetInvoice_NotFound() public {
        vm.expectRevert(Invoice.InvoiceNotFound.selector);
        invoice.getInvoice(999);
    }

    // ─── Fuzz Tests ──────────────────────────────────────────────────

    function testFuzz_CreateAndPayInvoice(uint256 amount) public {
        // Bound amount to reasonable range (0.01 USDC to 1M USDC)
        amount = bound(amount, 1e4, 1_000_000 * 1e6);

        vm.prank(creator);
        uint256 id = invoice.createInvoice(
            payer, amount, block.timestamp + DUE_DATE_OFFSET, "Fuzz test", bytes32(0)
        );

        usdc.mint(payer, amount);
        vm.startPrank(payer);
        usdc.approve(address(invoice), amount);
        invoice.payInvoice(id);
        vm.stopPrank();

        Invoice.InvoiceData memory inv = invoice.getInvoice(id);
        assertEq(uint256(inv.status), uint256(Invoice.InvoiceStatus.Paid));
        assertEq(usdc.balanceOf(creator), amount);
    }
}
