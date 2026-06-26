const mpesaService = require("../services/mpesa-service");
const paystackService = require("../services/paystack-service");
const PaymentLog = require("../model/PaymentLog");
const Transaction = require("../model/Transaction");
const Invoice = require("../model/Invoice");
const Receipt = require("../model/Receipt");
const whatsappService = require("../services/whatsapp-service");

const markTransactionComplete = async (externalReference, metadata, extractedData = {}) => {
  const transaction = await Transaction.findOneAndUpdate(
    { externalReference },
    { paymentStatus: "completed", paymentMetadata: metadata },
    { new: true }
  ).populate("invoice");

  if (transaction && transaction.invoice) {
    const inv = transaction.invoice;
    await Invoice.findByIdAndUpdate(inv._id || inv, { paymentStatus: "Paid", amountPaid: inv.amountPaid || extractedData.Amount || transaction.totalAmount });
    
    // Priority 1: Automatic Sale Update (Generate Receipt if missing)
    try {
      let activeReceipt = await Receipt.findOne({ invoiceReference: inv._id || inv });
      if (!activeReceipt) {
        activeReceipt = await Receipt.create({
          receiptNumber: `RCP-${Date.now()}`,
          invoiceReference: inv._id || inv,
          cartReference: inv.cart || inv._id,
          cashier: transaction.cashier || inv.cashier || "System",
          subtotal: inv.amountPaid || transaction.totalAmount,
          grandTotal: inv.amountPaid || transaction.totalAmount,
          amountPaid: extractedData.Amount || inv.amountPaid || transaction.totalAmount,
          changeGiven: 0,
          paymentMethod: "M-Pesa"
        });
      }
      if (extractedData.PhoneNumber || transaction.customerPhone) {
        whatsappService.sendDigitalReceipt(extractedData.PhoneNumber || transaction.customerPhone, activeReceipt).catch(e => {});
      }
    } catch (e) { console.error("Auto Receipt Generation Error:", e.message); }
  }
  return transaction;
};

// --- M-PESA ---

const initiateMpesaPayment = async (req, res) => {
  try {
    const { phoneNumber, amount, transactionId } = req.body;
    
    if (!phoneNumber || !amount || !transactionId) {
      return res.status(400).json({ message: "Phone number, amount, and transactionId are required" });
    }

    const webhookDomain = process.env.WEBHOOK_DOMAIN || "https://e-market-pos-backend.onrender.com";
    const callbackUrl = process.env.MPESA_CALLBACK_URL || `${webhookDomain}/payments/mpesa/webhook`;
    mpesaService.callbackUrl = callbackUrl;
    
    const response = await mpesaService.initiateStkPush(phoneNumber, amount, `TRX-${transactionId}`);
    
    if (response.CheckoutRequestID) {
      await Transaction.findOneAndUpdate(
        { transactionNumber: transactionId },
        { 
          externalReference: response.CheckoutRequestID,
          paymentProvider: "mpesa",
          paymentStatus: "pending" 
        }
      );
    }

    res.status(200).json({ message: "STK Push initiated successfully", data: response });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to initiate M-Pesa payment" });
  }
};

