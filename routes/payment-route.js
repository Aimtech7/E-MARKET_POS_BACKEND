const express = require("express");
const router = express.Router();
const paymentController = require("../controller/payment-controller");
const rateLimit = require("express-rate-limit");

// Strict rate limiter for payment initiation to prevent brute force / carding attacks
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 payment requests per windowMs
  message: { message: "Too many payment requests from this IP, please try again after 15 minutes" }
});

// M-Pesa routes
router.post("/mpesa/stkpush", paymentLimiter, paymentController.initiateMpesaPayment);
router.post("/mpesa/webhook", paymentController.mpesaWebhook);
router.get("/mpesa/status/:reference", paymentController.verifyMpesaPayment);

// Paystack routes
router.post("/paystack/initialize", paymentLimiter, paymentController.initiatePaystackPayment);
router.post("/paystack/webhook", paymentController.paystackWebhook);
router.get("/paystack/verify/:reference", paymentController.verifyPaystackPayment);

module.exports = router;
