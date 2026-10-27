export interface SmsResult {
  recipient: string;
  status: "sent" | "failed";
  providerId?: string;
  error?: string;
}

function getProvider() {
  return (process.env.SMS_PROVIDER ?? "africastalking").toLowerCase();
}

export function isSmsConfigured() {
  const provider = getProvider();
  if (provider === "twilio") {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_FROM,
    );
  }
  return Boolean(
    process.env.AFRICASTALKING_USERNAME && process.env.AFRICASTALKING_API_KEY,
  );
}

async function sendWithAfricasTalking(
  recipients: string[],
  message: string,
  senderIdOverride?: string | null,
): Promise<SmsResult[]> {
  const username = process.env.AFRICASTALKING_USERNAME ?? "";
  const apiKey = process.env.AFRICASTALKING_API_KEY ?? "";
  const senderId = senderIdOverride || process.env.SMS_SENDER_ID;
  const host =
    username.toLowerCase() === "sandbox"
      ? "https://api.sandbox.africastalking.com"
      : "https://api.africastalking.com";

  const body = new URLSearchParams({
    username,
    to: recipients.join(","),
    message,
  });
  if (senderId) body.set("from", senderId);

  const response = await fetch(`${host}/version1/messaging`, {
    method: "POST",
    headers: {
      apiKey,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    return recipients.map((recipient) => ({ recipient, status: "failed", error }));
  }

  const data = (await response.json()) as {
    SMSMessageData?: {
      Recipients?: {
        number: string;
        status: string;
        messageId?: string;
      }[];
    };
  };

  const providerRecipients = data.SMSMessageData?.Recipients ?? [];
  return recipients.map((recipient) => {
    const match = providerRecipients.find((entry) => entry.number === recipient);
    return {
      recipient,
      status: match?.status?.toLowerCase() === "success" ? "sent" : "failed",
      providerId: match?.messageId,
      error: match ? undefined : "No delivery status returned",
    };
  });
}

async function sendWithTwilio(recipients: string[], message: string): Promise<SmsResult[]> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
  const from = process.env.TWILIO_FROM ?? "";
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const results: SmsResult[] = [];
  for (const recipient of recipients) {
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: recipient, From: from, Body: message }),
        },
      );
      if (!response.ok) {
        results.push({
          recipient,
          status: "failed",
          error: (await response.text()).slice(0, 300),
        });
      } else {
        const data = (await response.json()) as { sid?: string };
        results.push({ recipient, status: "sent", providerId: data.sid });
      }
    } catch (error) {
      results.push({
        recipient,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown provider error",
      });
    }
  }
  return results;
}

export async function sendSms(
  recipients: string[],
  message: string,
  options?: { senderId?: string | null },
): Promise<SmsResult[]> {
  if (!recipients.length) return [];
  if (!isSmsConfigured()) {
    throw new Error(
      "SMS provider is not configured. Add Africa's Talking or Twilio credentials to enable sending.",
    );
  }
  if (getProvider() === "twilio") {
    return sendWithTwilio(recipients, message);
  }
  return sendWithAfricasTalking(recipients, message, options?.senderId);
}
