import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { TimerModeSettings as TSettings, TimerMode, ChessSettings, PomodoroSettings, UltradianSettings } from "@/hooks/useTimerMode";

interface TimerModeSettingsProps {
  settings: TSettings;
  onUpdateSettings: (partial: Partial<TSettings>) => void;
  onUpdateChess: (partial: Partial<ChessSettings>) => void;
  onUpdatePomodoro: (partial: Partial<PomodoroSettings>) => void;
  onUpdateUltradian?: (partial: Partial<UltradianSettings>) => void;
}

export function TimerModeSettings({ settings, onUpdateSettings, onUpdateChess, onUpdatePomodoro, onUpdateUltradian }: TimerModeSettingsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Timer className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <h4 className="font-cinzel text-sm font-medium tracking-wide flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            Timer Mode
          </h4>

          <RadioGroup
            value={settings.mode}
            onValueChange={(v) => onUpdateSettings({ mode: v as TimerMode })}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="normal" id="mode-normal" />
              <Label htmlFor="mode-normal" className="font-crimson cursor-pointer">Normal</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="chess" id="mode-chess" />
              <Label htmlFor="mode-chess" className="font-crimson cursor-pointer">Chess Clock</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pomodoro" id="mode-pomodoro" />
              <Label htmlFor="mode-pomodoro" className="font-crimson cursor-pointer">Pomodoro</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ultradian" id="mode-ultradian" />
              <Label htmlFor="mode-ultradian" className="font-crimson cursor-pointer">Ultradian</Label>
            </div>
          </RadioGroup>

          {settings.mode === "chess" && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Work/break alternation</p>
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-14 shrink-0">Work</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={settings.chess.workMinutes}
                    onChange={(e) => onUpdateChess({ workMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-8 w-20"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-14 shrink-0">Break</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={settings.chess.breakMinutes}
                    onChange={(e) => onUpdateChess({ breakMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-8 w-20"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
              </div>
            </>
          )}

          {settings.mode === "pomodoro" && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Structured work/break cycles</p>
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-20 shrink-0">Work</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={settings.pomodoro.workMinutes}
                    onChange={(e) => onUpdatePomodoro({ workMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-8 w-20"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-20 shrink-0">Short break</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={settings.pomodoro.shortBreakMinutes}
                    onChange={(e) => onUpdatePomodoro({ shortBreakMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-8 w-20"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-20 shrink-0">Long break</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={settings.pomodoro.longBreakMinutes}
                    onChange={(e) => onUpdatePomodoro({ longBreakMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-8 w-20"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-20 shrink-0">Cycles</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={settings.pomodoro.cyclesBeforeLongBreak}
                    onChange={(e) => onUpdatePomodoro({ cyclesBeforeLongBreak: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-8 w-20"
                  />
                  <span className="text-xs text-muted-foreground">before long</span>
                </div>
              </div>
            </>
          )}

          {settings.mode === "ultradian" && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Deep work / rest rhythm (~90/20)</p>
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-14 shrink-0">Focus</Label>
                  <Input
                    type="number"
                    min={1}
                    max={180}
                    value={settings.ultradian.workMinutes}
                    onChange={(e) => onUpdateUltradian?.({ workMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-8 w-20"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-14 shrink-0">Rest</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={settings.ultradian.restMinutes}
                    onChange={(e) => onUpdateUltradian?.({ restMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-8 w-20"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
