import { config, CATEGORIES, GEO_ZONES } from "../src/lib/engine/config";
import { monthSpendUsd } from "../src/lib/engine/util/budget";
import { closeDb } from "../src/lib/db";

// Tells you what a LIVE daily run would cost BEFORE you spend anything.
async function main() {
  const fullCalls = GEO_ZONES.length * CATEGORIES.length;
  const cappedCalls = Math.min(fullCalls, config.google.maxCallsPerRun);
  const perCall = config.google.placesCostPer1k / 1000;

  const dailyFull = fullCalls * perCall;
  const dailyCapped = cappedCalls * perCall;
  const monthlyCapped = dailyCapped * 30;
  const spent = await monthSpendUsd();

  console.log("\n========== LIVE COST ESTIMATE (Google Places) ==========");
  console.log(`Zones: ${GEO_ZONES.length}   Categories: ${CATEGORIES.length}`);
  console.log(`Full daily scan        : ${fullCalls} calls  ≈ $${dailyFull.toFixed(2)}`);
  console.log(`MAX_PLACES_CALLS_PER_RUN: ${config.google.maxCallsPerRun}`);
  console.log(`Capped daily scan      : ${cappedCalls} calls  ≈ $${dailyCapped.toFixed(2)}`);
  console.log(`Projected 30-day spend : ≈ $${monthlyCapped.toFixed(2)}`);
  console.log(`Monthly budget cap     : $${config.monthlyBudgetUsd}`);
  console.log(`Spent so far this month: $${spent.toFixed(2)}`);
  if (monthlyCapped > config.monthlyBudgetUsd) {
    const safe = Math.floor(
      (config.monthlyBudgetUsd / 30 / perCall),
    );
    console.log(
      `\n⚠  Projection exceeds cap. Lower MAX_PLACES_CALLS_PER_RUN to ~${safe} ` +
        `to stay within $${config.monthlyBudgetUsd}/mo, or scan every other day.`,
    );
  } else {
    console.log("\n✓ Within budget.");
  }
  console.log("========================================================\n");
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
