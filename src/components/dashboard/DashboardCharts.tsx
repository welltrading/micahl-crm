"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6"];

interface Props {
  campaigns: { id: string; campaign_name: string }[];
  interestedCountsMap: Record<string, number>;
  enrollmentCounts: Record<string, number>;
  sentCountsByCampaign: Record<string, number>;
}

export function DashboardCharts({
  campaigns,
  interestedCountsMap,
  enrollmentCounts,
  sentCountsByCampaign,
}: Props) {
  const pieData = campaigns
    .map((c) => ({ name: c.campaign_name, value: interestedCountsMap[c.id] ?? 0 }))
    .filter((entry) => entry.value !== 0);

  const barData = campaigns.map((c) => ({
    name: c.campaign_name,
    נרשמות: enrollmentCounts[c.id] ?? 0,
    מתעניינות: interestedCountsMap[c.id] ?? 0,
    "הודעות שנשלחו": sentCountsByCampaign[c.id] ?? 0,
  }));

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Pie Chart */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-base">חלוקת מתעניינות לפי קמפיין</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">אין נתונים</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name">
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ direction: "rtl" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-base">השוואת קמפיינים</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-30}
                textAnchor="end"
                height={50}
              />
              <YAxis />
              <Tooltip />
              <Legend wrapperStyle={{ direction: "rtl" }} />
              <Bar dataKey="נרשמות" fill="#10b981" />
              <Bar dataKey="מתעניינות" fill="#6366f1" />
              <Bar dataKey="הודעות שנשלחו" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
