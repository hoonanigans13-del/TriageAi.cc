const crypto = require('crypto');
const { Paddle, Environment } = require('@paddle/paddle-node-sdk');

const PRIVATE_KEY_B64 = process.env.PRIVATE_KEY_B64;
const PADDLE_API_KEY = process.env.PADDLE_API_KEY;

const paddle = new Paddle(PADDLE_API_KEY, {
  environment: Environment.production,
});

module.exports = async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // 1. Search for completed transactions for this email
    // Note: We use the transactions.list() with a customer_id filter or search.
    // For simplicity, we'll list transactions and filter by status 'completed'.
    const transactionCollection = paddle.transactions.list({
      status: ['completed'],
    });

    let latestTransaction = null;

    // Iterate through transactions to find a match for the email
    // This is a bit slow if there are many, but works without a DB.
    // Better: If you have customer management, look up customer by email first.
    for await (const transaction of transactionCollection) {
      if (transaction.customer?.email === email || transaction.details?.payout_totals?.user_email === email) {
        latestTransaction = transaction;
        break; // Found the most recent completed one
      }
    }

    if (!latestTransaction) {
      return res.status(404).json({ error: 'No active license found for this email' });
    }

    // 2. Map Price ID to Edition
    const priceId = latestTransaction.items?.[0]?.price_id;
    let edition = 'starter';
    if (priceId === 'pri_01m1r6cqphmxafkehfew7w8pab') edition = 'enterprise';

    // 3. Create License Payload
    const now = Date.now();
    const expiry = now + (365 * 24 * 60 * 60 * 1000);

    const licensePayload = {
      formatVersion: 1,
      licenseId: `lic_${latestTransaction.id}`,
      edition: edition,
      issuedAtMs: now,
      notBeforeMs: now,
      expiresAtMs: expiry,
      maxAppMajorVersion: 1,
      features: ["autonomy", "persistent_learning"]
    };

    // 4. Sign the payload (Matching the logic in fulfillment.js and entitlement.rs)
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

    // 5. Return the license JSON directly
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(fullLicense, null, 2));

  } catch (error) {
    console.error('❌ License lookup error:', error);
    res.status(500).json({ error: error.message });
  }
};
