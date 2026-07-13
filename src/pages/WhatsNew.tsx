import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Sparkles, Wrench, Bug, ListChecks } from 'lucide-react';
import { changelog } from '@/data/changelog';

const SITE_URL = 'https://roboheard.ai';

const typeMeta: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  feature: { label: 'New', icon: Sparkles, className: 'bg-primary/10 text-primary border-primary/20' },
  improvement: {
    label: 'Improved',
    icon: Wrench,
    className: 'bg-secondary text-foreground border-border',
  },
  bugfix: {
    label: 'Fixed',
    icon: Bug,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

const WhatsNew: React.FC = () => {
  useEffect(() => {
    const latest = changelog[0];
    document.title = `What's New — ${latest?.title ?? 'RoboHeard updates'} | RoboHeard`;

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    setMeta(
      'description',
      `Every RoboHeard release in one place — new agents, image models, chat modes, and improvements. Latest: ${
        latest?.title ?? ''
      }.`
    );

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${SITE_URL}/whats-new`);

    // JSON-LD: list of release notes
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: "RoboHeard What's New",
      itemListElement: changelog.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'TechArticle',
          headline: `${c.version} — ${c.title}`,
          datePublished: c.date,
          description: c.description,
        },
      })),
    };
    let script = document.getElementById('whatsnew-jsonld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'whatsnew-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.text = JSON.stringify(ld);

    return () => {
      script?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/lovable-uploads/8f377fa8-bfb6-4d05-b000-3d477e975e49.png"
              alt="RoboHeard AI model orchestrator logo"
              className="h-7 w-7"
            />
            <span className="font-semibold">RoboHeard</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/features">
              <Button variant="ghost" size="sm">
                <ListChecks className="h-4 w-4 mr-1.5" /> Features
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Open app</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-20 max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to home
        </Link>

        <section className="mb-12">
          <Badge variant="outline" className="mb-4 text-primary border-primary/20">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Release notes
          </Badge>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">
            What's new
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Every change to RoboHeard, newest first. {changelog.length} releases and counting.
          </p>
        </section>

        <ol className="relative border-l border-border/60 pl-6 md:pl-8 space-y-10">
          {changelog.map((entry) => (
            <li key={entry.version} className="relative">
              <span className="absolute -left-[33px] md:-left-[41px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />

              <article>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                  <h2 className="text-lg md:text-xl font-semibold tracking-tight">
                    {entry.title}
                  </h2>
                  <Badge variant="outline" className="text-[11px] font-mono">
                    v{entry.version}
                  </Badge>
                  <time
                    className="text-xs text-muted-foreground"
                    dateTime={entry.date}
                  >
                    {new Date(entry.date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>

                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {entry.description}
                </p>

                <Card className="border-border/60">
                  <CardContent className="p-5 space-y-3">
                    {entry.changes.map((change, ci) => {
                      const meta = typeMeta[change.type] ?? typeMeta.improvement;
                      const Icon = meta.icon;
                      return (
                        <div key={ci} className="flex items-start gap-3 text-sm">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border flex-shrink-0 mt-0.5 ${meta.className}`}
                          >
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                          <span className="text-foreground/90 leading-relaxed">
                            {change.description}
                          </span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </article>
            </li>
          ))}
        </ol>

        <section className="mt-20 text-center bg-primary/5 rounded-2xl p-10 border border-border/40">
          <h2 className="text-xl md:text-2xl font-semibold mb-3 tracking-tight">
            Curious what's actually inside?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Browse the full feature inventory across all eight models, four chat modes, and the image studio.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/features">
              <Button size="lg">See all features</Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">
                Open RoboHeard
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <span className="fixed bottom-3 left-3 text-[10px] font-mono text-muted-foreground/40 select-none pointer-events-none">
        v{changelog[0]?.version}
      </span>
    </div>
  );
};

export default WhatsNew;
