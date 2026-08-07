import prisma from "@/lib/prisma";

export interface CreateCampaignOptions {
  name: string;
  strategy?: "single" | "per_recipient";
  subject?: string | null;
  body_html?: string | null;
  email_config_id?: number | null;
  template_id?: number | null;
  contact_ids?: number[];
  group_id?: number;
  scheduled_at?: Date | null;
}

export async function createEmailCampaignTransaction(
  options: CreateCampaignOptions,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const campaign = await tx.email_campaign.create({
      data: {
        name: options.name,
        strategy: options.strategy || "single",
        subject: options.subject || null,
        body_html: options.body_html || null,
        email_config_id: options.email_config_id || null,
        template_id: options.template_id || null,
        scheduled_at: options.scheduled_at || null,
        status: options.scheduled_at ? "scheduled" : "draft",
        created_by: userId,
        updated_by: userId,
      },
    });

    const targetContactIds = new Set<number>(options.contact_ids || []);

    if (options.group_id) {
      const groupMembers = await tx.email_group_member.findMany({
        where: { group_id: options.group_id },
        select: { customer_contact_id: true },
      });
      for (const m of groupMembers) {
        targetContactIds.add(m.customer_contact_id);
      }
    }

    if (targetContactIds.size > 0) {
      for (const contactId of Array.from(targetContactIds)) {
        await tx.email_campaign_recipient.create({
          data: {
            campaign_id: campaign.id,
            customer_contact_id: contactId,
            status: "pending",
          },
        });
      }

      await tx.email_campaign.update({
        where: { id: campaign.id },
        data: { total_recipients: targetContactIds.size },
      });
    }

    return campaign;
  });
}

export async function updateEmailCampaignTransaction(
  id: number,
  data: {
    name?: string;
    strategy?: "single" | "per_recipient";
    subject?: string | null;
    body_html?: string | null;
    email_config_id?: number | null;
    template_id?: number | null;
    scheduled_at?: Date | null;
    status?: string;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.email_campaign.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Campaign not found");
    }

    // STRICT LOCK RULE: If sent_count > 0, cannot be updated!
    if (existing.sent_count > 0) {
      throw new Error(
        "Locked Campaign: This campaign has already sent emails to recipients and cannot be modified.",
      );
    }

    return await tx.email_campaign.update({
      where: { id },
      data: {
        ...data,
        updated_by: userId,
      },
    });
  });
}

export async function deleteEmailCampaignTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.email_campaign.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Campaign not found");
    }

    // STRICT LOCK RULE: If sent_count > 0, cannot be deleted!
    if (existing.sent_count > 0) {
      throw new Error(
        "Locked Campaign: This campaign has active sent history and cannot be deleted.",
      );
    }

    await tx.email_campaign_recipient.deleteMany({
      where: { campaign_id: id },
    });

    return await tx.email_campaign.delete({
      where: { id },
    });
  });
}

export async function addRecipientsToCampaignTransaction(
  campaignId: number,
  contactIds: number[],
) {
  return await prisma.$transaction(async (tx) => {
    const campaign = await tx.email_campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.sent_count > 0) {
      throw new Error(
        "Locked Campaign: Cannot add recipients to an already executing/completed campaign.",
      );
    }

    for (const contactId of contactIds) {
      const existing = await tx.email_campaign_recipient.findUnique({
        where: {
          campaign_id_customer_contact_id: {
            campaign_id: campaignId,
            customer_contact_id: contactId,
          },
        },
      });

      if (!existing) {
        await tx.email_campaign_recipient.create({
          data: {
            campaign_id: campaignId,
            customer_contact_id: contactId,
            status: "pending",
          },
        });
      }
    }

    const totalRecipients = await tx.email_campaign_recipient.count({
      where: { campaign_id: campaignId },
    });

    return await tx.email_campaign.update({
      where: { id: campaignId },
      data: { total_recipients: totalRecipients },
    });
  });
}

export async function updateRecipientCustomContentTransaction(
  recipientId: number,
  customSubject?: string | null,
  customBodyHtml?: string | null,
) {
  return await prisma.$transaction(async (tx) => {
    const recipient = await tx.email_campaign_recipient.findUnique({
      where: { id: recipientId },
      include: { campaign: true },
    });

    if (!recipient) {
      throw new Error("Recipient not found");
    }

    if (recipient.campaign.sent_count > 0) {
      throw new Error(
        "Locked Campaign: Cannot modify recipient content once campaign execution has started.",
      );
    }

    return await tx.email_campaign_recipient.update({
      where: { id: recipientId },
      data: {
        custom_subject: customSubject,
        custom_body_html: customBodyHtml,
      },
    });
  });
}

export async function updateCampaignRecipientStatusInDB(
  recipientId: number,
  status: "sent" | "failed",
  errorMessage?: string | null,
) {
  return await prisma.$transaction(async (tx) => {
    const recipient = await tx.email_campaign_recipient.update({
      where: { id: recipientId },
      data: {
        status,
        sent_at: status === "sent" ? new Date() : null,
        error_message: errorMessage || null,
      },
    });

    const campaignId = recipient.campaign_id;
    const sentCount = await tx.email_campaign_recipient.count({
      where: { campaign_id: campaignId, status: "sent" },
    });
    const failedCount = await tx.email_campaign_recipient.count({
      where: { campaign_id: campaignId, status: "failed" },
    });
    const totalRecipients = await tx.email_campaign_recipient.count({
      where: { campaign_id: campaignId },
    });

    let campaignStatus = "sending";
    if (sentCount + failedCount >= totalRecipients) {
      if (failedCount === 0) {
        campaignStatus = "completed";
      } else if (sentCount === 0) {
        campaignStatus = "failed";
      } else {
        campaignStatus = "partially_failed";
      }
    }

    await tx.email_campaign.update({
      where: { id: campaignId },
      data: {
        sent_count: sentCount,
        failed_count: failedCount,
        status: campaignStatus,
        sent_at: sentCount > 0 ? new Date() : undefined,
      },
    });

    return recipient;
  });
}

export async function getEmailCampaignsDashboardDataInDB(
  where?: any,
  skip: number = 0,
  take: number = 10,
) {
  const [campaigns, totalCount] = await prisma.$transaction([
    prisma.email_campaign.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
      include: {
        email_config: {
          select: { id: true, name: true, purpose: true },
        },
        template: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.email_campaign.count({ where }),
  ]);

  return { campaigns, totalCount };
}
