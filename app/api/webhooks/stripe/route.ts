import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { sendInvoiceAndOrderEmailsForOrder } from "@/services/email-services";
import Stripe from "stripe";

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    console.error("[Stripe Webhook] Stripe environment variables are not configured.");
    return NextResponse.json(
      { error: "Stripe is not configured on this server." },
      { status: 400 }
    );
  }

  const body = await req.text();
  const reqHeaders = await headers();
  const signature = reqHeaders.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error("[Stripe Webhook] Missing signature or webhook secret");
    return NextResponse.json(
      { error: "Webhook secret or signature missing" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`[Stripe Webhook Error] ${err.message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle Stripe event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderNumber =
      session.metadata?.order_number || session.client_reference_id;

    if (orderNumber) {
      try {
        const order = await prisma.order.findUnique({
          where: { order_number: orderNumber },
        });

        if (order && order.payment_status !== "paid") {
          // Update order status to paid
          await prisma.order.update({
            where: { id: order.id },
            data: {
              payment_status: "paid",
              paid_at: new Date(),
              updated_by: 0,
            },
          });

          // Record payment transaction
          await prisma.payment_transaction.create({
            data: {
              order_id: order.id,
              provider: "stripe",
              provider_transaction_id:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : session.id,
              provider_session_id: session.id,
              provider_status: session.payment_status,
              amount: order.total,
              currency: order.currency,
              status: "completed",
              confirmed_at: new Date(),
              raw_response: session as any,
            },
          });

          // Send confirmation emails and invoice
          try {
            await sendInvoiceAndOrderEmailsForOrder(order.id, 0);
          } catch (emailErr) {
            console.error(
              "[Stripe Webhook] Email generation error:",
              emailErr
            );
          }
        }
      } catch (dbErr) {
        console.error("[Stripe Webhook] DB error updating order:", dbErr);
        return NextResponse.json(
          { error: "Database error processing order update" },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
