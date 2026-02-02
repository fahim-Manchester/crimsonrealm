import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageLayout from "@/components/layout/PageLayout";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Trophy, Award, Gem, Clock } from "lucide-react";

interface CompletedProject {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface CompletedTask {
  id: string;
  title: string;
  description: string | null;
  time_logged: number | null;
  project_id: string | null;
  created_at: string;
  project_name?: string;
}

const Achievements = () => {
  const { user, loading: authLoading } = useAuth();
  const [completedProjects, setCompletedProjects] = useState<CompletedProject[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [allProjects, setAllProjects] = useState<{ id: string; name: string; status: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    // Fetch all projects for trophy case
    const { data: projectsData } = await supabase
      .from("projects")
      .select("id, name, description, status, created_at")
      .order("created_at", { ascending: false });

    if (projectsData) {
      setAllProjects(projectsData);
      setCompletedProjects(
        projectsData.filter((p) => p.status === "completed")
      );
    }

    // Fetch completed tasks with project names
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("id, title, description, time_logged, project_id, created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (tasksData && projectsData) {
      const tasksWithProjects = tasksData.map((task) => ({
        ...task,
        project_name: projectsData.find((p) => p.id === task.project_id)?.name,
      }));
      setCompletedTasks(tasksWithProjects);
    }

    setLoading(false);
  };

  const formatTime = (minutes: number | null) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const totalTimeLogged = completedTasks.reduce((acc, t) => acc + (t.time_logged || 0), 0);

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <PageLayout title="Achievements" subtitle="Your trophies, medals, and gems of conquest">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="gothic-card p-6 text-center">
            <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p className="font-cinzel text-2xl">{completedProjects.length}</p>
            <p className="font-crimson text-muted-foreground text-sm">Territories Conquered</p>
          </div>
          <div className="gothic-card p-6 text-center">
            <Award className="h-8 w-8 mx-auto mb-2 text-blue-400" />
            <p className="font-cinzel text-2xl">{completedTasks.length}</p>
            <p className="font-crimson text-muted-foreground text-sm">Tasks Completed</p>
          </div>
          <div className="gothic-card p-6 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-green-400" />
            <p className="font-cinzel text-2xl">{formatTime(totalTimeLogged) || "0m"}</p>
            <p className="font-crimson text-muted-foreground text-sm">Time Invested</p>
          </div>
        </div>

        {/* Trophy Case - Completed Projects */}
        <section>
          <h2 className="font-cinzel text-xl tracking-wide mb-6 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Trophy Case
          </h2>
          
          {allProjects.length === 0 ? (
            <div className="gothic-card p-8 text-center">
              <p className="font-crimson text-muted-foreground italic">
                No territories claimed yet. Start your conquest!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {allProjects.map((project) => {
                const isCompleted = project.status === "completed";
                return (
                  <div
                    key={project.id}
                    className={`gothic-card p-4 text-center transition-all ${
                      isCompleted
                        ? "border-yellow-500/30 bg-yellow-500/5"
                        : "opacity-40 grayscale"
                    }`}
                  >
                    <Trophy
                      className={`h-10 w-10 mx-auto mb-2 ${
                        isCompleted ? "text-yellow-500" : "text-muted-foreground"
                      }`}
                    />
                    <p className="font-cinzel text-sm truncate" title={project.name}>
                      {project.name}
                    </p>
                    {isCompleted && (
                      <p className="font-crimson text-xs text-yellow-500/70 mt-1">
                        Conquered
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Medals & Gems - Completed Tasks */}
        <section>
          <h2 className="font-cinzel text-xl tracking-wide mb-6 flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-400" />
            Medals & Gems
          </h2>

          {completedTasks.length === 0 ? (
            <div className="gothic-card p-8 text-center">
              <p className="font-crimson text-muted-foreground italic">
                No tasks completed yet. Forge your first victory!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedTasks.map((task, index) => {
                // Alternate between medal and gem based on time logged
                const hasSignificantTime = (task.time_logged || 0) >= 60;
                const Icon = hasSignificantTime ? Gem : Award;
                const iconColor = hasSignificantTime ? "text-purple-400" : "text-blue-400";
                const borderColor = hasSignificantTime
                  ? "border-purple-500/30"
                  : "border-blue-500/30";

                return (
                  <div
                    key={task.id}
                    className={`gothic-card p-4 flex items-center gap-4 ${borderColor}`}
                  >
                    <div className="flex-shrink-0">
                      <Icon className={`h-8 w-8 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-cinzel text-sm truncate">{task.title}</p>
                      {task.project_name && (
                        <p className="font-crimson text-xs text-muted-foreground">
                          {task.project_name}
                        </p>
                      )}
                    </div>
                    {task.time_logged && task.time_logged > 0 && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="font-crimson text-sm">
                          {formatTime(task.time_logged)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
};

export default Achievements;
