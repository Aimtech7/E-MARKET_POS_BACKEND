const PaymentLog = require("../model/PaymentLog");

class MpesaService {
  constructor() {
    this.initConfig();
  }

  initConfig() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || this.consumerKey;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || this.consumerSecret;
    this.passkey = process.env.MPESA_PASSKEY || this.passkey;
    this.shortcode = process.env.MPESA_SHORTCODE || this.shortcode;
    this.environment = process.env.MPESA_ENVIRONMENT || this.environment || "sandbox";
    this.callbackUrl = process.env.MPESA_CALLBACK_URL || this.callbackUrl;
    this.transactionType = process.env.MPESA_TRANSACTION_TYPE || this.transactionType || "CustomerBuyGoodsOnline";
    
    this.baseUrl = this.environment === "production" 
      ? "https://api.safaricom.co.ke" 
      : "https://sandbox.safaricom.co.ke";
  }

  async generateToken() {
    this.initConfig();
    // Priority 1: Token Caching & Automatic Refresh
    if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    try {
      const response = await fetch(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      const text = await response.text();
      let data = {};
      try { if (text) data = JSON.parse(text); } catch (e) {}

      if (!response.ok) {
        throw new Error(data.errorMessage || `Safaricom Daraja API Error HTTP ${response.status} (Check Consumer Key/Secret)`);
      }
      
      this.cachedToken = data.access_token;
      // Cache for 55 minutes (Safaricom tokens expire in 60 mins)
      this.tokenExpiry = Date.now() + (55 * 60 * 1000);
      return this.cachedToken;
    } catch (error) {
      console.error("M-Pesa Token Error:", error.message);
      throw error;
    }
  }

  async initiateStkPush(phoneNumber, amount, saleId = "POS Payment") {
    this.initConfig();
    try {
      const token = await this.generateToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');

      let formattedPhone = phoneNumber;
      if (formattedPhone.startsWith("0")) formattedPhone = `254${formattedPhone.slice(1)}`;
      else if (formattedPhone.startsWith("+")) formattedPhone = formattedPhone.slice(1);

      const payload = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: this.transactionType,
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: this.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackUrl,
        AccountReference: String(saleId).slice(0, 12),
        TransactionDesc: `Sale ${saleId}`.slice(0, 13)
      };

      await PaymentLog.create({
        provider: "mpesa",
        type: "request",
        payload: payload,
        status: "pending"
      });

      const response = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.errorMessage || "STK Push failed");
      }
      return data;
    } catch (error) {
      console.error("M-Pesa STK Push Error:", error);
      throw error;
    }
  }

  async queryStatus(checkoutRequestID) {
    this.initConfig();
    try {
      const token = await this.generateToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');

      const payload = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID
      };

      const response = await fetch(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.errorMessage || "M-Pesa query failed");
      }
      return data;
    } catch (error) {
      console.error("M-Pesa Query Error:", error);
      throw error;
    }
  }

  // Priority 1: Transaction Requery with Automatic Exponential Backoff Retries
  async queryStatusWithRetry(checkoutRequestID, maxRetries = 3, delayMs = 3000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.queryStatus(checkoutRequestID);
        return result;
      } catch (err) {
        if (attempt === maxRetries) throw err;
        await new Promise(res => setTimeout(res, delayMs * attempt));
      }
    }
  }

  async registerC2bUrls(validationUrl, confirmationUrl, responseType = "Completed") {
    this.initConfig();
    try {
      const token = await this.generateToken();
      const payload = {
        ShortCode: this.shortcode,
        ResponseType: responseType,
        ConfirmationURL: confirmationUrl || `${this.callbackUrl.replace('/webhook', '/c2b/confirmation')}`,
        ValidationURL: validationUrl || `${this.callbackUrl.replace('/webhook', '/c2b/validation')}`
      };

      const response = await fetch(`${this.baseUrl}/mpesa/c2b/v2/registerurl`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.errorMessage || "C2B URL registration failed");
      return data;
    } catch (error) {
      console.error("M-Pesa C2B Register Error:", error);
      throw error;
    }
  }
}

module.exports = new MpesaService();
