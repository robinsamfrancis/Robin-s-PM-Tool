import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState, useRef } from "react";
import { useWorkspaceStore } from "@/lib/workspace-store";
import {
  Layers,
  Zap,
  BookOpen,
  CheckSquare,
  Bug,
  Repeat,
  CalendarRange,
  Gauge,
  LineChart,
  PresentationIcon,
  MessageSquare,
  Target,
  ClipboardCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home — Beinex Project Mate" },
      {
        name: "description",
        content:
          "Manage projects, collaborate efficiently, and deliver value through Agile practices.",
      },
    ],
  }),
  component: HomePage,
});

interface ConceptCard {
  icon: typeof Layers;
  title: string;
  description: string;
  tone: "primary" | "info" | "success" | "warning" | "destructive" | "accent";
}

const ISSUE_TYPES: ConceptCard[] = [
  {
    icon: Layers,
    title: "Epic",
    description:
      "A large body of work that can be broken into multiple stories and features.",
    tone: "accent",
  },
  {
    icon: Zap,
    title: "Feature",
    description:
      "A major capability delivered to users, grouping related stories together.",
    tone: "primary",
  },
  {
    icon: BookOpen,
    title: "User Story",
    description:
      "A requirement written from the user's perspective — focused on value.",
    tone: "info",
  },
  {
    icon: CheckSquare,
    title: "Task",
    description:
      "A unit of work assigned to team members to move a story forward.",
    tone: "success",
  },
  {
    icon: Bug,
    title: "Bug",
    description:
      "An issue requiring correction — tracked and prioritized like other work.",
    tone: "destructive",
  },
];

const SPRINT_CONCEPTS: ConceptCard[] = [
  {
    icon: Repeat,
    title: "Sprint",
    description:
      "A fixed time-box where the team completes a planned set of work.",
    tone: "primary",
  },
  {
    icon: CalendarRange,
    title: "Sprint Planning",
    description:
      "A meeting where the team decides the scope and goal of the sprint.",
    tone: "info",
  },
  {
    icon: Gauge,
    title: "Sprint Velocity",
    description:
      "The amount of work, in story points, completed during a sprint.",
    tone: "success",
  },
  {
    icon: LineChart,
    title: "Sprint Burndown",
    description:
      "A chart showing work remaining vs. time — a pulse of the sprint.",
    tone: "warning",
  },
  {
    icon: PresentationIcon,
    title: "Sprint Review",
    description:
      "Demonstration of completed work to stakeholders at sprint end.",
    tone: "accent",
  },
  {
    icon: MessageSquare,
    title: "Sprint Retrospective",
    description: "The team reflects on the sprint and identifies improvements.",
    tone: "info",
  },
];

const QUALITY_CONCEPTS: ConceptCard[] = [
  {
    icon: Target,
    title: "Story Points",
    description:
      "A relative estimate of effort — capturing complexity, risk, and uncertainty.",
    tone: "primary",
  },
  {
    icon: ClipboardCheck,
    title: "Definition of Ready",
    description:
      "Shared criteria that a backlog item must meet before the team starts work.",
    tone: "warning",
  },
  {
    icon: CheckCircle2,
    title: "Definition of Done",
    description:
      "Shared criteria that work must meet to be considered complete and shippable.",
    tone: "success",
  },
];

function toneClasses(tone: ConceptCard["tone"]) {
  const map: Record<ConceptCard["tone"], string> = {
    primary: "bg-primary/10 text-primary",
    info: "bg-info/10 text-info",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    accent: "bg-accent text-accent-foreground",
  };
  return map[tone];
}

