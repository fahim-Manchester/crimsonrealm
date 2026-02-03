import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Play, Pause, CheckCircle, Plus, LogOut } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCampaignSession } from "@/hooks/useCampaignSession";
import { SessionClock } from "@/components/campaigns/SessionClock";
import { SortableTaskItem } from "@/components/campaigns/SortableTaskItem";
import { AddItemDialog } from "@/components/campaigns/AddItemDialog";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
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
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const {
    items,
    sessionState,
    loading: itemsLoading,
    startTimer,
    pauseTimer,
    completeCurrentTask,
    endSession,
    reorderItems,
    addTaskToCampaign,
    addProjectToCampaign,
    setCurrentTaskIndex
  } = useCampaignSession(campaign);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch campaign
  useEffect(() => {
    const fetchCampaign = async () => {
      if (!id || !user) return;

      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

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

  // Calculate total time including current session
  const totalTimeSeconds = useMemo(() => {
    return (sessionState.campaignTotalTime * 60) + sessionState.sessionTime;
  }, [sessionState.campaignTotalTime, sessionState.sessionTime]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      
      const newItems = arrayMove(items, oldIndex, newIndex);
      reorderItems(newItems);
    }
  };

  const handleEndSession = async () => {
    const savedMinutes = await endSession();
    toast.success(`Session ended. ${savedMinutes} minutes saved to campaign.`);
    navigate("/campaigns");
  };

  const handleCompleteTask = async () => {
    await completeCurrentTask();
    toast.success("Task completed! Moving to next.");
  };

  const handleAddTask = async (taskId: string) => {
    await addTaskToCampaign(taskId);
    toast.success("Task added to campaign");
  };

  const handleAddProject = async (projectId: string) => {
    await addProjectToCampaign(projectId);
    toast.success("Territory added to campaign");
  };

  if (authLoading || loading) return <LoadingSpinner />;
  if (!campaign) return null;

  const difficulty = difficultyConfig[campaign.difficulty] || difficultyConfig.medium;
  const existingTaskIds = items.filter(i => i.task_id).map(i => i.task_id!);
  const existingProjectIds = items.filter(i => i.project_id).map(i => i.project_id!);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${gothicHeroBg})` }}
      />
      <div className="absolute inset-0 bg-background/85" />
      <div className="absolute inset-0 bg-gradient-fog opacity-40" />

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
          
          <Button
            variant="outline"
            onClick={handleEndSession}
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            End Session
          </Button>
        </header>

        {/* Clocks Section */}
        <section className="px-4 md:px-8 py-6 md:py-10">
          <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-3xl mx-auto">
            <SessionClock
              label="Campaign Total"
              timeInSeconds={totalTimeSeconds}
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
          <div className="flex justify-center gap-4">
            <Button
              size="lg"
              onClick={sessionState.isRunning ? pauseTimer : startTimer}
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
            
            {sessionState.isRunning && items[sessionState.currentTaskIndex] && !items[sessionState.currentTaskIndex].completed && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleCompleteTask}
                className="border-accent/50 hover:bg-accent/10"
              >
                <CheckCircle className="w-5 h-5 mr-2 text-accent" />
                Complete Task
              </Button>
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items.map(i => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <SortableTaskItem
                        key={item.id}
                        item={item}
                        isCurrentTask={index === sessionState.currentTaskIndex}
                        onSelect={() => setCurrentTaskIndex(index)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
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
      />
    </div>
  );
};

export default CampaignSession;
