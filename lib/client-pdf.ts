"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface InvoicePdfItem {
  name: string;
  variant?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoicePdfData {
  storeName: string;
  storeAddress?: string;
  storeEmail?: string;
  businessRegNumber?: string;
  invoiceNumber: string;
  orderNumber: string;
  issuedAt: string;
  paidAt?: string | null;
  status: string;
  customerName: string;
  customerEmail: string;
  billingAddress?: string;
  paymentMethod: string;
  paymentStatus: string;
  currency: string;
  items: InvoicePdfItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingCost: number;
  total: number;
  notes?: string | null;
}

export async function generateInvoicePdfFromData(
  data: InvoicePdfData,
  fileName?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const primaryColor = [79, 70, 229]; // Indigo #4F46E5
    const darkTextColor = [30, 41, 59]; // Slate 800
    const lightTextColor = [100, 116, 139]; // Slate 500

    let currentY = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(data.storeName.toUpperCase(), 15, currentY);

    // Invoice Status Badge (Top Right)
    const isPaid = data.status.toLowerCase() === "paid";
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    if (isPaid) {
      doc.setFillColor(209, 250, 229); // Emerald 100
      doc.setTextColor(6, 95, 70); // Emerald 800
    } else {
      doc.setFillColor(254, 243, 199); // Amber 100
      doc.setTextColor(146, 64, 14); // Amber 800
    }
    const badgeText = data.status.toUpperCase();
    const badgeWidth = doc.getTextWidth(badgeText) + 8;
    doc.roundedRect(195 - badgeWidth, currentY - 6, badgeWidth, 8, 2, 2, "F");
    doc.text(badgeText, 195 - badgeWidth + 4, currentY - 0.5);

    currentY += 8;

    // Store Meta Details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);

    if (data.businessRegNumber) {
      doc.text(`Reg / Tax ID: ${data.businessRegNumber}`, 15, currentY);
      currentY += 4.5;
    }
    if (data.storeAddress) {
      const splitAddress = doc.splitTextToSize(data.storeAddress, 90);
      doc.text(splitAddress, 15, currentY);
      currentY += splitAddress.length * 4.5;
    }
    if (data.storeEmail) {
      doc.text(data.storeEmail, 15, currentY);
      currentY += 4.5;
    }

    // Invoice Number & Dates (Top Right)
    let rightY = 32;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(data.invoiceNumber, 195, rightY, { align: "right" });

    rightY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
    doc.text(`Order Ref: ${data.orderNumber}`, 195, rightY, { align: "right" });

    rightY += 4.5;
    doc.text(`Issued: ${data.issuedAt}`, 195, rightY, { align: "right" });

    if (data.paidAt) {
      rightY += 4.5;
      doc.setTextColor(6, 95, 70);
      doc.text(`Paid: ${data.paidAt}`, 195, rightY, { align: "right" });
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, currentY, 195, currentY);

    currentY += 8;

    const sectionY = currentY;

    // Billed To Column
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
    doc.text("BILLED TO", 15, sectionY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(data.customerName, 15, sectionY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
    doc.text(data.customerEmail, 15, sectionY + 10);

    let billedToBottom = sectionY + 15;
    if (data.billingAddress) {
      const splitBill = doc.splitTextToSize(data.billingAddress, 80);
      doc.text(splitBill, 15, billedToBottom);
      billedToBottom += splitBill.length * 4.5;
    }

    // Payment Details Column (Right)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
    doc.text("PAYMENT DETAILS", 115, sectionY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(data.paymentMethod, 115, sectionY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
    doc.text(`Payment Status: ${data.paymentStatus}`, 115, sectionY + 10);

    currentY = Math.max(billedToBottom, sectionY + 18);

    const currencySymbol = data.currency === "USD" ? "$" : `${data.currency} `;

    const tableRows = data.items.map((item) => [
      item.variant ? `${item.name}\n(${item.variant})` : item.name,
      String(item.quantity),
      `${currencySymbol}${item.unitPrice.toFixed(2)}`,
      `${currencySymbol}${item.total.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["Item Description", "Qty", "Unit Price", "Total"]],
      body: tableRows,
      margin: { left: 15, right: 15 },
      theme: "striped",
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        textColor: [30, 41, 59],
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: 35, halign: "right" },
        3: { cellWidth: 35, halign: "right" },
      },
    });

    // @ts-ignore
    currentY = (doc as any).lastAutoTable.finalY + 8;

    const totalsLeft = 120;
    doc.setFontSize(9);

    // Subtotal
    doc.setFont("helvetica", "normal");
    doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
    doc.text("Subtotal:", totalsLeft, currentY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(
      `${currencySymbol}${data.subtotal.toFixed(2)}`,
      195,
      currentY,
      { align: "right" },
    );
    currentY += 5;

    // Discount
    if (data.discountAmount > 0) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(16, 185, 129); // Emerald 500
      doc.text("Discount:", totalsLeft, currentY);
      doc.setFont("helvetica", "bold");
      doc.text(
        `-${currencySymbol}${data.discountAmount.toFixed(2)}`,
        195,
        currentY,
        { align: "right" },
      );
      currentY += 5;
    }

    // Tax
    if (data.taxAmount > 0) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
      doc.text("Tax:", totalsLeft, currentY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      doc.text(
        `${currencySymbol}${data.taxAmount.toFixed(2)}`,
        195,
        currentY,
        { align: "right" },
      );
      currentY += 5;
    }

    // Shipping
    doc.setFont("helvetica", "normal");
    doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
    doc.text("Shipping:", totalsLeft, currentY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(
      data.shippingCost === 0
        ? "Free"
        : `${currencySymbol}${data.shippingCost.toFixed(2)}`,
      195,
      currentY,
      { align: "right" },
    );
    currentY += 6;

    // Total Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(totalsLeft, currentY, 195, currentY);
    currentY += 6;

    // Grand Total
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text("Total:", totalsLeft, currentY);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(
      `${currencySymbol}${data.total.toFixed(2)}`,
      195,
      currentY,
      { align: "right" },
    );
    currentY += 10;

    // ─── NOTES SECTION ────────────────────────────────────────────────────────
    if (data.notes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
      doc.text("Notes:", 15, currentY);
      currentY += 4.5;
      doc.setFont("helvetica", "normal");
      const splitNotes = doc.splitTextToSize(data.notes, 180);
      doc.text(splitNotes, 15, currentY);
    }

    const outFileName = fileName || `${data.invoiceNumber}.pdf`;
    doc.save(outFileName);
    return { success: true };
  } catch (error: any) {
    console.error("[generateInvoicePdfFromData] PDF Generation error:", error);
    return {
      success: false,
      error: error?.message || "Failed to generate invoice PDF template.",
    };
  }
}
