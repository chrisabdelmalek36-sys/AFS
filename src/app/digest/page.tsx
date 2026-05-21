import { q } from "@/lib/db";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

interface DigestRow {
  for_date: string;
  status: string;
  provider: string | null;
  sent_to: string | null;
  body: string;
  created_at: string;
}

export default async function DigestPage() {
  const rows = await q<DigestRow>(
    `SELECT to_char(for_date,'YYYY-MM-DD') AS for_date,
            status, provider, sent_to, body, created_at
       FROM digests ORDER BY id DESC LIMIT 1`,
  );
  const d = rows[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Daily digest</h1>
        <p className="text-sm text-slate-500">
          Generated automatically at 07:00 Africa/Cairo and emailed to you.
        </p>
      </div>

      {!d ? (
        <Card>
          <p className="text-sm text-slate-500">
            No digest generated yet. It runs daily at 7 AM, or run{" "}
            <code>cd lead-engine &amp;&amp; npm run digest</code> to generate
            one now.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>
              Date: <b className="text-slate-700">{d.for_date}</b>
            </span>
            <span>
              Delivery:{" "}
              <b
                className={
                  d.status === "sent"
                    ? "text-emerald-700"
                    : d.status === "simulated"
                      ? "text-sky-700"
                      : "text-rose-700"
                }
              >
                {d.status}
              </b>{" "}
              {d.provider ? `(${d.provider})` : ""}
            </span>
            <span>To: {d.sent_to ?? "(AFS_OWNER_EMAIL not set)"}</span>
            <span>
              Built: {new Date(d.created_at).toLocaleString()}
            </span>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 font-sans text-sm text-slate-800">
            {d.body}
          </pre>
        </Card>
      )}
    </div>
  );
}
