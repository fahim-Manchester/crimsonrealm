import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageLayout from "@/components/layout/PageLayout";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
}

interface CategorizedGroup {
  theme: string;
  resources: Resource[];
}

const Achievements = () => {
  const { user, loading: authLoading } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [categorizedGroups, setCategorizedGroups] = useState<CategorizedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaving, setCleaving] = useState(false);
  const [hasCleaved, setHasCleaved] = useState(false);

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from("resources")
      .select("id, title, description, category")
      .order("title");
    
    if (error) {
      toast.error("Failed to fetch resources");
    } else {
      setResources(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchResources();
    }
  }, [user]);

  const handleCleave = async () => {
    if (resources.length === 0) {
      toast.error("No resources to categorize. Add some chronicles first.");
      return;
    }

    setCleaving(true);
    
    try {
      // Group resources by existing category or create smart groupings
      const grouped: Record<string, Resource[]> = {};
      
      resources.forEach((resource) => {
        const category = resource.category?.toLowerCase().trim() || "uncategorized";
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(resource);
      });

      // If we have mostly uncategorized, try to find patterns in titles/descriptions
      const uncategorized = grouped["uncategorized"] || [];
      if (uncategorized.length > resources.length / 2) {
        // Simple keyword-based categorization
        const patterns: Record<string, string[]> = {
          "Documentation": ["doc", "guide", "manual", "reference", "api"],
          "Tutorials": ["tutorial", "learn", "course", "how to", "getting started"],
          "Tools": ["tool", "utility", "app", "software", "platform"],
          "Articles": ["article", "blog", "post", "read", "write"],
          "Videos": ["video", "youtube", "watch", "stream"],
          "Code": ["github", "repo", "code", "library", "framework", "npm", "package"],
        };

        const newGroups: Record<string, Resource[]> = {};
        const stillUncategorized: Resource[] = [];

        uncategorized.forEach((resource) => {
          const text = `${resource.title} ${resource.description || ""}`.toLowerCase();
          let matched = false;

          for (const [theme, keywords] of Object.entries(patterns)) {
            if (keywords.some(keyword => text.includes(keyword))) {
              if (!newGroups[theme]) newGroups[theme] = [];
              newGroups[theme].push(resource);
              matched = true;
              break;
            }
          }

          if (!matched) {
            stillUncategorized.push(resource);
          }
        });

        // Merge with existing categories
        Object.entries(newGroups).forEach(([theme, items]) => {
          if (grouped[theme.toLowerCase()]) {
            grouped[theme.toLowerCase()].push(...items);
          } else {
            grouped[theme] = items;
          }
        });

        if (stillUncategorized.length > 0) {
          grouped["Uncategorized"] = stillUncategorized;
        }
        delete grouped["uncategorized"];
      }

      // Convert to array format
      const result: CategorizedGroup[] = Object.entries(grouped)
        .map(([theme, resources]) => ({
          theme: theme.charAt(0).toUpperCase() + theme.slice(1),
          resources,
        }))
        .filter(g => g.resources.length > 0)
        .sort((a, b) => b.resources.length - a.resources.length);

      setCategorizedGroups(result);
      setHasCleaved(true);
      toast.success("Resources cleaved into themes!");
    } catch (error) {
      toast.error("Failed to cleave resources");
    } finally {
      setCleaving(false);
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <PageLayout title="Achievements" subtitle="Witness the patterns in your collected knowledge">
      <div className="max-w-4xl mx-auto">
        {/* Cleave Button */}
        <div className="text-center mb-12">
          <div className="gothic-card p-8 inline-block">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-sm bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-cinzel text-xl tracking-wide">The Cleave</h2>
              <p className="font-crimson text-muted-foreground max-w-md">
                Invoke the ancient power to reveal hidden patterns within your chronicles. 
                Resources that share a common theme shall be gathered together.
              </p>
              <Button 
                onClick={handleCleave} 
                disabled={cleaving || resources.length === 0}
                className="gothic-button-primary mt-4"
              >
                {cleaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cleaving...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Cleave Resources
                  </>
                )}
              </Button>
              {resources.length === 0 && (
                <p className="font-crimson text-sm text-muted-foreground italic">
                  Add resources in Chronicles first
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Categorized Results */}
        {hasCleaved && (
          <div className="space-y-8 animate-fade-in">
            <h3 className="font-cinzel text-lg text-center text-muted-foreground tracking-widest uppercase">
              Revealed Patterns
            </h3>
            
            {categorizedGroups.length === 0 ? (
              <div className="text-center py-12">
                <p className="font-crimson text-muted-foreground italic">
                  No patterns emerged. Add more resources to discover themes.
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {categorizedGroups.map((group) => (
                  <div key={group.theme} className="gothic-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <h4 className="font-cinzel text-lg tracking-wide text-foreground">
                        {group.theme}
                      </h4>
                      <Badge variant="secondary" className="font-crimson">
                        {group.resources.length} {group.resources.length === 1 ? "resource" : "resources"}
                      </Badge>
                    </div>
                    <ul className="space-y-2">
                      {group.resources.map((resource) => (
                        <li 
                          key={resource.id} 
                          className="font-crimson text-muted-foreground pl-4 border-l-2 border-border/30"
                        >
                          <span className="text-foreground">{resource.title}</span>
                          {resource.description && (
                            <span className="text-sm ml-2">— {resource.description}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Achievements;
