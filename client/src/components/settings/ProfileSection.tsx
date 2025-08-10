import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ProfileForm = { full_name: string; email: string };

type Props = {
  form: UseFormReturn<ProfileForm>;
  onSave: (values: ProfileForm) => void;
  saving?: boolean;
};

export default function ProfileSection({ form, onSave, saving }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your personal information.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" {...form.register("full_name")} placeholder="Jane Doe" />
            {form.formState.errors.full_name && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.full_name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} placeholder="jane@example.com" />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={form.handleSubmit(onSave)} disabled={!!saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
