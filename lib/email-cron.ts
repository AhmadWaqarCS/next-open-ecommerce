import { processDueScheduledCampaigns } from "@/lib/email-scheduler";

let cronInitialized = false;

export function initEmailCronDaemon() {
  // CRITICAL: Protect with env var so node-cron does NOT run automatically or waste CPU/RAM!
  if (process.env.ENABLE_EMAIL_CRON !== "true") {
    return;
  }

  if (cronInitialized) return;
  cronInitialized = true;

  try {
    const cron = require("node-cron");
    console.log("[EmailCron] Initializing node-cron scheduler for email campaigns...");

    // Run every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
      console.log("[EmailCron] Checking due scheduled campaigns...");
      try {
        await processDueScheduledCampaigns();
      } catch (err) {
        console.error("[EmailCron] Error during scheduled campaign run:", err);
      }
    });
  } catch (err) {
    console.warn("[EmailCron] node-cron package not found or failed to initialize:", err);
  }
}
