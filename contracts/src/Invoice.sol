// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IUSDC} from "./interfaces/IUSDC.sol";

/// @title Invoice — On-chain invoice lifecycle management
/// @notice Create, pay, cancel, and query invoices denominated in USDC on Arc L1
/// @dev Events are indexed for off-chain indexer (Cloudflare Worker cron)
contract Invoice {
    // ─── Types ───────────────────────────────────────────────────────
    enum InvoiceStatus {
        Created,
        Paid,
        Cancelled,
        Overdue
    }

    struct InvoiceData {
        uint256 id;
        address creator; // who issued the invoice
        address payer; // expected payer (address(0) = anyone)
        uint256 amount; // USDC amount (6 decimals)
        uint256 dueDate; // Unix timestamp
        string description;
        bytes32 metadataHash; // off-chain reference hash (IPFS, URL, etc.)
        InvoiceStatus status;
        uint256 paidAt; // timestamp when paid
        address paidBy; // who actually paid
    }

    // ─── State ───────────────────────────────────────────────────────
    IUSDC public immutable usdc;
    address public owner;
    address public paymentRouter;

    uint256 public invoiceCount;
    mapping(uint256 => InvoiceData) private _invoices;
    mapping(address => uint256[]) private _invoicesByCreator;

    bool private _locked;

    // ─── Events ──────────────────────────────────────────────────────
    event InvoiceCreated(
        uint256 indexed id,
        address indexed creator,
        address payer,
        uint256 amount,
        uint256 dueDate
    );

    event InvoicePaid(
        uint256 indexed id,
        address indexed paidBy,
        uint256 amount,
        uint256 timestamp
    );

    event InvoiceCancelled(uint256 indexed id);

    event PaymentRouterUpdated(address indexed newRouter);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ─── Errors ──────────────────────────────────────────────────────
    error ZeroAmount();
    error InvalidDueDate();
    error InvoiceNotFound();
    error InvoiceNotPayable();
    error InvoiceAlreadyPaid();
    error InvoiceAlreadyCancelled();
    error NotInvoiceCreator();
    error UnauthorizedPayer();
    error TransferFailed();
    error Unauthorized();
    error ReentrancyGuard();

    // ─── Modifiers ───────────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (_locked) revert ReentrancyGuard();
        _locked = true;
        _;
        _locked = false;
    }

    // ─── Constructor ─────────────────────────────────────────────────
    /// @param _usdc Address of the USDC token contract on Arc
    constructor(address _usdc) {
        usdc = IUSDC(_usdc);
        owner = msg.sender;
    }

    // ─── Write Functions ─────────────────────────────────────────────

    /// @notice Create a new invoice
    /// @param payer Expected payer address (address(0) means anyone can pay)
    /// @param amount USDC amount with 6 decimals
    /// @param dueDate Unix timestamp for payment deadline
    /// @param description Short text description
    /// @param metadataHash Off-chain reference hash
    /// @return invoiceId The ID of the newly created invoice
    function createInvoice(
        address payer,
        uint256 amount,
        uint256 dueDate,
        string calldata description,
        bytes32 metadataHash
    ) external returns (uint256 invoiceId) {
        if (amount == 0) revert ZeroAmount();
        if (dueDate <= block.timestamp) revert InvalidDueDate();

        invoiceId = invoiceCount++;

        _invoices[invoiceId] = InvoiceData({
            id: invoiceId,
            creator: msg.sender,
            payer: payer,
            amount: amount,
            dueDate: dueDate,
            description: description,
            metadataHash: metadataHash,
            status: InvoiceStatus.Created,
            paidAt: 0,
            paidBy: address(0)
        });

        _invoicesByCreator[msg.sender].push(invoiceId);

        emit InvoiceCreated(invoiceId, msg.sender, payer, amount, dueDate);
    }

    /// @notice Pay an invoice directly with USDC
    /// @dev Caller must have approved this contract to spend USDC
    /// @param invoiceId The ID of the invoice to pay
    function payInvoice(uint256 invoiceId) external nonReentrant {
        _executePayment(invoiceId, msg.sender);
    }

    /// @notice Pay an invoice via the PaymentRouter or authorized agent
    /// @dev Only callable by the registered PaymentRouter
    /// @param invoiceId The ID of the invoice to pay
    /// @param payer The address whose USDC will be used
    function payInvoiceViaRouter(uint256 invoiceId, address payer) external nonReentrant {
        if (msg.sender != paymentRouter) revert Unauthorized();
        _executePayment(invoiceId, payer);
    }

    /// @notice Cancel an invoice (only by creator, only if unpaid)
    /// @param invoiceId The ID of the invoice to cancel
    function cancelInvoice(uint256 invoiceId) external {
        InvoiceData storage inv = _invoices[invoiceId];
        if (inv.creator == address(0)) revert InvoiceNotFound();
        if (inv.creator != msg.sender) revert NotInvoiceCreator();
        if (inv.status == InvoiceStatus.Paid) revert InvoiceAlreadyPaid();
        if (inv.status == InvoiceStatus.Cancelled) revert InvoiceAlreadyCancelled();

        inv.status = InvoiceStatus.Cancelled;

        emit InvoiceCancelled(invoiceId);
    }

    // ─── Admin Functions ─────────────────────────────────────────────

    /// @notice Set the PaymentRouter address
    function setPaymentRouter(address _router) external onlyOwner {
        paymentRouter = _router;
        emit PaymentRouterUpdated(_router);
    }

    /// @notice Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ─── View Functions ──────────────────────────────────────────────

    /// @notice Get full invoice data by ID
    function getInvoice(uint256 invoiceId) external view returns (InvoiceData memory) {
        InvoiceData memory inv = _invoices[invoiceId];
        if (inv.creator == address(0)) revert InvoiceNotFound();
        return inv;
    }

    /// @notice Get all invoice IDs created by an address
    function getInvoicesByCreator(address creator) external view returns (uint256[] memory) {
        return _invoicesByCreator[creator];
    }

    /// @notice Get total number of invoices
    function getInvoiceCount() external view returns (uint256) {
        return invoiceCount;
    }

    // ─── Internal ────────────────────────────────────────────────────

    /// @dev Core payment logic shared by direct and router payments
    function _executePayment(uint256 invoiceId, address payer) internal {
        InvoiceData storage inv = _invoices[invoiceId];

        if (inv.creator == address(0)) revert InvoiceNotFound();
        if (inv.status == InvoiceStatus.Paid) revert InvoiceAlreadyPaid();
        if (inv.status == InvoiceStatus.Cancelled) revert InvoiceNotPayable();

        // If a specific payer is set, enforce it
        if (inv.payer != address(0) && inv.payer != payer) {
            revert UnauthorizedPayer();
        }

        // Transfer USDC from payer to invoice creator
        bool success = usdc.transferFrom(payer, inv.creator, inv.amount);
        if (!success) revert TransferFailed();

        // Update state
        inv.status = InvoiceStatus.Paid;
        inv.paidAt = block.timestamp;
        inv.paidBy = payer;

        emit InvoicePaid(invoiceId, payer, inv.amount, block.timestamp);
    }
}
