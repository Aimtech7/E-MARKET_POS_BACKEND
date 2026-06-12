const mpesaService = require("../services/mpesa-service");
const paystackService = require("../services/paystack-service");
const PaymentLog = require("../model/PaymentLog");
const Transaction = require("../model/Transaction");
const Invoice = require("../model/Invoice");

const markTransactionComplete = async (externalReference, metadata) => {
  const transaction = await Transaction.findOneAndUpdate(
    { externalReference },
    { paymentStatus: "completed", paymentMetadata: metadata },
    { new: true }
  );
  if (transaction && transaction.invoice) {
    await Invoice.findByIdAndUpdate(transaction.invoice, { paymentStatus: "Paid" });
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

    const webhookDomain = process.env.WEBHOOK_DOMAIN || "http://localhost:5500";
    const callbackUrl = process.env.MPESA_CALLBACK_URL || `${webhookDomain}/payments/mpesa/webhook`;
    // We override the service callback url with our dynamic one if needed
    mpesaService.callbackUrl = callbackUrl;
    
    const response = await mpesaService.initiateStkPush(phoneNumber, amount, `TRX-${transactionId}`, "POS Payment");
    
    // Save the CheckoutRequestID to the transaction so we can match it in the webhook
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
    
    await PaymentLog.create({
      provider: "mpesa",
      type: "webhook_callback",
      payload: payload,
      webhookPayload: payload,
      status: "received"
    });

    const stkCallback = payload?.Body?.stkCallback;
    if (stkCallback) {
      const checkoutRequestID = stkCallback.CheckoutRequestID;
      const resultCode = stkCallback.ResultCode; // 0 is success
      const resultDesc = stkCallback.ResultDesc;
      
      const status = resultCode === 0 ? "completed" : "failed";

      if (status === "completed") {
        await markTransactionComplete(checkoutRequestID, stkCallback);
      } else {
        await Transaction.findOneAndUpdate(
          { externalReference: checkoutRequestID },
          { paymentStatus: status, paymentMetadata: stkCallback }
        );
      }
    }

    // Acknowledge receipt to Safaricom
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("M-Pesa Webhook Error:", error);
    // Still return 200 so Safaricom doesn't keep retrying
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted but failed to process internally" });
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

// --- PAYSTACK ---

const initiatePaystackPayment = async (req, res) => {
  try {
    const { email, amount, transactionId } = req.body;
    
    if (!email || !amount || !transactionId) {
      return res.status(400).json({ message: "Email, amount, and transactionId are required" });
    }

    const reference = `PAYSTACK_${transactionId}_${Date.now()}`;
    const webhookDomain = process.env.WEBHOOK_DOMAIN || "http://localhost:5500";
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
  initiatePaystackPayment,
  paystackWebhook,
  verifyPaystackPayment
};
