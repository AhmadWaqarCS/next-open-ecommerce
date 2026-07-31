import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { generateInvoiceForOrderInDB } from "./invoice-services";

// ─── DB MUTATIONS FOR SENT EMAILS ──────────────────────────────────────────────

export async function createSentEmailInDB(data: {
  type?: string;
  sender_email: string;
  recipient_email: string;
  recipient_name?: string | null;
  subject: string;
  order_number?: string | null;
  status?: string;
  error_message?: string | null;
  body_html: string;
  invoice_id?: number | null;
  order_id?: number | null;
  sent_at?: Date | null;
}) {
  return await prisma.sent_email.create({
    data: {
      type: data.type || "invoice",
      sender_email: data.sender_email,
      recipient_email: data.recipient_email,
      recipient_name: data.recipient_name || null,
      subject: data.subject,
      order_number: data.order_number || null,
      status: data.status || "pending",
      error_message: data.error_message || null,
      body_html: data.body_html,
      invoice_id: data.invoice_id || null,
      order_id: data.order_id || null,
      sent_at: data.sent_at !== undefined ? data.sent_at : new Date(),
    },
  });
}

export async function updateSentEmailInDB(
  id: number,
  data: {
    status?: string;
    error_message?: string | null;
    sent_at?: Date | null;
  },
) {
  return await prisma.sent_email.update({
    where: { id },
    data,
  });
}

export async function getSentEmailByIdFromDB(id: number) {
  return await prisma.sent_email.findUnique({
    where: { id },
  });
}

export interface SendEmailOptions {
  type?: string;
  toEmail: string;
  toName?: string;
  subject: string;
  bodyHtml: string;
  orderNumber?: string;
  orderId?: number;
  invoiceId?: number;
  createdBy?: number;
}

export async function sendEmailWithNodemailer(options: SendEmailOptions) {
  const {
    type = "invoice",
    toEmail,
    toName,
    subject,
    bodyHtml,
    orderNumber,
    orderId,
    invoiceId,
    createdBy = 0,
  } = options;

  const emailConfig = await prisma.email_config.findFirst({
    where: { deleted_at: null, is_active: true },
  });

  const siteConfig = await prisma.site_config.findFirst({
    where: { deleted_at: null },
    select: { name: true, email: true },
  });

  const fromName = emailConfig?.from_name || siteConfig?.name || "Store";
  const fromEmail =
    emailConfig?.from_email || siteConfig?.email || "noreply@store.com";

  const sentEmailRecord = await createSentEmailInDB({
    type,
    sender_email: fromEmail,
    recipient_email: toEmail,
    recipient_name: toName || null,
    subject,
    order_number: orderNumber || null,
    status: "pending",
    body_html: bodyHtml,
    invoice_id: invoiceId || null,
    order_id: orderId || null,
  });

  if (!emailConfig || !emailConfig.smtp_host) {
    console.warn(
      "[sendEmailWithNodemailer] SMTP settings not configured in email_config. Marking email log as unconfigured/failed.",
    );
    await updateSentEmailInDB(sentEmailRecord.id, {
      status: "failed",
      error_message:
        "SMTP settings not configured in dashboard settings. Please configure SMTP host, port, and credentials under Email Config.",
    });
    return {
      success: false,
      sentEmailId: sentEmailRecord.id,
      error: "SMTP not configured.",
    };
  }

  let smtpPassword = "";
  try {
    const smtpSecret = await prisma.secret_vault.findUnique({
      where: { key_name: "smtp_password", deleted_at: null },
    });
    if (smtpSecret) {
      smtpPassword = decryptSecret(
        smtpSecret.encrypted_value,
        smtpSecret.iv,
        smtpSecret.auth_tag,
      );
    }
  } catch (err) {
    console.error(
      "[sendEmailWithNodemailer] Failed to decrypt SMTP password secret:",
      err,
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtp_host,
      port: emailConfig.smtp_port || 587,
      secure: emailConfig.smtp_secure ?? false,
      auth: smtpPassword
        ? {
            user: emailConfig.from_email,
            pass: smtpPassword,
          }
        : undefined,
    });

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      replyTo: emailConfig.reply_to_email || fromEmail,
      to: toName ? `"${toName}" <${toEmail}>` : toEmail,
      subject,
      html: bodyHtml,
    });

    await updateSentEmailInDB(sentEmailRecord.id, {
      status: "successful",
      sent_at: new Date(),
      error_message: null,
    });

    return {
      success: true,
      sentEmailId: sentEmailRecord.id,
    };
  } catch (error: any) {
    console.error("[sendEmailWithNodemailer] Error sending email:", error);
    const errorMessage = error?.message || String(error);

    await updateSentEmailInDB(sentEmailRecord.id, {
      status: "failed",
      error_message: errorMessage,
    });

    return {
      success: false,
      sentEmailId: sentEmailRecord.id,
      error: errorMessage,
    };
  }
}

