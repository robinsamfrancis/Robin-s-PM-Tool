import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BpmLogo } from "@/components/BpmLogo";
import { MicrosoftIcon } from "@/components/MicrosoftIcon";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Sparkles, Users2, Workflow } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Beinex Project Mate" },
      {
        name: "description",
        content: "Sign in to Beinex Project Mate with your Microsoft account.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleMicrosoftLogin = () => {
    setLoading(true);
    // Mock auth flow — replace with real Microsoft Entra ID later.
    setTimeout(() => {
      localStorage.setItem(
        "bpm-user",
        JSON.stringify({
          name: "Alex Morgan",
          email: "alex.morgan@beinex.com",
          department: "Engineering",
          picture: "",
        }),
      );
      navigate({ to: "/" });
    }, 900);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-mesh opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,transparent_0%,var(--color-background)_70%)]" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* Left: Brand / illustration */}
        <div className="hidden flex-col justify-between p-12 lg:flex">
          <BpmLogo />

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs font-medium text-foreground/80">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI-assisted project management
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                Plan, ship and learn —
                <br />
                <span className="text-gradient">together.</span>
              </h1>
              <p className="max-w-md text-base text-muted-foreground">
                Beinex Project Mate brings Agile clarity to every team.
                Backlogs, sprints, roadmaps and team health — in one elegant
                workspace.
              </p>
            </div>

            <CollaborationIllustration />

            <div className="grid grid-cols-3 gap-3 max-w-md">
              {[
                { icon: Workflow, label: "Scrum-ready" },
                { icon: Users2, label: "Team-first" },
                { icon: ShieldCheck, label: "Enterprise SSO" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="glass rounded-xl p-3 text-center shadow-glass"
                >
                  <Icon className="mx-auto mb-1.5 h-4 w-4 text-primary" />
                  <p className="text-xs font-medium text-foreground/80">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Beinex. Secured by Microsoft Entra ID.
          </p>
        </div>

        {/* Right: Sign-in card */}
        <div className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8 flex justify-center">
              <BpmLogo />
            </div>

            <div className="glass rounded-3xl p-8 shadow-glass sm:p-10">
              <div className="mb-8 space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Welcome back
                </h2>
                <p className="text-sm text-muted-foreground">
                  Sign in with your Beinex Microsoft account to continue.
                </p>
              </div>

              <Button
                size="lg"
                onClick={handleMicrosoftLogin}
                disabled={loading}
                className="w-full justify-center gap-3 bg-foreground text-background hover:bg-foreground/90 h-12 text-sm font-medium"
              >
                <MicrosoftIcon className="h-5 w-5" />
                {loading ? "Signing you in…" : "Sign in with Microsoft"}
              </Button>

              <div className="mt-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">
                  Secure SSO
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                Protected by Microsoft Entra ID. By continuing you agree to
                Beinex's acceptable use policy.
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Trouble signing in? Contact{" "}
              <a
                className="font-medium text-foreground hover:text-primary"
                href="mailto:it@beinex.com"
              >
                it@beinex.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollaborationIllustration() {
  return (
    <div className="relative max-w-md">
      <div className="glass rounded-2xl p-5 shadow-glass">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Sprint 24 · In progress
          </span>
          <div className="flex -space-x-2">
            {["#7c5cff", "#22c1c3", "#ff7e5f"].map((c, i) => (
              <div
                key={i}
                className="h-6 w-6 rounded-full border-2 border-background"
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div className="space-y-2.5">
          {[
            { label: "User authentication flow", w: "85%", tone: "bg-success" },
            { label: "Onboarding redesign", w: "60%", tone: "bg-primary" },
            { label: "Sprint analytics", w: "35%", tone: "bg-info" },
            { label: "API rate limiting", w: "15%", tone: "bg-warning" },
          ].map((row) => (
            <div key={row.label} className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-foreground/80 font-medium">
                  {row.label}
                </span>
                <span className="text-muted-foreground">{row.w}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${row.tone}`}
                  style={{ width: row.w }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -bottom-4 -right-4 glass rounded-xl px-4 py-2.5 shadow-glass">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-medium text-foreground">
            Velocity +12%
          </span>
        </div>
      </div>
    </div>
  );
}
