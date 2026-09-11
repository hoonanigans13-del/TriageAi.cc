const crypto = require('crypto');

// Environment variables to set in Vercel/Netlify:
// PRIVATE_KEY_B64: Your production private key
// RESEND_API_KEY: Your Resend.com API key
// PADDLE_WEBHOOK_SECRET: Your Paddle Webhook secret (for signature verification)

const PRIVATE_KEY_B64 = process.env.PRIVATE_KEY_B64;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body;

  // 1. Verify Paddle Signature (Simplified for now, recommend adding full check)
  // if (!verifyPaddleSignature(req)) return res.status(401).send('Unauthorized');

  try {
    // 2. Extract customer info
    const customerEmail = payload.data.customer?.email || payload.data.user_email;
    const transactionId = payload.data.id;
    const priceId = payload.data.items?.[0]?.price_id;

    // 3. Map Price ID to Edition
    let edition = 'starter'; // Default
    if (priceId && priceId.includes('pri_01m1r6cqphmxafkehfew7w8pab')) edition = 'enterprise';
    // Add other mappings as needed

    // 4. Create License Payload
    const now = Date.now();
    const expiry = now + (365 * 24 * 60 * 60 * 1000); // 1 year expiry

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

    const signature = crypto.sign(null, Buffer.from(message), privateKey);
    const signatureB64 = signature.toString('base64').replace(/=/g, ''); // No-pad base64

    const fullLicense = {
      payload: licensePayload,
      signature: signatureB64
    };

    const licenseFileContent = JSON.stringify(fullLicense, null, 2);

    // 6. Send Email via Resend
    const response = await fetch('https://api.resend.com/emails', {
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

    if (!response.ok) {
        throw new Error(`Email failed: ${await response.text()}`);
    }

    console.log(`✅ License delivered to ${customerEmail}`);
    res.status(200).json({ status: 'delivered' });

  } catch (error) {
    console.error('❌ Fulfillment error:', error);
    res.status(500).json({ error: error.message });
  }
};