export async function verifySmtpConnectionService(options?: {
  host?: string | null;
  port?: number | null;
  secure?: boolean;
  fromEmail?: string | null;
  smtpPassword?: string | null;
}): Promise<{ success: boolean; message: string }> {
  try {
    const emailConfig = await prisma.email_config.findFirst({
      where: { deleted_at: null, is_active: true },
    });

    const host = options?.host || emailConfig?.smtp_host;
    const port = options?.port || emailConfig?.smtp_port || 587;
    const secure =
      options?.secure !== undefined
        ? options.secure
        : (emailConfig?.smtp_secure ?? false);
    const userEmail = options?.fromEmail || emailConfig?.from_email;

    if (!host) {
      return { success: false, message: "SMTP host is missing." };
    }

    let password = options?.smtpPassword;
    if (!password) {
      const secret = await prisma.secret_vault.findUnique({
        where: { key_name: "smtp_password" },
      });
      if (secret) {
        password = decryptSecret(
          secret.encrypted_value,
          secret.iv,
          secret.auth_tag,
        );
      }
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure,
      auth: password
        ? {
            user: userEmail || "",
            pass: password,
          }
        : undefined,
    });

    await transporter.verify();
    return {
      success: true,
      message: "SMTP server connection verified successfully!",
    };
  } catch (error: any) {
    console.error("[verifySmtpConnectionService] Verification error:", error);
    return {
      success: false,
      message: error?.message || "Failed to connect to SMTP server.",
    };
  }
}

