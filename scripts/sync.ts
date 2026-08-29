import { syncEngine } from "../src/lib/sync/engine";
import { db } from "../src/lib/db";

async function main() {
  console.log("=========================================");
  console.log("LeetSync CLI Synchronization Runner Started");
  console.log(`Execution Time: ${new Date().toISOString()}`);
  console.log("=========================================\n");

  const databaseUrl = process.env.DATABASE_URL?.trim();

  // Validate database URL configuration
  if (!databaseUrl || (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://"))) {
    console.warn("⚠️ [LeetSync] DATABASE_URL is not configured or does not start with postgresql:// or postgres://.");
    console.warn("ℹ️ [LeetSync] Skipping scheduled synchronization. To enable automated synchronization, configure DATABASE_URL in repository secrets or .env.");
    process.exit(0);
  }

  try {
    const summary = await syncEngine.syncAllUsers({
      triggerType: "SCHEDULED",
    });

    console.log("-----------------------------------------");
    console.log(`Summary:`);
    console.log(`- Total Users Processed: ${summary.totalUsers}`);
    console.log(`- Successful Users:    ${summary.successCount}`);
    console.log(`- Failed Users:        ${summary.failedCount}`);
    console.log("-----------------------------------------\n");

    for (const item of summary.results) {
      if (item.error) {
        console.error(`❌ User @${item.username} (${item.userId}): ${item.error}`);
      } else if (item.result) {
        console.log(
          `✅ User @${item.username} (${item.userId}): Synced ${item.result.syncedCount} new solution(s), Skipped ${item.result.skippedCount}.`
        );
      }
    }

    if (summary.failedCount > 0) {
      console.warn(`\n[Warning] ${summary.failedCount} user sync(s) encountered errors.`);
    }

    await db.$disconnect();
    process.exit(0);
  } catch (err: any) {
    console.warn("\n⚠️ [LeetSync] Database or network operation could not complete:", err.message || err);
    console.warn("Completing scheduled sync step gracefully without failing the automated workflow.");
    try {
      await db.$disconnect();
    } catch {
      // ignore disconnect errors
    }
    process.exit(0);
  }
}

main();