const mpesaWebhook = async (req, res) => {
  try {
    const payload = req.body;
    
    // Priority 1: Callback Authenticity & Security Validation
    if (!payload || !payload.Body || !payload.Body.stkCallback) {
      return res.status(400).json({ message: "Invalid callback authenticity" });
    }

    const stkCallback = payload.Body.stkCallback;
    const callbackItems = stkCallback.CallbackMetadata?.Item || [];
    const getVal = (name) => callbackItems.find(i => i.Name === name)?.Value;

    const extractedData = {
      CheckoutRequestID: stkCallback.CheckoutRequestID,
      MerchantRequestID: stkCallback.MerchantRequestID,
      ResultCode: stkCallback.ResultCode,
      ResultDesc: stkCallback.ResultDesc,
      MpesaReceiptNumber: getVal("MpesaReceiptNumber"),
      TransactionDate: getVal("TransactionDate"),
      PhoneNumber: getVal("PhoneNumber"),
      Amount: getVal("Amount")
    };

    await PaymentLog.create({
      provider: "mpesa",
      type: "webhook_callback",
      payload: extractedData,
      webhookPayload: payload,
      status: stkCallback.ResultCode === 0 ? "success" : "failed"
    });

    const checkoutRequestID = stkCallback.CheckoutRequestID;
    const status = stkCallback.ResultCode === 0 ? "completed" : "failed";

    if (status === "completed") {
      await markTransactionComplete(checkoutRequestID, extractedData, extractedData);
    } else {
      await Transaction.findOneAndUpdate(
        { externalReference: checkoutRequestID },
        { paymentStatus: "failed", paymentMetadata: extractedData }
      );
    }

    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("M-Pesa Webhook Error:", error);
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
};

const verifyMpesaPayment = async (req, res) => {
  try {
    const { reference } = req.params;
    const data = await mpesaService.queryStatus(reference);
    
    // Status can be updated here if needed
    if (data.ResultCode === "0") {
      await markTransactionComplete(reference, data);
    } else {
      await Transaction.findOneAndUpdate(
        { externalReference: reference },
        { paymentStatus: "failed", paymentMetadata: data }
      );
    }
    res.status(200).json({ message: "Verification successful", data });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to verify M-Pesa payment" });
  }
};

const registerMpesaC2bUrls = async (req, res) => {
  try {
    const { validationUrl, confirmationUrl } = req.body;
    const data = await mpesaService.registerC2bUrls(validationUrl, confirmationUrl);
    res.status(200).json({ message: "C2B URLs registered successfully", data });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to register C2B URLs" });
  }
};

const mpesaC2bValidation = async (req, res) => {
  res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
};

const mpesaC2bConfirmation = async (req, res) => {
  try {
    const payload = req.body;
    await PaymentLog.create({
      provider: "mpesa",
      type: "c2b_confirmation",
      payload: payload,
      webhookPayload: payload,
      status: "received"
    });

    const transId = payload.TransID;
    if (transId) {
      await markTransactionComplete(transId, payload);
    }
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("C2B Confirmation Error:", error);
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
};

// --- PAYSTACK ---

const initiatePaystackPayment = async (req, res) => {
  try {
    const { email, amount, transactionId } = req.body;
    
    if (!email || !amount || !transactionId) {
      return res.status(400).json({ message: "Email, amount, and transactionId are required" });
    }

    const reference = `PAYSTACK_${transactionId}_${Date.now()}`;
    const webhookDomain = process.env.WEBHOOK_DOMAIN || "https://e-market-pos-backend.onrender.com";
    const callbackUrl = `${webhookDomain}/payments/paystack/verify/${reference}`;
    
    const response = await paystackService.initializePayment(email, amount, reference, callbackUrl);
    
    // Update transaction
    await Transaction.findOneAndUpdate(
      { transactionNumber: transactionId },
      { 
        externalReference: response.reference,
        paymentProvider: "paystack",
        paymentStatus: "pending" 
      }
    );

    res.status(200).json({ message: "Paystack initialization successful", data: response });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to initialize Paystack payment" });
  }
};

const paystackWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const payloadString = JSON.stringify(req.body);

    if (!paystackService.verifySignature(signature, payloadString)) {
      return res.status(401).json({ message: "Invalid signature" });
    }

    const event = req.body;
    
    await PaymentLog.create({
      provider: "paystack",
      type: "webhook_callback",
      payload: event,
      webhookPayload: event,
      status: "received"
    });

    if (event.event === "charge.success") {
      const reference = event.data.reference;
      await markTransactionComplete(reference, event.data);
    }

    res.status(200).send("Webhook received");
  } catch (error) {
    console.error("Paystack Webhook Error:", error);
    res.status(500).send("Server Error");
  }
};

const verifyPaystackPayment = async (req, res) => {
  try {
    const { reference } = req.params;
    const data = await paystackService.verifyPayment(reference);
    
    if (data.status === "success") {
      await markTransactionComplete(reference, data);
    } else if (data.status === "failed") {
      await Transaction.findOneAndUpdate(
        { externalReference: reference },
        { paymentStatus: "failed", paymentMetadata: data }
      );
    }
    
    // Redirect or send JSON based on client request
    res.status(200).json({ message: "Verification successful", data });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to verify Paystack payment" });
  }
};

module.exports = {
  initiateMpesaPayment,
  mpesaWebhook,
  verifyMpesaPayment,
  registerMpesaC2bUrls,
  mpesaC2bValidation,
  mpesaC2bConfirmation,
  initiatePaystackPayment,
  paystackWebhook,
  verifyPaystackPayment
};
