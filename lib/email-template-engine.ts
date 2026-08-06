export interface TemplateVariable {
  name: string;
  description: string;
}

export interface EmailUseCaseDefinition {
  key: string;
  name: string;
  description: string;
  defaultSubject: string;
  availableVariables: TemplateVariable[];
}

export const EMAIL_USE_CASES: EmailUseCaseDefinition[] = [
  {
    key: "invoice",
    name: "Customer Invoice & Order Confirmation",
    description: "Sent to customers after an order is placed, containing complete invoice details and item summary.",
    defaultSubject: "Invoice {{invoice_number}} for Order #{{order_number}} — {{store_name}}",
    availableVariables: [
      { name: "store_name", description: "Name of your store" },
      { name: "store_email", description: "Store contact email" },
      { name: "store_phone", description: "Store contact phone" },
      { name: "store_address", description: "Store business address" },
      { name: "logo_url", description: "URL of your store logo" },
      { name: "storefront_url", description: "Base URL of your storefront website" },
      { name: "invoice_number", description: "Unique invoice reference number (e.g. INV-10042)" },
      { name: "order_number", description: "Unique order reference number (e.g. ORD-9821)" },
      { name: "customer_name", description: "Full name of customer" },
      { name: "customer_email", description: "Email address of customer" },
      { name: "issued_date", description: "Formatted invoice date" },
      { name: "payment_method", description: "Selected payment method name" },
      { name: "status_badge_text", description: "Status text (e.g. PAID or PENDING PAYMENT)" },
      { name: "status_badge_color", description: "Badge CSS color (#16a34a or #ca8a04)" },
      { name: "items_table", description: "HTML table rows of purchased items" },
      { name: "subtotal", description: "Formatted subtotal amount with currency" },
      { name: "discount_row", description: "Formatted HTML discount row (if applicable)" },
      { name: "tax_row", description: "Formatted HTML tax row (if applicable)" },
      { name: "shipping_cost", description: "Formatted shipping cost amount with currency" },
      { name: "total", description: "Formatted total order price with currency" },
      { name: "currency_symbol", description: "Currency symbol (e.g. $)" },
      { name: "notes_section", description: "HTML section displaying customer order notes (if present)" },
      { name: "year", description: "Current year (e.g. 2026)" },
    ],
  },
  {
    key: "order_notification",
    name: "Admin New Order Notification",
    description: "Sent to admin notification email address whenever a new order is received.",
    defaultSubject: "[New Order] #{{order_number}} ({{store_name}})",
    availableVariables: [
      { name: "store_name", description: "Name of your store" },
      { name: "store_email", description: "Store contact email" },
      { name: "store_phone", description: "Store contact phone" },
      { name: "store_address", description: "Store business address" },
      { name: "logo_url", description: "URL of your store logo" },
      { name: "invoice_number", description: "Unique invoice reference number" },
      { name: "order_number", description: "Unique order reference number" },
      { name: "customer_name", description: "Full name of customer" },
      { name: "customer_email", description: "Email address of customer" },
      { name: "issued_date", description: "Formatted invoice date" },
      { name: "payment_method", description: "Selected payment method name" },
      { name: "items_table", description: "HTML table rows of purchased items" },
      { name: "subtotal", description: "Formatted subtotal amount with currency" },
      { name: "discount_row", description: "Formatted HTML discount row (if applicable)" },
      { name: "tax_row", description: "Formatted HTML tax row (if applicable)" },
      { name: "shipping_cost", description: "Formatted shipping cost amount with currency" },
      { name: "total", description: "Formatted total order price with currency" },
      { name: "currency_symbol", description: "Currency symbol (e.g. $)" },
      { name: "notes_section", description: "HTML section displaying customer order notes" },
      { name: "year", description: "Current year" },
    ],
  },
  {
    key: "cod_otp",
    name: "COD Order OTP Verification",
    description: "Sent to customers during Cash on Delivery checkout containing their OTP verification code.",
    defaultSubject: "{{otp_code}} is your order verification code — {{store_name}}",
    availableVariables: [
      { name: "store_name", description: "Name of your store" },
      { name: "customer_name", description: "Customer name or 'there'" },
      { name: "otp_code", description: "6-digit OTP verification code" },
      { name: "expires_minutes", description: "OTP expiration time in minutes" },
      { name: "year", description: "Current year" },
    ],
  },
  {
    key: "order_cancellation_otp",
    name: "Order Cancellation OTP Code",
    description: "Sent to customers when they request to cancel an order to verify authorization.",
    defaultSubject: "{{otp_code}} is your cancellation code for Order #{{order_number}} — {{store_name}}",
    availableVariables: [
      { name: "store_name", description: "Name of your store" },
      { name: "customer_name", description: "Customer name" },
      { name: "order_number", description: "Order number being cancelled" },
      { name: "otp_code", description: "6-digit cancellation OTP code" },
      { name: "expires_minutes", description: "OTP expiration time in minutes" },
      { name: "year", description: "Current year" },
    ],
  },
  {
    key: "order_cancelled_confirmation",
    name: "Order Cancelled Confirmation",
    description: "Sent to customers once an order has been successfully cancelled.",
    defaultSubject: "Order #{{order_number}} Has Been Cancelled — {{store_name}}",
    availableVariables: [
      { name: "store_name", description: "Name of your store" },
      { name: "customer_name", description: "Customer name" },
      { name: "order_number", description: "Order number that was cancelled" },
      { name: "order_details_url", description: "URL link for customer to view order details" },
      { name: "year", description: "Current year" },
    ],
  },
  {
    key: "newsletter_confirmation",
    name: "Newsletter Subscription Confirmation",
    description: "Sent to double opt-in subscribers with a secure token link to confirm their email address.",
    defaultSubject: "Confirm your newsletter subscription — {{store_name}}",
    availableVariables: [
      { name: "store_name", description: "Name of your store" },
      { name: "to_email", description: "Recipient's subscriber email address" },
      { name: "confirmation_url", description: "Signed double opt-in confirmation URL button link" },
      { name: "year", description: "Current year" },
    ],
  },
];

/**
 * Replaces {{variable_name}} and {{ variable_name }} tags in string with values from variables record.
 */
export function renderEmailTemplate(
  templateHtml: string,
  subjectTemplate: string,
  variables: Record<string, any> = {}
): { subject: string; bodyHtml: string } {
  const replaceTags = (text: string): string => {
    if (!text) return "";
    return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      if (Object.prototype.hasOwnProperty.call(variables, key)) {
        const val = variables[key];
        return val !== null && val !== undefined ? String(val) : "";
      }
      return "";
    });
  };

  return {
    subject: replaceTags(subjectTemplate),
    bodyHtml: replaceTags(templateHtml),
  };
}
