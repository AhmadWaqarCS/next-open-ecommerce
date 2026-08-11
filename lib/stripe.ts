import Stripe from "stripe";

export function getStripeApiVersion(): string {
  return process.env.STRIPE_API_VERSION || "2026-07-29.dahlia";
}

export function isStripeTestMode(): boolean {
  if (
    process.env.STRIPE_TEST_MODE !== undefined &&
    process.env.STRIPE_TEST_MODE.trim() !== ""
  ) {
    return process.env.STRIPE_TEST_MODE.toLowerCase() === "true";
  }
  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  return secretKey.startsWith("sk_test_");
}

let stripeInstance: Stripe | null = null;

/**
 * Lazily instantiates and returns the active Stripe client instance.
 * Throws a clear runtime error if STRIPE_SECRET_KEY is missing when an operation is executed.
 */
export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.trim() === "") {
    throw new Error(
      "Stripe is not configured. Missing STRIPE_SECRET_KEY in environment variables."
    );
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey.trim(), {
      apiVersion: getStripeApiVersion() as any,
    });
  }
  return stripeInstance;
}

/**
 * Exported stripe Proxy object for backward compatibility.
 * Defers instantiation of Stripe until a property or method is accessed at runtime,
 * preventing build-time errors when STRIPE_SECRET_KEY is missing.
 */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const instance = getStripe();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

/**
 * Checks if required Stripe environment variables are present and non-empty.
 */
export function isStripeConfigured(): boolean {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  return Boolean(
    secretKey &&
      secretKey.trim() !== "" &&
      webhookSecret &&
      webhookSecret.trim() !== ""
  );
}

/**
 * Verifies Stripe API credentials against live Stripe account.
 */
export async function verifyStripeCredentials(): Promise<{
  success: boolean;
  message: string;
  details?: {
    accountId?: string;
    businessName?: string;
    livemode?: boolean;
    apiVersion?: string;
    testModeConfigured?: boolean;
  };
  envStatus?: {
    hasSecretKey: boolean;
    hasWebhookSecret: boolean;
    hasPublishableKey: boolean;
    hasSiteUrl: boolean;
    apiVersion: string;
    testMode: boolean;
  };
}> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const testMode = isStripeTestMode();
  const apiVersion = getStripeApiVersion();

  const envStatus = {
    hasSecretKey: Boolean(secretKey && secretKey.trim() !== ""),
    hasWebhookSecret: Boolean(webhookSecret && webhookSecret.trim() !== ""),
    hasPublishableKey: Boolean(publishableKey && publishableKey.trim() !== ""),
    hasSiteUrl: Boolean(siteUrl && siteUrl.trim() !== ""),
    apiVersion,
    testMode,
  };

  if (!envStatus.hasSecretKey) {
    return {
      success: false,
      message: "STRIPE_SECRET_KEY is missing or empty in environment variables (.env).",
      envStatus,
    };
  }

  if (!envStatus.hasWebhookSecret) {
    return {
      success: false,
      message: "STRIPE_WEBHOOK_SECRET is missing or empty in environment variables (.env).",
      envStatus,
    };
  }

  try {
    const testStripe = new Stripe(secretKey!.trim(), {
      apiVersion: apiVersion as any,
    });

    const balance = await testStripe.balance.retrieve();

    const isLive = balance.livemode || !testMode;
    const modeLabel = isLive ? "Live Production Mode" : "Test Environment Mode";

    return {
      success: true,
      message: `Stripe API connection verified successfully! (${modeLabel}) [API: ${apiVersion}]`,
      details: {
        livemode: isLive,
        apiVersion,
        testModeConfigured: testMode,
      },
      envStatus,
    };
  } catch (error: any) {
    console.error("[Stripe Verification Error]", error);
    return {
      success: false,
      message: error?.message || "Failed to authenticate with Stripe API using STRIPE_SECRET_KEY.",
      envStatus,
    };
  }
}

/**
 * Helper to generate hosted Stripe Checkout Session.
 */
export async function createStripeCheckoutSession(params: {
  orderNumber: string;
  customerEmail: string;
  totalAmount: number;
  currency: string;
  items: {
    productName: string;
    variantName?: string | null;
    unitPrice: number;
    quantity: number;
    imageUrl?: string | null;
  }[];
  siteUrl: string;
}): Promise<Stripe.Checkout.Session> {
  if (!isStripeConfigured()) {
    throw new Error(
      "Stripe is not configured. Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET."
    );
  }

  const { orderNumber, customerEmail, totalAmount, currency, items, siteUrl } =
    params;

  const rawCurrency = (currency || "usd").toLowerCase().trim();
  const normalizedCurrency =
    /^[a-z]{3}$/.test(rawCurrency) ? rawCurrency : "usd";
  const cleanSiteUrl = siteUrl.replace(/\/$/, "");

  // Helper to format image URLs to absolute HTTP/HTTPS URLs for Stripe
  const formatStripeImageUrl = (url?: string | null): string | undefined => {
    if (!url || !url.trim()) return undefined;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${cleanSiteUrl}${cleanPath}`;
  };

  // Build line items for Stripe Checkout
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
    (item) => {
      const img = formatStripeImageUrl(item.imageUrl);
      return {
        price_data: {
          currency: normalizedCurrency,
          product_data: {
            name: item.productName,
            description: item.variantName ? `Variant: ${item.variantName}` : undefined,
            images: img ? [img] : undefined,
          },
          unit_amount: Math.round(item.unitPrice * 100),
        },
        quantity: item.quantity,
      };
    }
  );

  // Calculate sum of line items to verify if line items match total amount
  const lineItemsSum = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  // If there's a discrepancy (due to shipping cost, tax, or coupon discounts),
  // pass a single aggregated line item for the order total to guarantee exact match.
  let sessionLineItems = lineItems;
  if (Math.abs(lineItemsSum - totalAmount) > 0.01) {
    sessionLineItems = [
      {
        price_data: {
          currency: normalizedCurrency,
          product_data: {
            name: `Order #${orderNumber}`,
            description: `Payment for Order #${orderNumber}`,
          },
          unit_amount: Math.round(totalAmount * 100),
        },
        quantity: 1,
      },
    ];
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: customerEmail,
    line_items: sessionLineItems,
    client_reference_id: orderNumber,
    metadata: {
      order_number: orderNumber,
    },
    success_url: `${cleanSiteUrl}/checkout?success=1&order=${orderNumber}`,
    cancel_url: `${cleanSiteUrl}/checkout?cancelled=1`,
  });

  return session;
}
