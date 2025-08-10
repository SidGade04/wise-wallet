import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Props = {
  exporting?: boolean;
  deleting?: boolean;
  onExport: () => void;
  onDelete: () => void;
};

export default function PrivacySection({ exporting, deleting, onExport, onDelete }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data & Privacy</CardTitle>
        <CardDescription>Control your data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onExport} disabled={!!exporting}>
            {exporting ? "Preparing..." : "Export my data"}
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={!!deleting}>
            {deleting ? "Deleting..." : "Delete account"}
          </Button>
        </div>
        <Separator />
        <p className="text-xs text-muted-foreground">
          You can also review our Privacy Policy and how we use your data in analytics and the AI assistant.
        </p>
      </CardContent>
    </Card>
  );
}
