export async function register() {
  if (process.env.ENABLE_EMAIL_CRON === "true") {
    const globalForWorker = global as unknown as {
      __emailCampaignInterval?: NodeJS.Timeout;
    };

    if (!globalForWorker.__emailCampaignInterval) {
      console.log(
        "⚡ [Background Worker] Initializing scheduled email campaign worker (60s interval)...",
      );

      const { processDueScheduledCampaigns } =
        await import("@/lib/email-scheduler");

      // Run immediate check on server boot
      processDueScheduledCampaigns().catch((err) => {
        console.error("[Background Worker] Initial check error:", err);
      });

      // Run background worker every 60 seconds
      globalForWorker.__emailCampaignInterval = setInterval(async () => {
        try {
          await processDueScheduledCampaigns();
        } catch (err) {
          console.error("[Background Worker] Scheduled check error:", err);
        }
      }, 60000);
    }
  }
}
