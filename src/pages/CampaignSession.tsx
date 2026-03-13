import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Play, Pause, CheckCircle, Plus, LogOut, RotateCcw, Ban, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCampaignSession } from "@/hooks/useCampaignSession";
import { useTimerMode } from "@/hooks/useTimerMode";
import { useTaskQueue } from "@/hooks/useTaskQueue";
import { SessionClock } from "@/components/campaigns/SessionClock";
import { QuestItemList } from "@/components/campaigns/QuestItemList";
import { AddItemDialog } from "@/components/campaigns/AddItemDialog";
import { TimerModeSettings } from "@/components/campaigns/TimerModeSettings";
import { TaskQueuePanel } from "@/components/campaigns/TaskQueuePanel";
import { QueueProgressBar } from "@/components/campaigns/QueueProgressBar";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { useMusic } from "@/contexts/MusicContext";
import gothicHeroBg from "@/assets/gothic-hero-bg.jpg";
import type { Campaign } from "@/hooks/useCampaigns";

const difficultyConfig: Record<string, { emoji: string; color: string }> = {
  trivial: { emoji: "🌿", color: "text-green-400" },
  easy: { emoji: "🌙", color: "text-blue-400" },
  medium: { emoji: "⚔️", color: "text-primary" },
  hard: { emoji: "🔥", color: "text-orange-400" },
  legendary: { emoji: "💀", color: "text-destructive" }
};

