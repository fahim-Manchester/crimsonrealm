import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Swords, Flame, Archive, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCampaigns, Campaign } from "@/hooks/useCampaigns";
import { CampaignCreator } from "@/components/campaigns/CampaignCreator";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import { CampaignSectionHeader } from "@/components/campaigns/CampaignSectionHeader";
import { EditCampaignDialog } from "@/components/campaigns/EditCampaignDialog";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import gothicHeroBg from "@/assets/gothic-hero-bg.jpg";

const Campaigns = () => {
  const { user, loading: authLoading } = useAuth();
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
  
  // Section expansion states
  const [expandedSections, setExpandedSections] = useState({
    active: true,
    archived: false,
    routine: true,
    completed: false
  });

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
    projectIds: string[]
  ) => {
    await createCampaign(name, difficulty, plannedTime, taskIds, projectIds);
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

  const handleMoveToStatus = async (campaignId: string, newStatus: string) => {
    await updateCampaignStatus(campaignId, newStatus);
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

  if (authLoading || loading) return <LoadingSpinner />;

  // Group campaigns by status
  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const archivedCampaigns = campaigns.filter(c => c.status === "archived");
  const routineCampaigns = campaigns.filter(c => c.status === "routine");
  const completedCampaigns = campaigns.filter(c => c.status === "completed");

  const renderCampaignGrid = (campaignList: Campaign[], showReset: boolean = false) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
      {campaignList.map(campaign => (
        <CampaignCard
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

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${gothicHeroBg})` }}
      />
      <div className="absolute inset-0 bg-background/80" />
      <div className="absolute inset-0 bg-gradient-fog opacity-30" />

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-6 md:px-12 py-6 border-b border-border/30">
          <div className="flex items-center gap-4">
            <Link to="/home" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Swords className="w-6 h-6 text-primary" />
              <h1 className="font-cinzel text-xl md:text-2xl font-bold tracking-widest text-foreground">
                Campaign Mode
              </h1>
            </div>
          </div>
          <div className="font-crimson text-sm text-muted-foreground hidden md:block">
            {user?.email}
          </div>
        </header>

        {/* Main */}
        <main className="px-6 md:px-12 py-8 max-w-6xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-10">
            <h2 className="text-gothic-title text-2xl md:text-3xl mb-3">
              Rally Your <span className="text-primary">Forces</span>
            </h2>
            <p className="font-crimson text-muted-foreground max-w-xl mx-auto">
              Combine tasks from the Forge and territories to conquer into epic campaigns. 
              Track your progress and claim victory.
            </p>
          </div>

          {/* Create Button */}
          <div className="flex justify-center mb-8">
            <Button
              onClick={() => setShowCreator(true)}
              className="gothic-button-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Campaign
            </Button>
          </div>

          {/* Campaign Sections */}
          <div className="space-y-4">
            {/* Active Campaigns */}
            <section>
              <CampaignSectionHeader
                title="Active Campaigns"
                count={activeCampaigns.length}
                isExpanded={expandedSections.active}
                onToggle={() => toggleSection("active")}
                icon={<Flame className="w-4 h-4" />}
              />
              {expandedSections.active && activeCampaigns.length > 0 && renderCampaignGrid(activeCampaigns)}
              {expandedSections.active && activeCampaigns.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 font-crimson">
                  No active campaigns. Create one to begin your quest!
                </p>
              )}
            </section>

            {/* Routine Campaigns */}
            <section>
              <CampaignSectionHeader
                title="Routine"
                count={routineCampaigns.length}
                isExpanded={expandedSections.routine}
                onToggle={() => toggleSection("routine")}
                icon={<RotateCcw className="w-4 h-4" />}
                className="border-accent/30"
              />
              {expandedSections.routine && routineCampaigns.length > 0 && renderCampaignGrid(routineCampaigns, true)}
              {expandedSections.routine && routineCampaigns.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 font-crimson">
                  Drag campaigns here for repeatable routines like morning rituals.
                </p>
              )}
            </section>

            {/* Archived Campaigns */}
            <section>
              <CampaignSectionHeader
                title="Archived"
                count={archivedCampaigns.length}
                isExpanded={expandedSections.archived}
                onToggle={() => toggleSection("archived")}
                icon={<Archive className="w-4 h-4" />}
                className="border-muted-foreground/30"
              />
              {expandedSections.archived && archivedCampaigns.length > 0 && renderCampaignGrid(archivedCampaigns)}
              {expandedSections.archived && archivedCampaigns.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 font-crimson">
                  No archived campaigns.
                </p>
              )}
            </section>

            {/* Completed Campaigns */}
            <section>
              <CampaignSectionHeader
                title="Completed"
                count={completedCampaigns.length}
                isExpanded={expandedSections.completed}
                onToggle={() => toggleSection("completed")}
                icon={<Trophy className="w-4 h-4" />}
                className="border-accent/30"
              />
              {expandedSections.completed && completedCampaigns.length > 0 && renderCampaignGrid(completedCampaigns)}
              {expandedSections.completed && completedCampaigns.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 font-crimson">
                  No completed campaigns yet. Finish your quests to see them here!
                </p>
              )}
            </section>
          </div>

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