export function renderInvoiceEmailHtml(params: {
  storeName: string;
  storeEmail?: string;
  storePhone?: string;
  storeAddress?: string;
  logoUrl?: string;
  invoiceNumber: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    product_name: string;
    variant_name?: string | null;
    quantity: number;
    unit_price: number | any;
    line_total: number | any;
  }>;
  subtotal: number | any;
  taxAmount: number | any;
  shippingCost: number | any;
  discountAmount: number | any;
  total: number | any;
  currency: string;
  paymentMethodName: string;
  issuedAt: Date;
  paidAt?: Date | null;
  notes?: string | null;
  isForAdmin?: boolean;
}): string {
  const {
    storeName,
    storeEmail,
    storePhone,
    storeAddress,
    logoUrl,
    invoiceNumber,
    orderNumber,
    customerName,
    customerEmail,
    items,
    subtotal,
    taxAmount,
    shippingCost,
    discountAmount,
    total,
    currency,
    paymentMethodName,
    issuedAt,
    paidAt,
    notes,
    isForAdmin = false,
  } = params;

  const symbol = currency === "USD" ? "$" : `${currency} `;
  const formattedIssuedDate = new Date(issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isPaid = Boolean(paidAt);
  const statusBadgeColor = isPaid ? "#16a34a" : "#ca8a04";
  const statusBadgeText = isPaid ? "PAID" : "ISSUED / PENDING PAYMENT";

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #18181b;">
          <strong>${item.product_name}</strong>
          ${item.variant_name ? `<br/><span style="font-size: 12px; color: #71717a;">${item.variant_name}</span>` : ""}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #18181b; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #18181b; text-align: right;">
          ${symbol}${Number(item.unit_price).toFixed(2)}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #18181b; text-align: right; font-weight: 600;">
          ${symbol}${Number(item.line_total).toFixed(2)}
        </td>
      </tr>
    `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoiceNumber} — ${storeName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
    .container { max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background-color: #18181b; color: #ffffff; padding: 32px; text-align: left; }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 700; tracking-style: tight; }
    .header p { margin: 0; font-size: 14px; color: #a1a1aa; }
    .badge { display: inline-block; padding: 4px 12px; background-color: ${statusBadgeColor}; color: #ffffff; font-size: 12px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; margin-top: 12px; }
    .body { padding: 32px; }
    .meta-grid { display: flex; justify-content: space-between; margin-bottom: 28px; }
    .meta-col { width: 48%; }
    .meta-label { font-size: 11px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .meta-value { font-size: 14px; font-weight: 600; color: #18181b; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; }
    th { background-color: #f4f4f5; padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #52525b; text-transform: uppercase; border-bottom: 2px solid #e4e4e7; }
    .totals { width: 100%; max-width: 280px; margin-left: auto; margin-top: 16px; }
    .totals td { padding: 6px 12px; font-size: 14px; }
    .totals .grand-total td { font-size: 18px; font-weight: 700; border-top: 2px solid #18181b; padding-top: 12px; color: #18181b; }
    .footer { background-color: #f4f4f5; padding: 24px 32px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" alt="${storeName}" style="max-height: 40px; margin-bottom: 16px;" />` : ""}
      <h1>${isForAdmin ? "New Order Received & Invoice Issued" : "Thank you for your order!"}</h1>
      <p>${isForAdmin ? `Order #${orderNumber} has been received.` : `Your invoice ${invoiceNumber} for order #${orderNumber} is ready.`}</p>
      <div class="badge">${statusBadgeText}</div>
    </div>

    <div class="body">
      <table style="width: 100%; border: none; margin-bottom: 24px;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding: 0;">
            <div class="meta-label">Billed To</div>
            <div class="meta-value">${customerName}</div>
            <div style="font-size: 13px; color: #52525b;">${customerEmail}</div>
          </td>
          <td style="width: 50%; vertical-align: top; padding: 0; text-align: right;">
            <div class="meta-label">Invoice Reference</div>
            <div class="meta-value">${invoiceNumber}</div>
            <div class="meta-label">Order Number</div>
            <div class="meta-value">${orderNumber}</div>
            <div class="meta-label">Date Issued</div>
            <div style="font-size: 13px; color: #52525b;">${formattedIssuedDate}</div>
            <div class="meta-label" style="margin-top: 8px;">Payment Method</div>
            <div style="font-size: 13px; color: #52525b;">${paymentMethodName}</div>
          </td>
        </tr>
      </table>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <table class="totals" style="border: none;">
        <tr>
          <td style="color: #71717a;">Subtotal:</td>
          <td style="text-align: right; font-weight: 600;">${symbol}${Number(subtotal).toFixed(2)}</td>
        </tr>
        ${
          Number(discountAmount) > 0
            ? `
        <tr>
          <td style="color: #16a34a;">Discount:</td>
          <td style="text-align: right; font-weight: 600; color: #16a34a;">-${symbol}${Number(discountAmount).toFixed(2)}</td>
        </tr>`
            : ""
        }
        ${
          Number(taxAmount) > 0
            ? `
        <tr>
          <td style="color: #71717a;">Tax:</td>
          <td style="text-align: right; font-weight: 600;">${symbol}${Number(taxAmount).toFixed(2)}</td>
        </tr>`
            : ""
        }
        <tr>
          <td style="color: #71717a;">Shipping:</td>
          <td style="text-align: right; font-weight: 600;">${Number(shippingCost) === 0 ? "Free" : `${symbol}${Number(shippingCost).toFixed(2)}`}</td>
        </tr>
        <tr class="grand-total">
          <td>Total:</td>
          <td style="text-align: right;">${symbol}${Number(total).toFixed(2)}</td>
        </tr>
      </table>

      ${
        notes
          ? `
        <div style="margin-top: 24px; padding: 16px; background-color: #f4f4f5; border-radius: 8px;">
          <div class="meta-label">Notes</div>
          <div style="font-size: 13px; color: #3f3f46;">${notes}</div>
        </div>
      `
          : ""
      }
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0;"><strong>${storeName}</strong></p>
      ${storeAddress ? `<p style="margin: 0 0 4px 0;">${storeAddress}</p>` : ""}
      ${storeEmail ? `<p style="margin: 0;">Contact: ${storeEmail} ${storePhone ? `| ${storePhone}` : ""}</p>` : ""}
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendInvoiceAndOrderEmailsForOrder(
  orderId: number,
  createdBy: number = 0,
) {
  const invoice = await generateInvoiceForOrderInDB(orderId, createdBy);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found.`);
  }

  const siteConfig = await prisma.site_config.findFirst({
    where: { deleted_at: null },
  });
  const storeName = siteConfig?.name || "Our Store";

  const customerHtml = renderInvoiceEmailHtml({
    storeName,
    storeEmail: siteConfig?.email || undefined,
    storePhone: siteConfig?.phone || undefined,
    storeAddress: siteConfig?.address || undefined,
    logoUrl: siteConfig?.light_logo_url || undefined,
    invoiceNumber: invoice.invoice_number,
    orderNumber: order.order_number,
    customerName: invoice.customer_name,
    customerEmail: invoice.customer_email,
    items: order.items,
    subtotal: invoice.subtotal,
    taxAmount: invoice.tax_amount,
    shippingCost: invoice.shipping_cost,
    discountAmount: invoice.discount_amount,
    total: invoice.total,
    currency: invoice.currency,
    paymentMethodName: order.payment_method_name || order.payment_method,
    issuedAt: invoice.issued_at,
    paidAt: invoice.paid_at,
    notes: invoice.notes,
    isForAdmin: false,
  });

  const customerResult = await sendEmailWithNodemailer({
    type: "invoice",
    toEmail: order.customer_email,
    toName: invoice.customer_name,
    subject: `Invoice ${invoice.invoice_number} for Order #${order.order_number} — ${storeName}`,
    bodyHtml: customerHtml,
    orderNumber: order.order_number,
    orderId: order.id,
    invoiceId: invoice.id,
    createdBy,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { confirmation_sent_at: new Date() },
  });

  const emailConfig = await prisma.email_config.findFirst({
    where: { deleted_at: null },
  });

  if (
    emailConfig &&
    emailConfig.send_admin_new_order &&
    emailConfig.admin_notification_email
  ) {
    const adminHtml = renderInvoiceEmailHtml({
      storeName,
      storeEmail: siteConfig?.email || undefined,
      storePhone: siteConfig?.phone || undefined,
      storeAddress: siteConfig?.address || undefined,
      logoUrl: siteConfig?.light_logo_url || undefined,
      invoiceNumber: invoice.invoice_number,
      orderNumber: order.order_number,
      customerName: invoice.customer_name,
      customerEmail: invoice.customer_email,
      items: order.items,
      subtotal: invoice.subtotal,
      taxAmount: invoice.tax_amount,
      shippingCost: invoice.shipping_cost,
      discountAmount: invoice.discount_amount,
      total: invoice.total,
      currency: invoice.currency,
      paymentMethodName: order.payment_method_name || order.payment_method,
      issuedAt: invoice.issued_at,
      paidAt: invoice.paid_at,
      notes: invoice.notes,
      isForAdmin: true,
    });

    await sendEmailWithNodemailer({
      type: "order_notification",
      toEmail: emailConfig.admin_notification_email,
      toName: "Store Admin",
      subject: `[New Order] #${order.order_number} (${storeName})`,
      bodyHtml: adminHtml,
      orderNumber: order.order_number,
      orderId: order.id,
      invoiceId: invoice.id,
      createdBy,
    });
  }

  return {
    invoice,
    customerResult,
  };
}
