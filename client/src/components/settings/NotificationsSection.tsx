import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

type Props = {
  emailWeekly: boolean;
  inAppAlerts: boolean;
  onChange: (v: { emailWeekly: boolean; inAppAlerts: boolean }) => void;
};

export default function NotificationsSection({ emailWeekly, inAppAlerts, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Choose what you’d like to hear about.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Weekly email summary</p>
            <p className="text-sm text-muted-foreground">Spending, investments, and subscriptions at a glance.</p>
          </div>
          <Switch checked={emailWeekly} onCheckedChange={(v) => onChange({ emailWeekly: v, inAppAlerts })} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">In‑app alerts</p>
            <p className="text-sm text-muted-foreground">Bill due dates, unusual transactions, and goals.</p>
          </div>
          <Switch checked={inAppAlerts} onCheckedChange={(v) => onChange({ emailWeekly, inAppAlerts: v })} />
        </div>
      </CardContent>
    </Card>
  );
}