function ConceptGrid({ items }: { items: ConceptCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ icon: Icon, title, description, tone }) => (
        <div
          key={title}
          className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-lg hover:-translate-y-0.5"
        >
          <div
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-xl mb-4",
              toneClasses(tone),
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1.5">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
          <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ))}
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const { workspaces } = useWorkspaceStore();
  const [highlightTour, setHighlightTour] = useState(false);

  const handleTourClick = () => {
    const el = document.getElementById("work-hierarchy");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setHighlightTour(true);
      setTimeout(() => setHighlightTour(false), 2000);
    }
  };

  const hasWorkspaces = workspaces && workspaces.length > 0;
  const recentWorkspace = hasWorkspaces ? workspaces[0] : null;

  return (
    <AppShell title="Home">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8 lg:py-10 space-y-12">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-mesh">
          <div className="relative grid gap-8 p-8 lg:p-12 lg:grid-cols-[1.2fr_1fr] items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs font-medium text-foreground/80 w-fit">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Welcome to your Agile workspace
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
                Welcome to{" "}
                <span className="text-gradient">Beinex Project Mate</span>
              </h1>
              <p className="max-w-xl text-base lg:text-lg text-muted-foreground leading-relaxed">
                Manage projects, collaborate efficiently, and deliver value
                through Agile practices. Start by exploring the concepts below —
                then create your first workspace.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                {!hasWorkspaces ? (
                  <Button
                    asChild
                    size="lg"
                    className="gap-2 bg-gradient-primary text-primary-foreground hover:opacity-95 shadow-glow"
                  >
                    <Link to="/workspaces/new">
                      <Plus className="h-4 w-4" />
                      Create Your First Workspace
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() =>
                        navigate({
                          to: "/workspaces/$code/dashboard",
                          params: { code: recentWorkspace!.code },
                        })
                      }
                      size="lg"
                      className="gap-2 bg-gradient-primary text-primary-foreground hover:opacity-95 shadow-glow"
                    >
                      <ArrowRight className="h-4 w-4" /> Go to Workspace
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <Link to="/workspaces/new">
                        <Plus className="h-4 w-4" /> Create Workspace
                      </Link>
                    </Button>
                  </>
                )}
                <Button size="lg" variant="outline" onClick={handleTourClick}>
                  Take the Agile tour
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>

            <SprintFlowDiagram />
          </div>
        </section>

        {/* Section: Issue types */}
        <div
          id="work-hierarchy"
          className={cn(
            "scroll-mt-6 transition-colors duration-700 rounded-3xl",
            highlightTour && "bg-primary/5 ring-1 ring-primary/20",
          )}
        >
          <div className="p-4 sm:p-6 lg:p-8">
            <Section
              eyebrow="Work hierarchy"
              title="Break work down the Agile way"
              subtitle="Every project is made of layers — from epics down to bugs. Each type plays a specific role in delivering value."
            >
              <ConceptGrid items={ISSUE_TYPES} />
            </Section>
          </div>
        </div>

        {/* Section: Sprint lifecycle */}
        <Section
          eyebrow="Sprint lifecycle"
          title="Plan, run and learn every sprint"
          subtitle="Sprints give teams a steady rhythm of planning, building, demoing and improving."
        >
          <ConceptGrid items={SPRINT_CONCEPTS} />
        </Section>

        {/* Section: Quality */}
        <Section
          eyebrow="Quality & estimation"
          title="Shared agreements that make teams faster"
          subtitle="Clear estimates and shared definitions of Ready and Done remove ambiguity."
        >
          <ConceptGrid items={QUALITY_CONCEPTS} />
        </Section>

        {/* CTA */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 lg:p-10">
          <div className="absolute inset-0 bg-gradient-mesh opacity-50" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-2">
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                Ready to launch your first workspace?
              </h3>
              <p className="text-sm text-muted-foreground">
                Set up your team, configure your workflow, and start your first
                sprint in minutes.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="gap-2 bg-gradient-primary text-primary-foreground hover:opacity-95 shadow-glow"
            >
              <Link to="/workspaces/new">
                <Plus className="h-4 w-4" />
                Create workspace
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Section({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="max-w-2xl space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </p>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function SprintFlowDiagram() {
  const steps = [
    { label: "Backlog", tone: "bg-muted text-foreground" },
    { label: "Sprint Planning", tone: "bg-info/15 text-info" },
    { label: "In Progress", tone: "bg-primary/15 text-primary" },
    { label: "Review", tone: "bg-warning/20 text-warning" },
    { label: "Done", tone: "bg-success/15 text-success" },
  ];
  return (
    <div className="glass rounded-2xl p-6 shadow-glass">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sprint flow
          </p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            The Agile loop
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          Continuous delivery
        </div>
      </div>

      <div className="space-y-2.5">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-background border border-border text-[11px] font-semibold text-foreground">
              {i + 1}
            </div>
            <div
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-xs font-medium",
                step.tone,
              )}
            >
              {step.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <Stat label="Velocity" value="42 pts" />
        <Stat label="Stories" value="18" />
        <Stat label="Health" value="On track" tone="success" />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className="rounded-lg bg-background/60 p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-semibold mt-0.5",
          tone === "success" ? "text-success" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
