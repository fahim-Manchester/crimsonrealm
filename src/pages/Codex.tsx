import { useTheme } from "@/contexts/ThemeContext";
import { ThemeLabels } from "@/lib/themes";
import PageLayout from "@/components/layout/PageLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Compass,
  Swords,
  BookOpen,
  Star,
  Clock,
  Lightbulb,
  Map,
  ListChecks,
  BookMarked,
  Settings,
} from "lucide-react";
import { ReactNode } from "react";

interface Article {
  id: string;
  icon: typeof Compass;
  title: string;
  content: ReactNode;
}

function getArticles(l: ThemeLabels): Article[] {
  return [
    {
      id: "getting-started",
      icon: Compass,
      title: "Getting Started",
      content: (
        <>
          <p className="mb-3">
            Welcome to <strong>{l.appName}</strong> — a productivity system
            that turns your work into an epic quest. Here's how to begin.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-3">
            <li>After signing up and verifying your email, you'll arrive at the <strong>{l.homeName}</strong> — your home dashboard.</li>
            <li>From here you can access every section: {l.resources}, {l.tasks}, {l.projects}, {l.campaigns}, {l.achievements}, and {l.diary}.</li>
            <li>Start by creating a <strong>{l.projects}</strong> entry, then add <strong>{l.tasks}</strong> and <strong>{l.resources}</strong> linked to it.</li>
            <li>When you're ready for a focused work session, create a <strong>{l.campaigns}</strong> entry to combine tasks into a timed session.</li>
          </ul>
          <p>
            You can install the app on your phone using the install button in the navigation bar for quick access anytime.
          </p>
        </>
      ),
    },
    {
      id: "territories",
      icon: Map,
      title: `${l.projects}`,
      content: (
        <>
          <p className="mb-3">
            <strong>{l.projects}</strong> are your projects — the organizational backbone of the app.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-3">
            <li>Create entries to represent different areas of your life or work.</li>
            <li>Each entry can have a description, status, and tracked time.</li>
            <li>Tasks and resources can be linked, giving you a complete overview of everything related to a project.</li>
            <li>Organize into <strong>Groups</strong> for cleaner navigation when you have many projects.</li>
            <li>Statuses include: <strong>Active</strong>, <strong>On Hold</strong>, and <strong>Completed</strong>.</li>
          </ul>
        </>
      ),
    },
    {
      id: "chronicles",
      icon: BookOpen,
      title: `${l.resources}`,
      content: (
        <>
          <p className="mb-3">
            <strong>{l.resources}</strong> — {l.resourcesDesc}
          </p>
          <ul className="list-disc list-inside space-y-2 mb-3">
            <li>Add entries with a title, optional URL, description, and category.</li>
            <li>Link to one or more <strong>{l.projects}</strong> so they appear in context.</li>
            <li>Organize into <strong>Groups</strong> for quick filtering.</li>
            <li>Use search and filter tools to quickly find what you need.</li>
          </ul>
        </>
      ),
    },
    {
      id: "forge",
      icon: ListChecks,
      title: `${l.tasks}`,
      content: (
        <>
          <p className="mb-3">
            <strong>{l.tasks}</strong> — {l.tasksDesc}
          </p>
          <ul className="list-disc list-inside space-y-2 mb-3">
            <li>Create tasks with a title, description, priority level, due date, and optional project link.</li>
            <li>Task statuses flow from <strong>To Do → In Progress → Done</strong>.</li>
            <li>Priority levels: <strong>Low</strong>, <strong>Medium</strong>, <strong>High</strong>, and <strong>Critical</strong>.</li>
            <li>Each task tracks <strong>time logged</strong> — the total minutes you've spent working on it.</li>
            <li>Tasks can be organized into <strong>Groups</strong> and filtered by project.</li>
            <li>Tasks can also be added to <strong>{l.campaigns}</strong> entries for focused work sessions.</li>
          </ul>
        </>
      ),
    },
    {
      id: "campaigns",
      icon: Swords,
      title: `${l.campaigns}`,
      content: (
        <>
          <p className="mb-3">
            <strong>{l.campaigns}</strong> — {l.campaignsDesc}
          </p>
          <ul className="list-disc list-inside space-y-2 mb-3">
            <li>Create a session, give it a name and difficulty, then add items — these can be existing tasks, projects, or temporary items.</li>
            <li>Each entry tracks <strong>session count</strong>, <strong>total time spent</strong>, and <strong>planned time</strong>.</li>
            <li>Start a session to begin the <strong>Session Clock</strong> — a real-time timer.</li>
            <li>Within a session, mark items as complete, pause/resume the clock, and track time per individual item.</li>
            <li>Drag and drop cards to reorder on the main page.</li>
          </ul>
        </>
      ),
    },
    {
      id: "achievements",
      icon: Star,
      title: `${l.achievements} & The Cleave`,
      content: (
        <>
          <p className="mb-3">
            <strong>{l.achievements}</strong> track your progress. The <strong>Cleave</strong> is an AI-powered tool that finds patterns in your data.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-3">
            <li>View stats and insights about your productivity across all sections.</li>
            <li>The <strong>Cleave</strong> analyzes your resources, tasks, and projects to surface connections.</li>
            <li>Use the <strong>Dismantle</strong> feature to break down complex topics using AI assistance.</li>
          </ul>
        </>
      ),
    },
    {
      id: "time-tracking",
      icon: Clock,
      title: "How to Track Time",
      content: (
        <>
          <p className="mb-3">
            Time tracking is woven throughout the app. Here's how it works.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-3">
            <li><strong>{l.campaigns} Sessions:</strong> Start a session to activate the clock. It runs in real-time and automatically logs time.</li>
            <li><strong>Individual Items:</strong> Each item within a session tracks its own time.</li>
            <li><strong>{l.tasks}:</strong> Each task has a <strong>time logged</strong> field.</li>
            <li><strong>{l.projects}:</strong> Projects accumulate time from linked tasks and sessions.</li>
            <li><strong>Pause & Resume:</strong> You can pause the session clock at any time without losing progress.</li>
          </ul>
        </>
      ),
    },
    {
      id: "diary",
      icon: BookMarked,
      title: `${l.diary}`,
      content: (
        <>
          <p className="mb-3">
            <strong>{l.diary}</strong> — {l.diaryDesc}
          </p>
          <ul className="list-disc list-inside space-y-2 mb-3">
            <li>Create <strong>Books</strong> with custom titles and cover colors to organize your writing.</li>
            <li>Each book contains pages (entries) that you write using the <strong>Scribe</strong> dialog.</li>
            <li>Entries can be linked to {l.campaigns.toLowerCase()}, {l.projects.toLowerCase()}, {l.resources.toLowerCase()}, or {l.tasks.toLowerCase()} for context.</li>
            <li>Browse your books on the <strong>Bookshelf</strong> and read through them page by page.</li>
          </ul>
        </>
      ),
    },
    {
      id: "settings",
      icon: Settings,
      title: "Settings & Account",
      content: (
        <>
          <p className="mb-3">
            The <strong>Settings</strong> page lets you manage your account and app preferences.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-3">
            <li>Access settings from the gear icon in the {l.homeName} navigation bar.</li>
            <li>Manage your account details and sign-out options.</li>
            <li>Switch between themes using the palette icon to change the app's look and feel.</li>
          </ul>
        </>
      ),
    },
    {
      id: "tips",
      icon: Lightbulb,
      title: "Tips for Daily Use",
      content: (
        <>
          <p className="mb-3">
            Make the most of the app with these strategies.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-3">
            <li><strong>Install the PWA:</strong> Add to your home screen for instant access — it works offline too.</li>
            <li><strong>Plan with {l.campaigns}:</strong> Before starting work, create a session with your top 3-5 tasks.</li>
            <li><strong>Link everything:</strong> Connect tasks and resources to projects. This builds a rich knowledge graph.</li>
            <li><strong>Use Groups:</strong> Organize entries into groups to keep things tidy as your collection grows.</li>
            <li><strong>Review your {l.diary}:</strong> End each session by writing a brief reflection.</li>
            <li><strong>Check {l.achievements}:</strong> Periodically review your progress and use the Cleave for insights.</li>
            <li><strong>Short, focused sessions:</strong> 25-50 minute sessions work best. Consistency beats intensity.</li>
          </ul>
        </>
      ),
    },
  ];
}

const Codex = () => {
  const { themeConfig } = useTheme();
  const labels = themeConfig.labels;
  const articles = getArticles(labels);

  return (
    <PageLayout title={labels.codex} subtitle={labels.codexSubtitle}>
      <div className="max-w-3xl mx-auto">
        <Accordion type="multiple" className="space-y-2">
          {articles.map((article) => (
            <AccordionItem
              key={article.id}
              value={article.id}
              className="border border-border/40 rounded-sm bg-card/30 px-4"
            >
              <AccordionTrigger className="hover:no-underline gap-3">
                <span className="flex items-center gap-3">
                  <article.icon className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-cinzel text-sm md:text-base tracking-wide text-foreground">
                    {article.title}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="font-crimson text-sm md:text-base text-muted-foreground leading-relaxed">
                  {article.content}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </PageLayout>
  );
};

export default Codex;
