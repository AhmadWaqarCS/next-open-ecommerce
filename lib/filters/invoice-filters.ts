import { Prisma } from "@/lib/generated/prisma/client";

export interface InvoiceFilterParams {
  id?: string;
  invoice_number?: string;
  order_number?: string;
  customer_name?: string;
  customer_email?: string;
  status?: string;
  min_total?: string;
  max_total?: string;
  issued_from?: string;
  issued_to?: string;
  paid_from?: string;
  paid_to?: string;
  created_by?: string;
  updated_by?: string;
  created_from?: string;
  created_to?: string;
  updated_from?: string;
  updated_to?: string;
}

export function buildInvoiceWhereInput(
  params: InvoiceFilterParams,
): Prisma.invoiceWhereInput {
  const where: Prisma.invoiceWhereInput = {};

  if (params.id && !isNaN(Number(params.id))) {
    where.id = Number(params.id);
  }

  const andConditions: Prisma.invoiceWhereInput[] = [];

  // Main search / invoice_number
  if (params.invoice_number?.trim()) {
    const query = params.invoice_number.trim();
    andConditions.push({
      OR: [
        { invoice_number: { contains: query, mode: "insensitive" } },
        { order: { order_number: { contains: query, mode: "insensitive" } } },
        { customer_name: { contains: query, mode: "insensitive" } },
        { customer_email: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  // Order number direct filter
  if (params.order_number?.trim()) {
    andConditions.push({
      order: {
        order_number: { contains: params.order_number.trim(), mode: "insensitive" },
      },
    });
  }

  // Customer Name filter
  if (params.customer_name?.trim()) {
    andConditions.push({
      customer_name: { contains: params.customer_name.trim(), mode: "insensitive" },
    });
  }

  // Customer Email filter
  if (params.customer_email?.trim()) {
    andConditions.push({
      customer_email: { contains: params.customer_email.trim(), mode: "insensitive" },
    });
  }

  // Status filter
  if (params.status?.trim() && params.status !== "all") {
    where.status = params.status.trim();
  }

  // Numeric bounds on total
  if (params.min_total !== undefined && params.min_total !== "") {
    const minVal = Number(params.min_total);
    if (!isNaN(minVal)) {
      where.total = {
        ...((where.total as Prisma.DecimalFilter) || {}),
        gte: minVal,
      };
    }
  }

  if (params.max_total !== undefined && params.max_total !== "") {
    const maxVal = Number(params.max_total);
    if (!isNaN(maxVal)) {
      where.total = {
        ...((where.total as Prisma.DecimalFilter) || {}),
        lte: maxVal,
      };
    }
  }

  // Issued at date range
  if (params.issued_from || params.issued_to) {
    const issuedCondition: Prisma.DateTimeFilter = {};
    if (params.issued_from) {
      const fromDate = new Date(params.issued_from);
      if (!isNaN(fromDate.getTime())) {
        fromDate.setHours(0, 0, 0, 0);
        issuedCondition.gte = fromDate;
      }
    }
    if (params.issued_to) {
      const toDate = new Date(params.issued_to);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        issuedCondition.lte = toDate;
      }
    }
    if (issuedCondition.gte || issuedCondition.lte) {
      where.issued_at = issuedCondition;
    }
  }

  // Paid at date range
  if (params.paid_from || params.paid_to) {
    const paidCondition: Prisma.DateTimeNullableFilter = {};
    if (params.paid_from) {
      const fromDate = new Date(params.paid_from);
      if (!isNaN(fromDate.getTime())) {
        fromDate.setHours(0, 0, 0, 0);
        paidCondition.gte = fromDate;
      }
    }
    if (params.paid_to) {
      const toDate = new Date(params.paid_to);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        paidCondition.lte = toDate;
      }
    }
    if (paidCondition.gte || paidCondition.lte) {
      where.paid_at = paidCondition;
    }
  }

  // Audit user filters
  if (params.created_by && !isNaN(Number(params.created_by))) {
    where.created_by = Number(params.created_by);
  }

  if (params.updated_by && !isNaN(Number(params.updated_by))) {
    where.updated_by = Number(params.updated_by);
  }

  // Created at date range
  if (params.created_from || params.created_to) {
    const createdCondition: Prisma.DateTimeFilter = {};
    if (params.created_from) {
      const fromDate = new Date(params.created_from);
      if (!isNaN(fromDate.getTime())) {
        fromDate.setHours(0, 0, 0, 0);
        createdCondition.gte = fromDate;
      }
    }
    if (params.created_to) {
      const toDate = new Date(params.created_to);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        createdCondition.lte = toDate;
      }
    }
    if (createdCondition.gte || createdCondition.lte) {
      where.created_at = createdCondition;
    }
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}
