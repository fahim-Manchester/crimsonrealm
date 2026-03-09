import { useTheme } from "@/contexts/ThemeContext";
import PageLayout from "@/components/layout/PageLayout";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  const { themeConfig } = useTheme();
  const labels = themeConfig.labels;
  return (
    <PageLayout title={labels.settings} subtitle={labels.settingsSubtitle}>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
          <SettingsIcon className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="font-cinzel text-2xl mb-4 text-muted-foreground">
          Coming Soon
        </h2>
        <p className="font-crimson text-muted-foreground italic max-w-md">
          The arcane mechanisms of configuration are still being forged. Return when the moon waxes full...
        </p>
      </div>
    </PageLayout>
  );
};

export default Settings;
