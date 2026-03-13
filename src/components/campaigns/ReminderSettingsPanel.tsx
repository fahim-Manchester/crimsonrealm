import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ReminderConfig } from "@/hooks/useReminders";

interface ReminderSettingsPanelProps {
  config: ReminderConfig;
  onUpdateConfig: (updates: Partial<ReminderConfig>) => void;
  onUpdateCheckIn: (updates: Partial<ReminderConfig["checkIn"]>) => void;
  onUpdateDangerous: (updates: Partial<ReminderConfig["dangerous"]>) => void;
  onUpdateTaskSwitch: (updates: Partial<ReminderConfig["taskSwitch"]>) => void;
  sessionSmsCount: number;
  smsDisabled: boolean;
}

export function ReminderSettingsPanel({
  config,
  onUpdateConfig,
  onUpdateCheckIn,
  onUpdateDangerous,
  onUpdateTaskSwitch,
  sessionSmsCount,
  smsDisabled,
}: ReminderSettingsPanelProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title="Reminder Settings"
        >
          <Bell className="w-4 h-4" />
          {config.enabled && (
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-cinzel text-sm tracking-wide">SMS Reminders</h3>
            <span className="text-xs text-muted-foreground">
              {sessionSmsCount}/5 this session
            </span>
          </div>

          {smsDisabled && (
            <p className="text-xs text-destructive">
              SMS disabled for this session (limit reached or send failure)
            </p>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="reminders-enabled" className="text-sm">
              Enable for this campaign
            </Label>
            <Switch
              id="reminders-enabled"
              checked={config.enabled}
              onCheckedChange={(enabled) => onUpdateConfig({ enabled })}
            />
          </div>

          {config.enabled && (
            <>
              <Separator />

              {/* Check-In Reminder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">⏰ Check-In</Label>
                  <Switch
                    checked={config.checkIn.enabled}
                    onCheckedChange={(enabled) => onUpdateCheckIn({ enabled })}
                  />
                </div>
                {config.checkIn.enabled && (
                  <div className="flex items-center gap-2 pl-2">
                    <span className="text-xs text-muted-foreground">After</span>
                    <Input
                      type="number"
                      min={5}
                      max={240}
                      value={config.checkIn.minutes}
                      onChange={(e) =>
                        onUpdateCheckIn({
                          minutes: Math.max(5, parseInt(e.target.value) || 5),
                        })
                      }
                      className="w-16 h-7 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">min continuous</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Dangerous Reminder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">🚨 Dangerous</Label>
                  <Switch
                    checked={config.dangerous.enabled}
                    onCheckedChange={(enabled) => onUpdateDangerous({ enabled })}
                  />
                </div>
                {config.dangerous.enabled && (
                  <div className="space-y-1.5 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">After</span>
                      <Input
                        type="number"
                        min={10}
                        max={480}
                        value={config.dangerous.minutes}
                        onChange={(e) =>
                          onUpdateDangerous({
                            minutes: Math.max(10, parseInt(e.target.value) || 10),
                          })
                        }
                        className="w-16 h-7 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Confirm within</span>
                      <Input
                        type="number"
                        min={30}
                        max={600}
                        value={config.dangerous.confirmWindowSeconds}
                        onChange={(e) =>
                          onUpdateDangerous({
                            confirmWindowSeconds: Math.max(
                              30,
                              parseInt(e.target.value) || 30
                            ),
                          })
                        }
                        className="w-16 h-7 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">sec</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Task Switch Reminder */}
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">🔄 Task Switch</Label>
                <Switch
                  checked={config.taskSwitch.enabled}
                  onCheckedChange={(enabled) => onUpdateTaskSwitch({ enabled })}
                />
              </div>
              {config.taskSwitch.enabled && (
                <p className="text-xs text-muted-foreground pl-2">
                  SMS sent when auto-advance switches tasks
                </p>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
