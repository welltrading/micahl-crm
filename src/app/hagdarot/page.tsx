import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HagdarotPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://YOUR-RAILWAY-DOMAIN';
  const webhookUrl = `${appUrl}/api/webhook/contact`;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold mb-1">הגדרות</h1>
        <p className="text-muted-foreground text-sm">
          הגדרות אלו נדרשות פעם אחת בלבד בהקמת המערכת
        </p>
      </div>

      {/* GREEN API Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">חיבור GREEN API</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 list-decimal list-inside text-sm leading-relaxed">
            <li>כנסי לאתר <strong>green-api.com</strong> וצרי חשבון</li>
            <li>
              צרי Instance חדש — בחרי בתוכנית המתאימה לנפח ההודעות שלך
            </li>
            <li>
              העתיקי את ה-<strong>Instance ID</strong> ואת ה-<strong>API Token</strong> מדף ה-Instance
            </li>
            <li>
              הכניסי את הערכים ב-Railway Environment Variables:
              <ul className="mt-2 ms-6 space-y-1 list-none">
                <li>
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">GREEN_API_INSTANCE_ID</code>
                  {' '}— מזהה ה-Instance
                </li>
                <li>
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">GREEN_API_TOKEN</code>
                  {' '}— הטוקן שלך
                </li>
              </ul>
            </li>
            <li>
              חברי את חשבון הוואטסאפ שלך ל-Instance דרך ממשק GREEN API (סריקת QR)
            </li>
            <li>שמרי ואתחלי מחדש את השירות ב-Railway</li>
          </ol>
        </CardContent>
      </Card>

      {/* MAKE.com Webhook Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">הגדרת Webhook מ-MAKE.com</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Webhook URL display */}
          <div>
            <p className="text-sm font-medium mb-2">כתובת ה-Webhook שלך:</p>
            <code className="block bg-muted rounded-md px-4 py-3 text-sm break-all select-all">
              {webhookUrl}
            </code>
          </div>

          <ol className="space-y-3 list-decimal list-inside text-sm leading-relaxed">
            <li>
              פתחי את ה-Scenario ב-MAKE.com שמקבל נרשמות מרב מסר
            </li>
            <li>
              הוסיפי מודול <strong>HTTP &gt; Make a request</strong> בסוף ה-Scenario
            </li>
            <li>
              הגדירי:
              <ul className="mt-2 ms-6 space-y-1.5 list-none text-xs">
                <li>
                  <span className="font-medium">URL:</span>{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">{webhookUrl}</code>
                </li>
                <li>
                  <span className="font-medium">Method:</span> POST
                </li>
                <li>
                  <span className="font-medium">Body type:</span> JSON
                </li>
                <li>
                  <span className="font-medium">Body:</span>{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">
                    {'{ "full_name": "שם", "phone": "טלפון" }'}
                  </code>
                </li>
              </ul>
            </li>
            <li>שמרי והפעילי את ה-Scenario</li>
            <li>בדקי שנרשמת חדשה מופיעה ב-CRM תוך מספר שניות</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
