import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

type Props = {
  onToggle2FA: (enabled: boolean) => void;
  onChangePassword: (newPass: string) => void;
};

export default function SecuritySection({ onToggle2FA, onChangePassword }: Props) {
  let newPass = "";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>Protect your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Two‑Factor Authentication</p>
            <p className="text-sm text-muted-foreground">Require a code at sign‑in.</p>
          </div>
          <Switch onCheckedChange={onToggle2FA} />
        </div>
        <Separator />
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="password">Change password</Label>
            <Input id="password" type="password" placeholder="New password" onChange={(e) => (newPass = e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => onChangePassword(newPass)}>Update</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
