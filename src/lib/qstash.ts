import { Receiver } from "@upstash/qstash";
import { isQstashConfigured } from "@/lib/config";

export async function verifyQstashSignature(params: {
  signature: string | null;
  body: string;
}): Promise<boolean> {
  if (!isQstashConfigured()) {
    // Allow local cron simulation with a shared secret header.
    const localSecret = process.env.CRON_SECRET;
    if (!localSecret) return false;
    return params.signature === localSecret;
  }

  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? process.env.QSTASH_CURRENT_SIGNING_KEY!,
  });

  if (!params.signature) return false;
  try {
    await receiver.verify({
      signature: params.signature,
      body: params.body,
    });
    return true;
  } catch {
    return false;
  }
}
