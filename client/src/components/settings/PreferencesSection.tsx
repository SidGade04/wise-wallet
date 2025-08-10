import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  theme: string;
  currency: string;
  timezone: string;
  onTheme: (v: string) => void;
  onCurrency: (v: string) => void;
  onTimezone: (v: string) => void;
};

export default function PreferencesSection({ theme, currency, timezone, onTheme, onCurrency, onTimezone }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>App Preferences</CardTitle>
        <CardDescription>Personalize your experience.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Theme</Label>
            <Select value={theme} onValueChange={onTheme}>
              <SelectTrigger>
                <SelectValue placeholder="System" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Default currency</Label>
            <Select value={currency} onValueChange={onCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="USD" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">🇺🇸 USD</SelectItem>
                <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                <SelectItem value="GBP">🇬🇧 GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={onTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="America/Chicago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Chicago">Central (Chicago)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific (Los Angeles)</SelectItem>
                <SelectItem value="America/New_York">Eastern (New York)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}