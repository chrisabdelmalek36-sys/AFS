import { query } from "../db/client.js";
import { config } from "../config.js";
import { log } from "./logger.js";

// Spend so far this calendar month (Cairo time).
export async function monthSpendUsd(): Promise<number> {
  const r = await query<{ total: string }>(
    `SELECT COALESCE(SUM(est_cost_usd),0) AS total
       FROM api_usage
      WHERE date_trunc('month', usage_day)
            = date_trunc('month', (now() AT TIME ZONE 'Africa/Cairo')::date)`,
  );
  return Number(r.rows[0]?.total ?? 0);
}

export class BudgetGuard {
  private spent = 0;
  private monthAlready = 0;
  constructor(private runId: number) {}

  async init(): Promise<void> {
    this.monthAlready = await monthSpendUsd();
    log.info(
      `Budget: $${this.monthAlready.toFixed(2)} spent this month, ` +
        `cap $${config.monthlyBudgetUsd}`,
    );
  }

  remaining(): number {
    return config.monthlyBudgetUsd - this.monthAlready - this.spent;
  }

  // Returns false if the next batch would breach the monthly cap.
  canSpend(costUsd: number): boolean {
    return this.remaining() - costUsd >= 0;
  }

  async record(provider: string, calls: number, costUsd: number): Promise<void> {
    this.spent += costUsd;
    await query(
      `INSERT INTO api_usage (run_id, provider, calls, est_cost_usd)
       VALUES ($1,$2,$3,$4)`,
      [this.runId, provider, calls, costUsd],
    );
    await query(
      `UPDATE crawl_runs SET est_cost_usd = est_cost_usd + $2 WHERE id=$1`,
      [this.runId, costUsd],
    );
  }

  runSpent(): number {
    return this.spent;
  }
}
