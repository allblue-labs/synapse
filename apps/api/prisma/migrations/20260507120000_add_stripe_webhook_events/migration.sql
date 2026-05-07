-- Stripe webhook receipt ledger for idempotent signed webhook processing.

CREATE TYPE "StripeWebhookEventStatus" AS ENUM ('PROCESSED', 'IGNORED', 'FAILED');

CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" "StripeWebhookEventStatus" NOT NULL,
    "errorMessage" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stripe_webhook_events_stripeEventId_key" ON "stripe_webhook_events"("stripeEventId");
CREATE INDEX "stripe_webhook_events_eventType_receivedAt_idx" ON "stripe_webhook_events"("eventType", "receivedAt");
CREATE INDEX "stripe_webhook_events_status_receivedAt_idx" ON "stripe_webhook_events"("status", "receivedAt");
