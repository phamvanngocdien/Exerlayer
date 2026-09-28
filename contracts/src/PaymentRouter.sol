// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IUSDC} from "./interfaces/IUSDC.sol";
import {Invoice} from "./Invoice.sol";
import {ComplianceRules} from "./ComplianceRules.sol";

/// @title PaymentRouter — Orchestration layer for invoice payments
/// @notice Routes payments through compliance checks, supports direct, batch, 
///         cross-chain (CCTP), and autonomous agent payments
contract PaymentRouter {
    // ─── State ───────────────────────────────────────────────────────
    Invoice public invoiceContract;
    ComplianceRules public compliance;
    IUSDC public immutable usdc;
    address public owner;

    /// @notice Authorized agent wallets that can make autonomous payments
    mapping(address => bool) public authorizedAgents;

    bool private _locked;

    // ─── Events ──────────────────────────────────────────────────────
    event PaymentRouted(uint256 indexed invoiceId, address indexed payer, string method);
    event BatchPaymentRouted(uint256[] invoiceIds, address indexed payer);
    event AgentPayment(uint256 indexed invoiceId, address indexed agent, uint256 amount);
    event AgentAuthorized(address indexed agent, bool authorized);

    // ─── Errors ──────────────────────────────────────────────────────
    error Unauthorized();
    error ComplianceFailed();
    error EmptyBatch();
    error ReentrancyGuard();

    // ─── Modifiers ───────────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyAuthorizedAgent() {
        if (!authorizedAgents[msg.sender]) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (_locked) revert ReentrancyGuard();
        _locked = true;
        _;
        _locked = false;
    }

    // ─── Constructor ─────────────────────────────────────────────────
    constructor(address _invoice, address _compliance, address _usdc) {
        invoiceContract = Invoice(_invoice);
        compliance = ComplianceRules(_compliance);
        usdc = IUSDC(_usdc);
        owner = msg.sender;
    }

    // ─── Payment Functions ───────────────────────────────────────────

    /// @notice Route a payment through compliance check then to Invoice contract
    /// @param invoiceId The invoice to pay
    function routePayment(uint256 invoiceId) external nonReentrant {
        Invoice.InvoiceData memory inv = invoiceContract.getInvoice(invoiceId);

        // Run compliance check
        if (!compliance.prePaymentCheck(msg.sender, inv.amount)) {
            revert ComplianceFailed();
        }

        // Approve Invoice contract to spend caller's USDC
        // Note: Caller must have approved THIS router first
        usdc.transferFrom(msg.sender, address(this), inv.amount);
        usdc.approve(address(invoiceContract), inv.amount);

        // Execute payment via router
        invoiceContract.payInvoiceViaRouter(invoiceId, address(this));

        emit PaymentRouted(invoiceId, msg.sender, "direct");
    }

    /// @notice Batch pay multiple invoices in a single transaction
    /// @param invoiceIds Array of invoice IDs to pay
    function routeBatchPayment(uint256[] calldata invoiceIds) external nonReentrant {
        if (invoiceIds.length == 0) revert EmptyBatch();

        uint256 totalAmount = 0;

        // Calculate total and check compliance for each
        for (uint256 i = 0; i < invoiceIds.length; i++) {
            Invoice.InvoiceData memory inv = invoiceContract.getInvoice(invoiceIds[i]);
            if (!compliance.prePaymentCheck(msg.sender, inv.amount)) {
                revert ComplianceFailed();
            }
            totalAmount += inv.amount;
        }

        // Transfer total USDC to router
        usdc.transferFrom(msg.sender, address(this), totalAmount);

        // Pay each invoice
        for (uint256 i = 0; i < invoiceIds.length; i++) {
            Invoice.InvoiceData memory inv = invoiceContract.getInvoice(invoiceIds[i]);
            usdc.approve(address(invoiceContract), inv.amount);
            invoiceContract.payInvoiceViaRouter(invoiceIds[i], address(this));
        }

        emit BatchPaymentRouted(invoiceIds, msg.sender);
    }

    /// @notice Autonomous agent payment — agent pays invoice without human intervention
    /// @dev Only callable by authorized agent wallets (Circle Agent Stack MPC wallets)
    /// @param invoiceId The invoice to pay
    function agentPayInvoice(uint256 invoiceId) external onlyAuthorizedAgent nonReentrant {
        Invoice.InvoiceData memory inv = invoiceContract.getInvoice(invoiceId);

        // Compliance check still applies to agents
        if (!compliance.prePaymentCheck(msg.sender, inv.amount)) {
            revert ComplianceFailed();
        }

        // Agent wallet transfers USDC to this router, then to invoice
        usdc.transferFrom(msg.sender, address(this), inv.amount);
        usdc.approve(address(invoiceContract), inv.amount);
        invoiceContract.payInvoiceViaRouter(invoiceId, address(this));

        emit AgentPayment(invoiceId, msg.sender, inv.amount);
    }

    // ─── Admin Functions ─────────────────────────────────────────────

    /// @notice Authorize or deauthorize an agent wallet
    function setAuthorizedAgent(address agent, bool authorized) external onlyOwner {
        authorizedAgents[agent] = authorized;
        emit AgentAuthorized(agent, authorized);
    }

    /// @notice Update the compliance rules contract
    function setComplianceRules(address _compliance) external onlyOwner {
        compliance = ComplianceRules(_compliance);
    }

    /// @notice Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
