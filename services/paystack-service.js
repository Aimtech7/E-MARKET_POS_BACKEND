const crypto = require("crypto");
const PaymentLog = require("../model/PaymentLog");

class PaystackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.baseUrl = "https://api.paystack.co";
  }

  async initializePayment(email, amount, reference, callbackUrl = "") {
    try {
      // Paystack amount is in kobo (lowest denomination), so multiply by 100
      const payload = {
        email: email,
        amount: Math.round(amount * 100),
        reference: reference,
        callback_url: callbackUrl
      };

      await PaymentLog.create({
        provider: "paystack",
        type: "request",
        payload: payload,
        status: "pending"
      });

      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.secretKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!data.status) {
        throw new Error(data.message || "Failed to initialize Paystack payment");
      }

      return data.data; // contains authorization_url, access_code, reference
    } catch (error) {
      console.error("Paystack Initialize Error:", error);
      throw error;
    }
  }

  verifySignature(signature, payloadString) {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || this.secretKey;
    const hash = crypto.createHmac('sha512', secret).update(payloadString).digest('hex');
    return hash === signature;
  }

  async verifyPayment(reference) {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.secretKey}`
        }
      });
      const data = await response.json();
      if (!data.status) {
        throw new Error(data.message || "Failed to verify Paystack payment");
      }
      return data.data;
    } catch (error) {
      console.error("Paystack Verify Error:", error);
      throw error;
    }
  }
}

module.exports = new PaystackService();
