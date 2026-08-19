"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type CompliancePoint = { pool_name: string; compliance_pct: number };

export function ComplianceChart({ data }: { data: CompliancePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No active pools to chart yet.
      </div>
    );
  }

  return (
    <div className="h-64 rounded-lg border border-border bg-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="pool_name"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            formatter={(value: number) => [`${value}%`, "Compliance"]}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
              fontSize: 12,
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Bar dataKey="compliance_pct" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
