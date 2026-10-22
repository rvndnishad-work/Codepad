-- Prepaid Growth through a one-time Razorpay payment: paid-until date, seats
-- paid for, the period bought, the payment that last extended it (idempotency)
-- and the renewal reminder stamp. All nullable; existing rows are unchanged.
ALTER TABLE "Workspace" ADD COLUMN "prepaidThrough" TIMESTAMP(3);
ALTER TABLE "Workspace" ADD COLUMN "prepaidSeats" INTEGER;
ALTER TABLE "Workspace" ADD COLUMN "prepaidCadence" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "prepaidLastPaymentId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "prepaidReminderAt" TIMESTAMP(3);
