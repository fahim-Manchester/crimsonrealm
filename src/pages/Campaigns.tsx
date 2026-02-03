import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCampaigns } from "@/hooks/useCampaigns";
import { CampaignCreator } from "@/components/campaigns/CampaignCreator";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
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
    deleteCampaign,
    fetchCampaignItems,
    refreshCampaigns
  } = useCampaigns();

  const [showCreator, setShowCreator] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

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
    await updateCampaignStatus(campaignId, "completed");
    if (activeCampaignId === campaignId) {
      setActiveCampaignId(null);
    }
  };

  // Handle time update from card timer (converts seconds to minutes)
  const handleTimeUpdate = useCallback(async (campaignId: string, additionalSeconds: number) => {
    const additionalMinutes = Math.ceil(additionalSeconds / 60);
    if (additionalMinutes > 0) {
      await updateCampaignTimeSpent(campaignId, additionalMinutes);
    }
  }, [updateCampaignTimeSpent]);

  if (authLoading || loading) return <LoadingSpinner />;

  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const completedCampaigns = campaigns.filter(c => c.status === "completed");

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

          {/* Active Campaigns */}
          {activeCampaigns.length > 0 && (
            <section className="mb-10">
              <h3 className="font-cinzel text-lg tracking-wide mb-4 text-foreground">
                Active Campaigns ({activeCampaigns.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCampaigns.map(campaign => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onStart={handleStartCampaign}
                    onDelete={deleteCampaign}
                    onComplete={handleCompleteCampaign}
                    fetchItems={fetchCampaignItems}
                    isActive={activeCampaignId === campaign.id}
                    onTimeUpdate={handleTimeUpdate}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed Campaigns */}
          {completedCampaigns.length > 0 && (
            <section className="mb-10">
              <h3 className="font-cinzel text-lg tracking-wide mb-4 text-muted-foreground">
                Completed Campaigns ({completedCampaigns.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedCampaigns.map(campaign => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onStart={handleStartCampaign}
                    onDelete={deleteCampaign}
                    onComplete={handleCompleteCampaign}
                    fetchItems={fetchCampaignItems}
                    isActive={false}
                    onTimeUpdate={handleTimeUpdate}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {campaigns.length === 0 && (
            <div className="gothic-card p-12 text-center">
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
    </div>
  );
};

export default Campaigns;
