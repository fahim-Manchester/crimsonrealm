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

const articles = [
  {
    id: "getting-started",
    icon: Compass,
    title: "Getting Started",
    content: (
      <>
        <p className="mb-3">
          Welcome to <strong>Crimson Realm</strong> — a gothic-themed productivity system
          that turns your work into an epic quest. Here's how to begin your journey.
        </p>
        <ul className="list-disc list-inside space-y-2 mb-3">
          <li>After signing up and verifying your email, you'll arrive at the <strong>Crimson Keep</strong> — your home dashboard.</li>
          <li>From here you can access every section of the Realm: Chronicles, Forge, Territories, Campaigns, Achievements, and Diary.</li>
          <li>Start by creating a <strong>Territory</strong> (project), then add <strong>Forge</strong> tasks and <strong>Chronicle</strong> resources linked to it.</li>
          <li>When you're ready for a focused work session, create a <strong>Campaign</strong> to combine tasks into a timed quest.</li>
        </ul>
        <p>
          You can install Crimson Realm as an app on your phone or desktop using the install button in the navigation bar for quick access anytime.
        </p>
      </>
    ),
  },
  {
    id: "territories",
    icon: Map,
    title: "Territories (Projects)",
    content: (
      <>
        <p className="mb-3">
          <strong>Territories</strong> are your projects — the domains you've claimed in your conquest.
          They serve as the organizational backbone of the Realm.
        </p>
        <ul className="list-disc list-inside space-y-2 mb-3">
          <li>Create territories to represent different areas of your life or work (e.g., "Web App", "Research", "Personal").</li>
          <li>Each territory can have a description, status, and tracked time.</li>
          <li>Tasks and resources can be linked to a territory, giving you a complete overview of everything related to a project.</li>
          <li>Organize territories into <strong>Groups</strong> for cleaner navigation when you have many projects.</li>
          <li>Territory statuses include: <strong>Active</strong>, <strong>On Hold</strong>, and <strong>Completed</strong>.</li>
        </ul>
        <p>
          Think of territories as the map of your realm — each one is a land you're working to conquer.
        </p>
      </>
    ),
  },
  {
    id: "chronicles",
    icon: BookOpen,
    title: "Chronicles (Resources)",
    content: (
      <>
        <p className="mb-3">
          <strong>Chronicles</strong> are your collection of sacred resources — links, references, notes,
          and any knowledge that guides your journey.
        </p>
        <ul className="list-disc list-inside space-y-2 mb-3">
          <li>Add resources with a title, optional URL, description, and category.</li>
          <li>Link resources to one or more <strong>Territories</strong> so they appear in context when you need them.</li>
          <li>Organize chronicles into <strong>Groups</strong> for quick filtering (e.g., "Documentation", "Tutorials", "Design Refs").</li>
          <li>Use the search and filter tools to quickly find what you need across all your resources.</li>
        </ul>
        <p>
          Chronicles ensure that no knowledge is ever lost — everything you discover is catalogued for future reference.
        </p>
      </>
    ),
  },
  {
    id: "forge",
    icon: ListChecks,
    title: "The Forge (Tasks)",
    content: (
      <>
        <p className="mb-3">
          <strong>The Forge</strong> is where raw ideas are hammered into completed work.
          It's your task management system.
        </p>
        <ul className="list-disc list-inside space-y-2 mb-3">
          <li>Create tasks with a title, description, priority level, due date, and optional territory link.</li>
          <li>Task statuses flow from <strong>To Do → In Progress → Done</strong>.</li>
          <li>Priority levels: <strong>Low</strong>, <strong>Medium</strong>, <strong>High</strong>, and <strong>Critical</strong>.</li>
          <li>Each task tracks <strong>time logged</strong> — the total minutes you've spent working on it.</li>
          <li>Tasks can be organized into <strong>Groups</strong> and filtered by territory.</li>
          <li>Tasks can also be added to <strong>Campaigns</strong> as quest items for focused work sessions.</li>
        </ul>
        <p>
          The Forge is the beating heart of your productivity — every accomplishment starts here.
        </p>
      </>
    ),
  },
  {
    id: "campaigns",
    icon: Swords,
    title: "Campaigns",
    content: (
      <>
        <p className="mb-3">
          <strong>Campaigns</strong> are epic, timed work sessions where you rally your forces
          and tackle a focused set of quests.
        </p>
        <ul className="list-disc list-inside space-y-2 mb-3">
          <li>Create a campaign, give it a name and difficulty, then add <strong>quest items</strong> — these can be existing tasks, projects, or temporary items created just for the session.</li>
          <li>Each campaign tracks <strong>session count</strong>, <strong>total time spent</strong>, and <strong>planned time</strong>.</li>
          <li>Start a session to begin the <strong>Session Clock</strong> — a real-time timer that tracks your focused work.</li>
          <li>Within a session, mark quest items as complete, pause/resume the clock, and track time per individual item.</li>
          <li>Campaign statuses: <strong>Planning</strong>, <strong>Active</strong>, <strong>Paused</strong>, and <strong>Completed</strong>.</li>
          <li>Drag and drop campaign cards to reorder them on the campaigns page.</li>
        </ul>
        <p>
          Campaigns turn mundane task lists into focused, gamified work sessions — perfect for deep work sprints.
        </p>
      </>
    ),
  },
  {
    id: "achievements",
    icon: Star,
    title: "Achievements & The Cleave",
    content: (
      <>
        <p className="mb-3">
          <strong>Achievements</strong> track your progress and reward you for consistent effort.
          The <strong>Cleave</strong> is an AI-powered tool that finds patterns in your data.
        </p>
        <ul className="list-disc list-inside space-y-2 mb-3">
          <li>The Achievements page shows stats and insights about your productivity across all sections.</li>
          <li>The <strong>Cleave</strong> analyzes your resources, tasks, and projects to surface connections and patterns you might have missed.</li>
          <li>Use the <strong>Dismantle</strong> feature to break down complex topics into actionable pieces using AI assistance.</li>
          <li>AI usage is tracked to help you stay mindful of how often you rely on automated insights.</li>
        </ul>
        <p>
          Achievements give meaning to your grind — every task completed and session run builds toward something greater.
        </p>
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
          Time tracking is woven throughout the Realm. Here's how it works across different sections.
        </p>
        <ul className="list-disc list-inside space-y-2 mb-3">
          <li><strong>Campaign Sessions:</strong> Start a campaign session to activate the session clock. It runs in real-time and automatically logs time to the campaign.</li>
          <li><strong>Quest Items:</strong> Individual quest items within a campaign track their own time spent during sessions.</li>
          <li><strong>Tasks:</strong> Each task has a <strong>time logged</strong> field showing total minutes spent.</li>
          <li><strong>Territories:</strong> Projects accumulate time from all linked tasks and campaign sessions.</li>
          <li><strong>Pause & Resume:</strong> You can pause the session clock at any time without losing progress. Time is saved when you pause or end the session.</li>
        </ul>
        <p>
          All time values are displayed in a human-readable format (hours and minutes) throughout the app.
        </p>
      </>
    ),
  },
  {
    id: "diary",
    icon: BookMarked,
    title: "The Diary",
    content: (
      <>
        <p className="mb-3">
          <strong>The Diary</strong> is your personal collection of tomes and reflections —
          a place to record thoughts, session notes, and journal entries.
        </p>
        <ul className="list-disc list-inside space-y-2 mb-3">
          <li>Create <strong>Books</strong> with custom titles and cover colors to organize your writing.</li>
          <li>Each book contains pages (entries) that you write using the <strong>Scribe</strong> dialog.</li>
          <li>Entries can be linked to campaigns, projects, resources, or tasks for context.</li>
          <li>Browse your books on the <strong>Bookshelf</strong> and read through them page by page.</li>
          <li>Use the diary for session reflections, brainstorming, meeting notes, or personal journaling.</li>
        </ul>
        <p>
          The Diary ensures your thoughts are preserved alongside your work — a living record of your journey.
        </p>
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
          <li>Access settings from the gear icon in the Sanctum navigation bar.</li>
          <li>Manage your account details and sign-out options.</li>
          <li>The app uses a dark gothic theme by default, designed for focused, distraction-free work.</li>
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
          Make the most of Crimson Realm with these battle-tested strategies.
        </p>
        <ul className="list-disc list-inside space-y-2 mb-3">
          <li><strong>Install the PWA:</strong> Add Crimson Realm to your home screen for instant access — it works offline too.</li>
          <li><strong>Plan with Campaigns:</strong> Before starting work, create a campaign with your top 3-5 tasks. This focuses your session.</li>
          <li><strong>Link everything:</strong> Connect tasks and resources to territories. This builds a rich knowledge graph over time.</li>
          <li><strong>Use Groups:</strong> Organize resources, tasks, and projects into groups to keep things tidy as your realm grows.</li>
          <li><strong>Review your Diary:</strong> End each session by writing a brief reflection in your diary. It helps with retention and planning.</li>
          <li><strong>Check Achievements:</strong> Periodically visit Achievements to see your progress and use the Cleave for insights.</li>
          <li><strong>Short, focused campaigns:</strong> 25-50 minute campaigns work best. Don't plan marathon sessions — consistency beats intensity.</li>
        </ul>
      </>
    ),
  },
];

const Codex = () => {
  return (
    <PageLayout
      title="The Codex"
      subtitle="A tome of knowledge for the weary traveler."
    >
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
