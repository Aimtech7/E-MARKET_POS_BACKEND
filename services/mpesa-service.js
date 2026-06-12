const PaymentLog = require("../model/PaymentLog");

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.passkey = process.env.MPESA_PASSKEY;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.environment = process.env.MPESA_ENVIRONMENT || "sandbox";
    this.callbackUrl = process.env.MPESA_CALLBACK_URL;
    
    this.baseUrl = this.environment === "production" 
      ? "https://api.safaricom.co.ke" 
      : "https://sandbox.safaricom.co.ke";
  }

  async generateToken() {
    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    try {
      const response = await fetch(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${auth}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.errorMessage || "Failed to generate M-Pesa token");
      return data.access_token;
    } catch (error) {
      console.error("M-Pesa Token Error:", error);
      throw error;
    }
  }

  async initiateStkPush(phoneNumber, amount, accountReference = "POS Payment", transactionDesc = "Payment") {
    try {
      const token = await this.generateToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');

      // Safaricom requires phone numbers in the format 2547XXXXXXXX
      let formattedPhone = phoneNumber;
      if (formattedPhone.startsWith("0")) formattedPhone = `254${formattedPhone.slice(1)}`;
      else if (formattedPhone.startsWith("+")) formattedPhone = formattedPhone.slice(1);

      const payload = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline", // or CustomerBuyGoodsOnline depending on till vs paybill
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: this.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc
      };

      // Log request
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

      return data; // contains CheckoutRequestID
    } catch (error) {
      console.error("M-Pesa STK Push Error:", error);
      throw error;
    }
  }

  async queryStatus(checkoutRequestID) {
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
}

module.exports = new MpesaService();
