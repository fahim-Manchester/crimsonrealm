import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserSettings } from "@/hooks/useUserSettings";
import { toast } from "sonner";

export interface ReminderConfig {
  enabled: boolean;
  checkIn: { enabled: boolean; minutes: number };
  dangerous: { enabled: boolean; minutes: number; confirmWindowSeconds: number };
  taskSwitch: { enabled: boolean };
}

const DEFAULT_CONFIG: ReminderConfig = {
  enabled: false,
  checkIn: { enabled: false, minutes: 45 },
  dangerous: { enabled: false, minutes: 90, confirmWindowSeconds: 120 },
  taskSwitch: { enabled: false },
};

function loadReminderConfig(campaignId: string): ReminderConfig {
  try {
    const stored = localStorage.getItem(`reminders:${campaignId}`);
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

function saveReminderConfig(campaignId: string, config: ReminderConfig) {
  localStorage.setItem(`reminders:${campaignId}`, JSON.stringify(config));
}

interface UseRemindersParams {
  campaignId: string | null;
  isTimerRunning: boolean;
  onResetSession: () => void;
}

export function useReminders({ campaignId, isTimerRunning, onResetSession }: UseRemindersParams) {
  const { settings: userSettings } = useUserSettings();
  const [config, setConfig] = useState<ReminderConfig>(DEFAULT_CONFIG);
  const [sessionSmsCount, setSessionSmsCount] = useState(0);
  const [smsDisabled, setSmsDisabled] = useState(false);
  const [showPresenceModal, setShowPresenceModal] = useState(false);
  const [presenceCountdown, setPresenceCountdown] = useState(0);

  const continuousTimerRef = useRef(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkInFiredRef = useRef(false);
  const dangerousFiredRef = useRef(false);
  const presenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load config when campaignId changes
  useEffect(() => {
    if (campaignId) {
      setConfig(loadReminderConfig(campaignId));
    }
  }, [campaignId]);

  const updateConfig = useCallback((updates: Partial<ReminderConfig>) => {
    if (!campaignId) return;
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    saveReminderConfig(campaignId, newConfig);
  }, [campaignId, config]);

  const updateCheckIn = useCallback((updates: Partial<ReminderConfig["checkIn"]>) => {
    updateConfig({ checkIn: { ...config.checkIn, ...updates } });
  }, [config, updateConfig]);

  const updateDangerous = useCallback((updates: Partial<ReminderConfig["dangerous"]>) => {
    updateConfig({ dangerous: { ...config.dangerous, ...updates } });
  }, [config, updateConfig]);

  const updateTaskSwitch = useCallback((updates: Partial<ReminderConfig["taskSwitch"]>) => {
    updateConfig({ taskSwitch: { ...config.taskSwitch, ...updates } });
  }, [config, updateConfig]);

  const canSendSms = userSettings?.sms_enabled && userSettings?.phone_number && config.enabled && !smsDisabled;

  const sendSms = useCallback(async (message: string, reminderType: string) => {
    if (!canSendSms || !userSettings?.phone_number) return false;
    if (sessionSmsCount >= 5) {
      toast.warning("Session SMS limit reached (5/5)");
      return false;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-sms`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: userSettings.phone_number,
            message,
            campaignId,
            reminderType,
            sessionSmsCount,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (result.code === "SESSION_LIMIT" || result.code === "DAILY_LIMIT") {
          toast.warning(`SMS limit reached: ${result.error}`);
          setSmsDisabled(true);
        } else if (result.code === "SEND_FAILED") {
          toast.error("SMS send failed — reminders disabled for this session");
          setSmsDisabled(true);
        }
        return false;
      }

      setSessionSmsCount((c) => c + 1);
      return true;
    } catch (err) {
      console.error("SMS send error:", err);
      setSmsDisabled(true);
      return false;
    }
  }, [canSendSms, userSettings, campaignId, sessionSmsCount]);

  // Continuous timer tracking
  useEffect(() => {
    if (isTimerRunning && config.enabled && canSendSms) {
      timerIntervalRef.current = setInterval(() => {
        continuousTimerRef.current += 1;
        const elapsedMinutes = continuousTimerRef.current / 60;

        // Check-in reminder
        if (config.checkIn.enabled && !checkInFiredRef.current && elapsedMinutes >= config.checkIn.minutes) {
          checkInFiredRef.current = true;
          sendSms(
            `⏰ Crimson Realm Check-In: You've been working for ${config.checkIn.minutes} minutes. Time to check in!`,
            "check_in"
          );
        }

        // Dangerous reminder
        if (config.dangerous.enabled && !dangerousFiredRef.current && elapsedMinutes >= config.dangerous.minutes) {
          dangerousFiredRef.current = true;
          sendSms(
            `🚨 Crimson Realm WARNING: ${config.dangerous.minutes} min continuous session. Confirm presence or session resets!`,
            "dangerous"
          );
          setShowPresenceModal(true);
          setPresenceCountdown(config.dangerous.confirmWindowSeconds);
        }
      }, 1000);
    } else {
      // Timer paused → reset continuous tracking
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      continuousTimerRef.current = 0;
      checkInFiredRef.current = false;
      dangerousFiredRef.current = false;
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, config.enabled, config.checkIn, config.dangerous, canSendSms, sendSms]);

  // Presence countdown
  useEffect(() => {
    if (showPresenceModal && presenceCountdown > 0) {
      presenceTimerRef.current = setInterval(() => {
        setPresenceCountdown((c) => {
          if (c <= 1) {
            // Time's up — reset session
            clearInterval(presenceTimerRef.current!);
            setShowPresenceModal(false);
            onResetSession();
            toast.error("Presence not confirmed — session progress reset.");
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => {
      if (presenceTimerRef.current) clearInterval(presenceTimerRef.current);
    };
  }, [showPresenceModal, presenceCountdown > 0, onResetSession]);

  const confirmPresence = useCallback(() => {
    setShowPresenceModal(false);
    setPresenceCountdown(0);
    if (presenceTimerRef.current) clearInterval(presenceTimerRef.current);
    toast.success("Presence confirmed! Session continues.");
  }, []);

  const notifyTaskSwitch = useCallback(async (nextTaskName: string) => {
    if (!canSendSms || !config.taskSwitch.enabled) return;
    await sendSms(
      `🔄 Crimson Realm: Task switched → ${nextTaskName}`,
      "task_switch"
    );
  }, [canSendSms, config.taskSwitch.enabled, sendSms]);

  const resetSessionCounts = useCallback(() => {
    setSessionSmsCount(0);
    setSmsDisabled(false);
    continuousTimerRef.current = 0;
    checkInFiredRef.current = false;
    dangerousFiredRef.current = false;
  }, []);

  const isAvailable = !!(userSettings?.sms_enabled && userSettings?.phone_number);

  return {
    config,
    updateConfig,
    updateCheckIn,
    updateDangerous,
    updateTaskSwitch,
    isAvailable,
    sessionSmsCount,
    smsDisabled,
    showPresenceModal,
    presenceCountdown,
    confirmPresence,
    notifyTaskSwitch,
    resetSessionCounts,
  };
}
