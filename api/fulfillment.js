const crypto = require('crypto');
const { Paddle, Environment } = require('@paddle/paddle-node-sdk');

// Environment variables to set in Vercel:
// PRIVATE_KEY_B64: Your production private key
// RESEND_API_KEY: Your Resend.com API key
// PADDLE_WEBHOOK_SECRET: Your Paddle Webhook secret (pdl_ntfset_...)
// PADDLE_API_KEY: Your Paddle API Key (pdl_live_...)

const PRIVATE_KEY_B64 = process.env.PRIVATE_KEY_B64;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET;

const paddle = new Paddle(process.env.PADDLE_API_KEY, {
  environment: Environment.production,
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['paddle-signature'] || '';
  const rawBody = JSON.stringify(req.body); // Use req.body for Vercel/Node (if not already parsed)

  try {
    // 1. Verify Paddle Signature
    // Note: Vercel usually parses JSON. For unmarshal, we need the raw body.
    // If this fails, we may need to use a buffer or raw body approach.
    const eventData = paddle.webhooks.unmarshal(rawBody, WEBHOOK_SECRET, signature);

    if (eventData && eventData.eventType === 'transaction.completed') {
      const payload = eventData.data;

      // 2. Extract customer info
      const customerEmail = payload.customer?.email || payload.user_email;
      const transactionId = payload.id;
      const priceId = payload.items?.[0]?.price_id;

      // 3. Map Price ID to Edition
      let edition = 'starter';
      if (priceId && priceId.includes('pri_01m1r6cqphmxafkehfew7w8pab')) edition = 'enterprise';

      // 4. Create License Payload
      const now = Date.now();
      const expiry = now + (365 * 24 * 60 * 60 * 1000);

      const licensePayload = {
        formatVersion: 1,
        licenseId: `lic_${transactionId}`,
        edition: edition,
        issuedAtMs: now,
        notBeforeMs: now,
        expiresAtMs: expiry,
        maxAppMajorVersion: 1,
        features: ["autonomy", "persistent_learning"]
      };

      // 5. Sign the payload
      const message = [
        "TRIAGE-LICENSE-V1",
        licensePayload.licenseId,
        edition,
        licensePayload.issuedAtMs,
        licensePayload.notBeforeMs,
        licensePayload.expiresAtMs,
        licensePayload.maxAppMajorVersion,
        licensePayload.features.join(",")
      ].join('\n');

      const privateKey = crypto.createPrivateKey({
        key: Buffer.from(PRIVATE_KEY_B64, 'base64'),
        format: 'der',
        type: 'pkcs8',
      });

      const signatureBytes = crypto.sign(null, Buffer.from(message), privateKey);
      const signatureB64 = signatureBytes.toString('base64').replace(/=/g, '');

      const fullLicense = {
        payload: licensePayload,
        signature: signatureB64
      };

      const licenseFileContent = JSON.stringify(fullLicense, null, 2);

      // 6. Send Email via Resend
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'Triage AI <fulfillment@triageai.cc>',
          to: customerEmail,
          subject: 'Your Triage Pro License',
          html: `<p>Thank you for your purchase! Import the attached license file into the Triage app to unlock Pro features.</p>`,
          attachments: [
            {
              filename: 'triage.triage-license',
              content: Buffer.from(licenseFileContent).toString('base64')
            }
          ]
        })
      });

      if (!emailResponse.ok) {
          throw new Error(`Email failed: ${await emailResponse.text()}`);
      }

      console.log(`✅ License delivered to ${customerEmail}`);
    }

    res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error('❌ Webhook/Fulfillment error:', error);
    // Return 500 so Paddle retries on legitimate failures
    res.status(500).json({ error: error.message });
  }
};
