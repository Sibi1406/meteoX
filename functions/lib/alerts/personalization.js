// alerts/personalization.js — Personalized Alert Builder & Multi-channel Delivery (Spec §34, §35, §36)
const { db, messaging } = require("../../admin");
const { info, warn, error } = require("../utils/logger");
const twilio = require("twilio");

/**
 * Builds localized, role-specific alert message.
 */
function buildPersonalizedAlert(alert, role = "farmer", language = "en") {
  const isTamil = language === "ta";

  let actionAdvice = "";
  if (alert.type === "heavy_rain") {
    if (role === "farmer") {
      actionAdvice = isTamil ? "உரமிடுதல் மற்றும் பூச்சி மருந்து தெளிப்பதை ஒத்திவைக்கவும்." : "Postpone fertilizer and pesticide spraying.";
    } else if (role === "fisherman") {
      actionAdvice = isTamil ? "படகுகளை பாதுகாப்பாக கட்டவும்." : "Secure boats and gear at the harbor.";
    } else if (role === "city_admin") {
      actionAdvice = isTamil ? "வடிகால் மற்றும் மோட்டார் பம்புகளை தயார் நிலையில் வைக்கவும்." : "Ensure storm water pumps are ready.";
    } else {
      actionAdvice = isTamil ? "வெளியே செல்லும்போது குடை எடுத்துச் செல்லவும்." : "Carry an umbrella if venturing outdoors.";
    }
  } else if (alert.type === "high_wind") {
    if (role === "fisherman") {
      actionAdvice = isTamil ? "ஆழ்கடலுக்குள் செல்ல வேண்டாம்." : "Do NOT venture into the deep sea.";
    } else if (role === "farmer") {
      actionAdvice = isTamil ? "மரங்களை முட்டுக்கொடுக்கவும்." : "Support young trees and avoid spraying.";
    } else {
      actionAdvice = isTamil ? "விளம்பரப் பலகைகள் அடியில் நிற்க வேண்டாம்." : "Stay away from temporary billboards.";
    }
  } else if (alert.type === "extreme_heat") {
    actionAdvice = isTamil ? "நிறைய தண்ணீர் அருந்தி நிழலில் இருக்கவும்." : "Stay hydrated and avoid direct sun.";
  }

  const title = isTamil ? alert.title.split("/")[1]?.trim() || alert.title : alert.title.split("/")[0]?.trim();
  const body = `${isTamil ? alert.tamilDescription : alert.description} ${actionAdvice}`;

  return { title, body, actionAdvice };
}

/**
 * Sends FCM push alert to matching user tokens (Spec §35).
 */
async function sendFcmAlert({ userTokens, title, body, alertData = {} }) {
  if (!userTokens || userTokens.length === 0) return { sentCount: 0 };

  try {
    const response = await messaging.sendEachForMulticast({
      tokens: userTokens,
      notification: { title, body },
      data: {
        alertType: alertData.type || "weather",
        severity: alertData.severity || "medium",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
    });

    info("FCM push alerts dispatched", { successCount: response.successCount, failureCount: response.failureCount });
    return { sentCount: response.successCount };
  } catch (err) {
    error("FCM dispatch failed", err);
    return { sentCount: 0, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Optional Alert Adapters (Spec §36)
// Placeholders for WhatsApp and SMS. Never pretend a message was sent!
// ---------------------------------------------------------------------------
class WhatsAppAdapter {
  constructor(token = null) {
    this.token = token || process.env.WHATSAPP_API_TOKEN;
  }
  async send(toPhoneNumber, message) {
    if (!this.token) {
      return { status: "NOT_CONFIGURED", channel: "whatsapp" };
    }
    // Future Meta Cloud API implementation
    return { status: "NOT_CONFIGURED", channel: "whatsapp" };
  }
}

class SmsAdapter {
  constructor(accountSid = null, authToken = null, fromNumber = null, contentSid = null) {
    this.accountSid = accountSid || process.env.TWILIO_ACCOUNT_SID;
    this.authToken = authToken || process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = fromNumber || process.env.TWILIO_FROM_NUMBER;
    const enableCustomContent = process.env.TWILIO_ENABLE_CONTENT === "true";
    this.contentSid = contentSid || (enableCustomContent ? process.env.TWILIO_CONTENT_SID : null);
    this.trialTemplate = process.env.TWILIO_TRIAL_TEMPLATE || "sms_customer_support";
  }
  async send(toPhoneNumber, message) {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      return { status: "NOT_CONFIGURED", channel: "sms" };
    }
    try {
      const client = twilio(this.accountSid, this.authToken);
      const messageOptions = {
        from: this.fromNumber,
        to: toPhoneNumber,
        body: this.trialTemplate,
      };

      // Use the exact Twilio trial pattern that is currently working: body is the configured template name.
      const result = await client.messages.create(messageOptions);
      return { status: "SENT", channel: "sms", messageId: result.sid };
    } catch (err) {
      return {
        status: "FAILED",
        channel: "sms",
        error: err.message,
        errorCode: err.code || null,
      };
    }
  }
}

module.exports = {
  buildPersonalizedAlert,
  sendFcmAlert,
  WhatsAppAdapter,
  SmsAdapter,
};