const CampaignSession = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, themeConfig } = useTheme();
  const { notifyCampaignTimerState } = useMusic();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const {
    items,
    sessionState,
    loading: itemsLoading,
    itemSessionTimes,
    startTimer,
    pauseTimer,
    completeCurrentTask,
    abandonCurrentTask,
    endSession,
    startNewSession,
    reorderItems,
    addTaskToCampaign,
    addProjectToCampaign,
    addTemporaryItem,
    markItemPermanent,
    setCurrentTaskIndex,
    uncheckItem,
    updateItemTimeManually,
    setItemParent,
    switchToTask
  } = useCampaignSession(campaign);

  // Timer mode integration
  const timerMode = useTimerMode({
    isTimerRunning: sessionState.isRunning,
    startTimer,
    pauseTimer,
  });

  // Task Queue integration
  const taskQueue = useTaskQueue(campaign?.id ?? null, items);

  // Track pomodoro phase transitions for auto-advance
  const prevPhaseRef = useRef(timerMode.currentPhase);

  // Notify music context of timer state for auto play/pause
  useEffect(() => {
    notifyCampaignTimerState(sessionState.isRunning, true);
  }, [sessionState.isRunning, notifyCampaignTimerState]);

  // Notify music context we left the campaign on unmount
  useEffect(() => {
    return () => notifyCampaignTimerState(false, false);
  }, [notifyCampaignTimerState]);

  // Fetch campaign
  useEffect(() => {
    const fetchCampaign = async () => {
      if (!id || !user) return;

      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        toast.error("Campaign not found");
        navigate("/campaigns");
        return;
      }

      setCampaign(data);
      setLoading(false);
    };

    if (user) {
      fetchCampaign();
    }
  }, [id, user, navigate]);

  const campaignTotalSeconds = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + (item.time_spent || 0) + (itemSessionTimes[item.id] || 0),
      0
    );
  }, [items, itemSessionTimes]);

  // ---- Queue Auto-Advance Logic ----

  // Auto-advance on target time reached
  useEffect(() => {
    if (!taskQueue.isQueueActive) return;
    if (taskQueue.settings.autoAdvanceTrigger !== "target_time") return;
    if (!sessionState.isRunning) return;

    const currentItemId = taskQueue.currentQueueItemId;
    if (!currentItemId) return;

    const targetSeconds = taskQueue.settings.targetTimes[currentItemId];
    if (!targetSeconds) return;

    const elapsedSeconds = (itemSessionTimes[currentItemId] || 0) + (items.find(i => i.id === currentItemId)?.time_spent || 0);

    // Only the session time matters for target tracking
    const sessionSeconds = itemSessionTimes[currentItemId] || 0;
    if (sessionSeconds >= targetSeconds) {
      handleQueueAdvance();
    }
  }, [itemSessionTimes, taskQueue.isQueueActive, taskQueue.settings, taskQueue.currentQueueItemId, sessionState.isRunning]);

  // Auto-advance on pomodoro work phase completion
  useEffect(() => {
    if (!taskQueue.isQueueActive) return;
    if (taskQueue.settings.autoAdvanceTrigger !== "pomodoro") return;

    const prevPhase = prevPhaseRef.current;
    const curPhase = timerMode.currentPhase;
    prevPhaseRef.current = curPhase;

    // Advance when work phase ends (transitions to break)
    if (prevPhase === "work" && curPhase !== "work" && curPhase !== null) {
      handleQueueAdvance();
    }
  }, [timerMode.currentPhase, taskQueue.isQueueActive, taskQueue.settings.autoAdvanceTrigger]);

  const handleQueueAdvance = useCallback(async () => {
    const currentItemId = taskQueue.currentQueueItemId;

    // Optionally mark the current task as complete
    if (taskQueue.settings.completionBehavior === "mark_complete" && currentItemId) {
      await completeCurrentTask();
    }

    // Advance to next queue item
    const nextItemId = taskQueue.advanceQueue();
    if (nextItemId) {
      switchToTask(nextItemId);
      const nextItem = items.find(i => i.id === nextItemId);
      const nextTitle = nextItem?.is_temporary
        ? nextItem.temporary_name
        : nextItem?.task?.title || nextItem?.project?.name;
      toast.success(`Queue advanced → ${nextTitle || "Next task"}`);
    } else {
      toast.success("🎉 Queue complete! All tasks finished.");
    }
  }, [taskQueue, completeCurrentTask, switchToTask, items]);

  // ---- Handlers ----

  const handleSetParent = async (itemId: string, parentItemId: string | null) => {
    const result = await setItemParent(itemId, parentItemId);
    if (result?.blocked && result.reason === 'completed') {
      toast.error("You can't edit a completed campaign. Revive the campaign if you want to make edits.");
      return;
    }
    toast.success(parentItemId ? "Item embedded" : "Item unembedded");
  };

  const handleEndSession = async () => {
    timerMode.resetPhases();
    const savedMinutes = await endSession();
    toast.success(`Session ended. ${savedMinutes} minutes saved to campaign.`);
    navigate("/campaigns");
  };

  const handleNewSession = async () => {
    timerMode.resetPhases();
    taskQueue.refreshQueue();
    await startNewSession();
    toast.success("New session started!");
  };

  const handleCompleteTask = async () => {
    // If queue is active, use queue advance logic
    if (taskQueue.isQueueActive && taskQueue.currentQueueItemId === sessionState.timedTaskId) {
      await handleQueueAdvance();
      return;
    }
    await completeCurrentTask();
    toast.success("Task completed! Moving to next.");
  };

  const handleAbandonTask = async () => {
    await abandonCurrentTask();
    // If queue active, skip to next
    if (taskQueue.isQueueActive) {
      const nextId = taskQueue.advanceQueue();
      if (nextId) switchToTask(nextId);
    }
    toast.info("Task abandoned. Moving to next.");
  };

  const handleAddTask = async (taskId: string) => {
    await addTaskToCampaign(taskId);
    toast.success("Task added to campaign");
  };

  const handleAddProject = async (projectId: string) => {
    await addProjectToCampaign(projectId);
    toast.success("Territory added to campaign");
  };

  const handleAddTemporaryItem = async (type: 'task' | 'project', name: string, description: string | null) => {
    await addTemporaryItem(type, name, description);
  };

  const handleMarkPermanent = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    const typeLabel = item.temporary_type === 'task' ? 'Quest' : 'Territory';
    if (confirm(`Save this ${typeLabel} to your main ${typeLabel === 'Quest' ? 'Forge' : 'Territories'} list?`)) {
      try {
        await markItemPermanent(itemId);
        toast.success(`${typeLabel} saved to ${typeLabel === 'Quest' ? 'Forge' : 'Territories'}!`);
      } catch {
        toast.error(`Failed to save ${typeLabel}`);
      }
    }
  };

  const handleUncheckItem = async (itemId: string) => {
    await uncheckItem(itemId);
    toast.info("Item unchecked");
  };

  const handleUpdateItemTime = async (itemId: string, minutes: number) => {
    await updateItemTimeManually(itemId, minutes);
    toast.success("Time updated");
  };

  const handleStartQueueSession = () => {
    if (taskQueue.queue.length === 0) {
      toast.error("Add tasks to the queue first");
      return;
    }
    taskQueue.updateSettings({ enabled: true });
    taskQueue.setQueueIndex(0);
    const firstItemId = taskQueue.queue[0];
    if (firstItemId) {
      switchToTask(firstItemId);
      startTimer(firstItemId);
    }
    toast.success("Queue session started!");
  };

  if (authLoading || loading) return <LoadingSpinner />;
  if (!campaign) return null;

  const difficulty = difficultyConfig[campaign.difficulty] || difficultyConfig.medium;
  const existingTaskIds = items.filter(i => i.task_id).map(i => i.task_id!);
  const existingProjectIds = items.filter(i => i.project_id).map(i => i.project_id!);
  const currentItem = items[sessionState.currentTaskIndex];
  const canComplete = sessionState.isRunning && currentItem && currentItem.status !== 'completed' && currentItem.status !== 'abandoned';

  const bgStyle = theme === "gothic"
    ? { backgroundImage: `url(${gothicHeroBg})` }
    : { background: themeConfig.backgroundCss };

  // Phase display helpers
  const phaseLabel = timerMode.currentPhase === "work"
    ? (timerMode.settings.mode === "ultradian" ? "Focus" : "Work")
    : timerMode.currentPhase === "shortBreak"
    ? (timerMode.settings.mode === "ultradian" ? "Rest" : "Short Break")
    : timerMode.currentPhase === "longBreak" ? "Long Break"
    : null;

  const formatPhaseTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={bgStyle} />
      <div className="absolute inset-0 bg-background/85" />
      {theme === "gothic" && <div className="absolute inset-0 bg-gradient-fog opacity-40" />}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <Link 
              to="/campaigns" 
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => {
                if (sessionState.isRunning || sessionState.sessionTime > 0) {
                  e.preventDefault();
                  if (confirm("End session and save progress?")) {
                    handleEndSession();
                  }
                }
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className={difficulty.color}>{difficulty.emoji}</span>
                <h1 className="font-cinzel text-lg md:text-xl tracking-wide text-foreground">
                  {campaign.name}
                </h1>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <TimerModeSettings
              settings={timerMode.settings}
              onUpdateSettings={timerMode.updateSettings}
              onUpdateChess={timerMode.updateChessSettings}
              onUpdatePomodoro={timerMode.updatePomodoroSettings}
              onUpdateUltradian={timerMode.updateUltradianSettings}
            />
            <TaskQueuePanel
              items={items}
              queue={taskQueue.queue}
              currentQueueIndex={taskQueue.currentQueueIndex}
              settings={taskQueue.settings}
              itemSessionTimes={itemSessionTimes}
              onAddToQueue={taskQueue.addToQueue}
              onRemoveFromQueue={taskQueue.removeFromQueue}
              onReorderQueue={taskQueue.reorderQueue}
              onClearQueue={taskQueue.clearQueue}
              onRefreshQueue={taskQueue.refreshQueue}
              onUpdateSettings={taskQueue.updateSettings}
              onSetTargetTime={taskQueue.setTargetTime}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewSession}
              className="border-primary/50 text-primary hover:bg-primary/10"
              disabled={sessionState.isRunning}
            >
              <RotateCcw className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">New Session</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEndSession}
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">End Session</span>
            </Button>
          </div>
        </header>

        {/* Phase Indicator */}
        {timerMode.settings.mode !== "normal" && timerMode.currentPhase && (
          <div className="px-4 md:px-8 pt-4">
            <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
              <div className={`px-4 py-2 rounded-sm border-2 text-center ${
                timerMode.currentPhase === "work"
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-accent/60 bg-accent/10 text-accent"
              }`}>
                <span className="font-cinzel text-xs tracking-widest uppercase">{phaseLabel}</span>
                {timerMode.settings.mode === "pomodoro" && timerMode.currentPhase === "work" && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {timerMode.currentCycle}/{timerMode.totalCycles}
                  </span>
                )}
                <span className="ml-3 font-cinzel text-lg tabular-nums">
                  {formatPhaseTime(timerMode.phaseTimeRemaining)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Queue Progress Bar */}
        {taskQueue.isQueueActive && (
          <div className="px-4 md:px-8 pt-3">
            <div className="max-w-4xl mx-auto">
              <QueueProgressBar
                queueItems={taskQueue.queueItems}
                currentQueueIndex={taskQueue.currentQueueIndex}
                isActive={taskQueue.isQueueActive}
              />
            </div>
          </div>
        )}

        {/* Clocks Section */}
        <section className="px-4 md:px-8 py-6 md:py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 max-w-4xl mx-auto">
            {/* Session Number */}
            <div className="flex flex-col items-center justify-center p-3 md:p-4 rounded-lg bg-card/30 border border-border/30">
              <span className="text-2xl md:text-4xl font-cinzel font-bold text-primary">
                #{sessionState.currentSessionNumber}
              </span>
              <span className="text-[10px] md:text-xs text-muted-foreground font-cinzel uppercase tracking-widest mt-1">
                Session
              </span>
            </div>
            <SessionClock
              label="Campaign Total"
              timeInSeconds={campaignTotalSeconds}
              variant="campaign"
              isActive={sessionState.isRunning}
            />
            <SessionClock
              label="Session"
              timeInSeconds={sessionState.sessionTime}
              variant="session"
              isActive={sessionState.isRunning}
            />
            <SessionClock
              label="Current Task"
              timeInSeconds={sessionState.taskTime}
              variant="task"
              isActive={sessionState.isRunning}
            />
          </div>
        </section>

        {/* Timer Controls */}
        <section className="px-4 md:px-8 pb-6">
          <div className="flex justify-center gap-4 flex-wrap">
            <Button
              size="lg"
              onClick={() => sessionState.isRunning ? pauseTimer() : startTimer()}
              className={sessionState.isRunning 
                ? "bg-accent hover:bg-accent/80" 
                : "gothic-button-primary"
              }
            >
              {sessionState.isRunning ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  {sessionState.sessionTime > 0 ? "Resume" : "Start"}
                </>
              )}
            </Button>

            {/* Start Queue Session button - only show when queue has items but isn't running */}
            {!sessionState.isRunning && taskQueue.queue.length > 0 && !taskQueue.settings.enabled && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleStartQueueSession}
                className="border-primary/50 hover:bg-primary/10 gap-2"
              >
                <Zap className="w-5 h-5 text-primary" />
                Start Queue Session
              </Button>
            )}
            
            {canComplete && (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleCompleteTask}
                  className="border-accent/50 hover:bg-accent/10"
                >
                  <CheckCircle className="w-5 h-5 mr-2 text-accent" />
                  Complete Task
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleAbandonTask}
                  className="border-destructive/50 hover:bg-destructive/10"
                >
                  <Ban className="w-5 h-5 mr-2 text-destructive" />
                  Abandon
                </Button>
              </>
            )}
          </div>
        </section>

        {/* Task List */}
        <section className="flex-1 px-4 md:px-8 pb-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-cinzel text-sm tracking-widest uppercase text-muted-foreground">
                Quest Items
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddDialog(true)}
                className="text-primary hover:bg-primary/10"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            {itemsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading items...
              </div>
            ) : items.length === 0 ? (
              <div className="gothic-card p-8 text-center">
                <p className="text-muted-foreground font-crimson mb-4">
                  No items in this campaign yet.
                </p>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="gothic-button-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Item
                </Button>
              </div>
            ) : (
              <QuestItemList
                items={items}
                currentIndex={sessionState.currentTaskIndex}
                itemSessionTimes={itemSessionTimes}
                onSelectIndex={setCurrentTaskIndex}
                onReorder={reorderItems}
                onSetParent={handleSetParent}
                onUncheckItem={handleUncheckItem}
                onUpdateTime={handleUpdateItemTime}
                onMarkPermanent={handleMarkPermanent}
                onSetTargetTime={taskQueue.setTargetTime}
                onRemoveTargetTime={taskQueue.removeTargetTime}
                targetTimes={taskQueue.settings.targetTimes}
                timedTaskId={sessionState.timedTaskId}
                selectedTaskId={sessionState.selectedTaskId}
                isTimerRunning={sessionState.isRunning}
              />
            )}
          </div>
        </section>
      </div>

      {/* Add Item Dialog */}
      <AddItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        existingTaskIds={existingTaskIds}
        existingProjectIds={existingProjectIds}
        onAddTask={handleAddTask}
        onAddProject={handleAddProject}
        onAddTemporaryItem={handleAddTemporaryItem}
      />
    </div>
  );
};

export default CampaignSession;
