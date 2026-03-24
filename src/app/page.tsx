import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCampaigns } from "@/lib/airtable/campaigns";
import { getContacts } from "@/lib/airtable/contacts";

export default async function Home() {
  const [campaigns, contacts] = await Promise.all([
    getCampaigns(),
    getContacts(),
  ]);

  const activeCampaigns = campaigns.filter((c) => c.status === "active" || c.status === "future").length;
  const totalContacts = contacts.length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ברוכה הבאה, מיכל</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              קמפיינים פעילים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeCampaigns}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              אנשי קשר
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalContacts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              הודעות שנשלחו החודש
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
          </CardContent>
        </Card>
      </div>

      {/* GREEN API status */}
      <Card>
        <CardContent className="flex items-center gap-3 pt-6">
          <span className="h-3 w-3 rounded-full bg-gray-400 shrink-0" />
          <span className="text-sm text-muted-foreground">
            סטטוס GREEN API: לא מוגדר
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
