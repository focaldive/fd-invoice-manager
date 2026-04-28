import { AppShell } from "@/components/app-shell";
import { getSettings } from "@/server/queries/settings";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <AppShell>
      {settings ? (
        <SettingsForm initialSettings={settings} />
      ) : (
        <p className="text-center text-muted-foreground py-20 text-sm">
          Settings not found. Please check database.
        </p>
      )}
    </AppShell>
  );
}
