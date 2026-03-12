import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { ArrowLeft, Plus, Swords, Flame, Archive, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimerModeSettings } from "@/components/campaigns/TimerModeSettings";
import { useTimerMode } from "@/hooks/useTimerMode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCampaigns, Campaign } from "@/hooks/useCampaigns";
import { CampaignCreator } from "@/components/campaigns/CampaignCreator";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import { DraggableCampaignCard } from "@/components/campaigns/DraggableCampaignCard";
import { DroppableCampaignSection } from "@/components/campaigns/DroppableCampaignSection";
import { EditCampaignDialog } from "@/components/campaigns/EditCampaignDialog";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import gothicHeroBg from "@/assets/gothic-hero-bg.jpg";

const Campaigns = () => {
  const { user, loading: authLoading } = useAuth();
  const { theme, themeConfig } = useTheme();
  const labels = themeConfig.labels;
  const timerModeHook = useTimerMode({ isTimerRunning: false, startTimer: () => {}, pauseTimer: () => {} });
  const {
    campaigns,
    availableTasks,
    availableProjects,
    loading,
    createCampaign,
    updateCampaignTimeSpent,
    updateCampaignStatus,
    updateCampaign,
    resetRoutineCampaign,
    deleteCampaign,
    fetchCampaignItems,
    refreshCampaigns
  } = useCampaigns();

  const [showCreator, setShowCreator] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [draggingCampaign, setDraggingCampaign] = useState<Campaign | null>(null);
  
  // Section expansion states
  const [expandedSections, setExpandedSections] = useState({
    active: true,
    archived: false,
    routine: true,
    completed: false
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 15, // Require 15px movement before dragging starts (prevents accidental drags on mobile scroll)
      },
    })
  );

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Refresh data (used by CampaignCreator when quick-adding)
  const handleRefreshData = useCallback(() => {
    refreshCampaigns();
  }, [refreshCampaigns]);

  const handleCreateCampaign = async (
    name: string,
    difficulty: string,
    plannedTime: number,
    taskIds: string[],
    projectIds: string[],
    temporaryItems: { id: string; type: "popup_quest" | "hidden_territory"; name: string; description: string | null }[]
  ) => {
    await createCampaign(name, difficulty, plannedTime, taskIds, projectIds, temporaryItems);
  };

  const handleStartCampaign = (campaignId: string) => {
    if (activeCampaignId === campaignId) {
      setActiveCampaignId(null);
    } else {
      setActiveCampaignId(campaignId);
    }
  };

  const handleCompleteCampaign = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    // For routine campaigns, mark as completed but keep in routine section
    if (campaign?.status === "routine") {
      // Just mark items complete but don't change campaign status
      await updateCampaignStatus(campaignId, "routine");
    } else {
      await updateCampaignStatus(campaignId, "completed");
    }
    if (activeCampaignId === campaignId) {
      setActiveCampaignId(null);
    }
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
  };

  const handleSaveEdit = async (campaignId: string, updates: { name?: string; planned_time?: number; difficulty?: string }) => {
    await updateCampaign(campaignId, updates);
  };

  const handleResetRoutine = async (campaignId: string) => {
    await resetRoutineCampaign(campaignId);
  };

  // Handle time update from card timer (converts seconds to minutes)
  const handleTimeUpdate = useCallback(async (campaignId: string, additionalSeconds: number) => {
    const additionalMinutes = Math.ceil(additionalSeconds / 60);
    if (additionalMinutes > 0) {
      await updateCampaignTimeSpent(campaignId, additionalMinutes);
    }
  }, [updateCampaignTimeSpent]);

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const campaign = campaigns.find(c => c.id === event.active.id);
    if (campaign) {
      setDraggingCampaign(campaign);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggingCampaign(null);
    
    const { active, over } = event;
    if (!over) return;

    const campaignId = active.id as string;
    const newStatus = over.id as string;
    const campaign = campaigns.find(c => c.id === campaignId);
    
    if (!campaign || campaign.status === newStatus) return;

    // Don't allow moving completed campaigns (they should stay completed)
    // But allow moving TO completed
    await updateCampaignStatus(campaignId, newStatus);
  };

  if (authLoading || loading) return <LoadingSpinner />;

  // Group campaigns by status
  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const archivedCampaigns = campaigns.filter(c => c.status === "archived");
  const routineCampaigns = campaigns.filter(c => c.status === "routine");
  const completedCampaigns = campaigns.filter(c => c.status === "completed");

  const renderCampaignGrid = (campaignList: Campaign[], showReset: boolean = false) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 px-2 md:px-0">
      {campaignList.map(campaign => (
        <DraggableCampaignCard
          key={campaign.id}
          campaign={campaign}
          onStart={handleStartCampaign}
          onDelete={deleteCampaign}
          onComplete={handleCompleteCampaign}
          onEdit={handleEditCampaign}
          onReset={showReset ? handleResetRoutine : undefined}
          fetchItems={fetchCampaignItems}
          isActive={activeCampaignId === campaign.id}
          onTimeUpdate={handleTimeUpdate}
        />
      ))}
    </div>
  );

  const bgStyle = theme === "gothic"
    ? { backgroundImage: `url(${gothicHeroBg})` }
    : { background: themeConfig.backgroundCss };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={bgStyle} />
      <div className="absolute inset-0 bg-background/80" />
      {theme === "gothic" && <div className="absolute inset-0 bg-gradient-fog opacity-30" />}

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-12 py-4 md:py-6 border-b border-border/30">
          <div className="flex items-center gap-4">
            <Link to="/home" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Swords className="w-6 h-6 text-primary" />
              <h1 className="font-cinzel text-xl md:text-2xl font-bold tracking-widest text-foreground">
                {labels.campaigns} Mode
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TimerModeSettings
              settings={timerModeHook.settings}
              onUpdateSettings={timerModeHook.updateSettings}
              onUpdateChess={timerModeHook.updateChessSettings}
              onUpdatePomodoro={timerModeHook.updatePomodoroSettings}
            />
            <span className="font-crimson text-sm text-muted-foreground hidden md:block">
              {user?.email}
            </span>
          </div>
        </header>

        {/* Main */}
        <main className="px-4 md:px-12 py-6 md:py-8 max-w-6xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-6 md:mb-10">
            <h2 className="text-gothic-title text-2xl md:text-3xl mb-3">
              {labels.campaignsHeroTitle.split(" ").slice(0, -1).join(" ")} <span className="text-primary">{labels.campaignsHeroTitle.split(" ").slice(-1)}</span>
            </h2>
            <p className="font-crimson text-muted-foreground max-w-xl mx-auto">
              {labels.campaignsHeroDesc}
            </p>
          </div>

          {/* Create Button */}
          <div className="flex justify-center mb-8">
            <Button
              onClick={() => setShowCreator(true)}
              className="gothic-button-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create {labels.campaigns}
            </Button>
          </div>

          {/* Campaign Sections with DnD */}
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-4">
              {/* Active Campaigns */}
              <DroppableCampaignSection
                id="active"
                title="Active Campaigns"
                count={activeCampaigns.length}
                isExpanded={expandedSections.active}
                onToggle={() => toggleSection("active")}
                icon={<Flame className="w-4 h-4" />}
                emptyMessage="No active campaigns. Create one or drag here to activate!"
              >
                {renderCampaignGrid(activeCampaigns)}
              </DroppableCampaignSection>

              {/* Routine Campaigns */}
              <DroppableCampaignSection
                id="routine"
                title="Routine"
                count={routineCampaigns.length}
                isExpanded={expandedSections.routine}
                onToggle={() => toggleSection("routine")}
                icon={<RotateCcw className="w-4 h-4" />}
                className="border-accent/30"
                emptyMessage="Drag campaigns here for repeatable routines like morning rituals."
              >
                {renderCampaignGrid(routineCampaigns, true)}
              </DroppableCampaignSection>

              {/* Archived Campaigns */}
              <DroppableCampaignSection
                id="archived"
                title="Archived"
                count={archivedCampaigns.length}
                isExpanded={expandedSections.archived}
                onToggle={() => toggleSection("archived")}
                icon={<Archive className="w-4 h-4" />}
                className="border-muted-foreground/30"
                emptyMessage="Drag campaigns here to archive them for later."
              >
                {renderCampaignGrid(archivedCampaigns)}
              </DroppableCampaignSection>

              {/* Completed Campaigns */}
              <DroppableCampaignSection
                id="completed"
                title="Completed"
                count={completedCampaigns.length}
                isExpanded={expandedSections.completed}
                onToggle={() => toggleSection("completed")}
                icon={<Trophy className="w-4 h-4" />}
                className="border-accent/30"
                emptyMessage="No completed campaigns yet. Finish your quests to see them here!"
              >
                {renderCampaignGrid(completedCampaigns)}
              </DroppableCampaignSection>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {draggingCampaign && (
                <div className="opacity-90 rotate-2 scale-105">
                  <CampaignCard
                    campaign={draggingCampaign}
                    onStart={() => {}}
                    onDelete={() => {}}
                    onComplete={() => {}}
                    onEdit={() => {}}
                    fetchItems={async () => []}
                    isActive={false}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {/* Empty State - only show if no campaigns at all */}
          {campaigns.length === 0 && (
            <div className="gothic-card p-12 text-center mt-8">
              <Swords className="w-12 h-12 text-primary/50 mx-auto mb-4" />
              <h3 className="font-cinzel text-lg mb-2">No Campaigns Yet</h3>
              <p className="font-crimson text-muted-foreground mb-6">
                Create your first campaign to begin your conquest.
              </p>
              <Button
                onClick={() => setShowCreator(true)}
                className="gothic-button-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Campaign
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreator} onOpenChange={setShowCreator}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-lg tracking-wide flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" />
              Forge New Campaign
            </DialogTitle>
          </DialogHeader>
          <CampaignCreator
            tasks={availableTasks}
            projects={availableProjects}
            onCampaignCreated={handleCreateCampaign}
            onClose={() => setShowCreator(false)}
            onRefreshData={handleRefreshData}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <EditCampaignDialog
        campaign={editingCampaign}
        open={!!editingCampaign}
        onOpenChange={(open) => !open && setEditingCampaign(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default Campaigns;
