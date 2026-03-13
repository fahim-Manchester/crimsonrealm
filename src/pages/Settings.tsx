import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import PageLayout from "@/components/layout/PageLayout";
import { Settings as SettingsIcon, Lock, Unlock, Phone, MessageSquare, Info } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const SECRET_CODE = "GDG26";

const Settings = () => {
  const { themeConfig } = useTheme();
  const labels = themeConfig.labels;
  const { user } = useAuth();
  const { settings, loading, upsertSettings } = useUserSettings();

  const [codeInput, setCodeInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync local state when settings load
  const isUnlocked = settings?.external_unlocked ?? false;

  const handleUnlock = async () => {
    if (codeInput.trim().toUpperCase() !== SECRET_CODE) {
      toast.error("Invalid code");
      return;
    }
    try {
      setSaving(true);
      await upsertSettings({ external_unlocked: true });
      toast.success("External Connections unlocked!");
      setCodeInput("");
    } catch {
      toast.error("Failed to unlock");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePhone = async () => {
    const phone = phoneInput.trim();
    if (!phone) {
      toast.error("Enter a phone number");
      return;
    }
    // Basic international format validation
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      toast.error("Use international format: +1234567890");
      return;
    }
    try {
      setSaving(true);
      await upsertSettings({
        phone_number: phone,
        sms_enabled: smsConsent,
      });
      toast.success("Phone settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSms = async (checked: boolean) => {
    setSmsConsent(checked);
    if (settings?.phone_number) {
      try {
        await upsertSettings({ sms_enabled: checked });
      } catch {
        toast.error("Failed to update SMS preference");
      }
    }
  };

  if (!user) {
    return (
      <PageLayout title={labels.settings} subtitle={labels.settingsSubtitle}>
        <div className="text-center py-12 text-muted-foreground">
          Sign in to access settings.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={labels.settings} subtitle={labels.settingsSubtitle}>
      <div className="max-w-xl mx-auto space-y-8 py-8">
        {/* External Connections */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="font-cinzel text-lg flex items-center gap-2">
              {isUnlocked ? (
                <Unlock className="w-5 h-5 text-primary" />
              ) : (
                <Lock className="w-5 h-5 text-muted-foreground" />
              )}
              External Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isUnlocked ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground font-crimson">
                  Enter the secret code to unlock external connections.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Enter code..."
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleUnlock}
                    disabled={saving || !codeInput.trim()}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Unlock
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>SMS Reminder Access</AlertTitle>
                  <AlertDescription>
                    Phone numbers can be linked to your account, but SMS reminders are currently limited to approved demo numbers. If you would like to test the SMS reminder feature, please contact the developer so your number can be verified in Twilio for the demo build.
                  </AlertDescription>
                </Alert>

                {/* Phone Number */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <Label className="font-cinzel text-sm">Phone Number</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    International format (e.g. +15551234567)
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      placeholder="+15551234567"
                      value={phoneInput || settings?.phone_number || ""}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSavePhone}
                      disabled={saving}
                      variant="outline"
                      className="border-primary/50"
                    >
                      Save
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* SMS Consent */}
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="sms-consent"
                    checked={smsConsent || settings?.sms_enabled || false}
                    onCheckedChange={(checked) =>
                      handleToggleSms(checked === true)
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor="sms-consent" className="text-sm cursor-pointer">
                      Allow this app to send SMS reminders
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      SMS will only be sent during campaign sessions with reminders enabled.
                      Max 5 per session, 20 per day.
                    </p>
                  </div>
                </div>

                {settings?.phone_number && settings?.sms_enabled && (
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <MessageSquare className="w-3 h-3" />
                    SMS reminders are active for {settings.phone_number}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Settings;
