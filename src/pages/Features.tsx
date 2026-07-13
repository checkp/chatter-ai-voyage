import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sparkles, Newspaper } from 'lucide-react';
import { featureCategories, totalFeatureCount } from '@/data/features';

const SITE_URL = 'https://roboheard.ai';

const Features: React.FC = () => {
  useEffect(() => {
    document.title = `Features — ${totalFeatureCount}+ tools across 8 frontier models | RoboHeard`;

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
      `Every RoboHeard feature: 8 frontier AI models, 4 chat modes, Conductor orchestration, multi-model image studio, live market research, and more.`
    );

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${SITE_URL}/features`);

    // JSON-LD: ItemList of features
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'RoboHeard Features',
      itemListElement: featureCategories.flatMap((cat, ci) =>
        cat.features.map((f, fi) => ({
          '@type': 'ListItem',
          position: ci * 100 + fi + 1,
          name: f.title,
          description: f.description,
        }))
      ),
    };
    let script = document.getElementById('features-jsonld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'features-jsonld';
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
      {/* Top bar */}
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
            <Link to="/whats-new">
              <Button variant="ghost" size="sm">
                <Newspaper className="h-4 w-4 mr-1.5" /> What's new
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Open app</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-20 max-w-5xl">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to home
        </Link>

        <section className="mb-16">
          <Badge variant="outline" className="mb-4 text-primary border-primary/20">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Everything inside RoboHeard
          </Badge>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">
            Features
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
            A complete inventory of what RoboHeard does — across {featureCategories.length} categories
            and {totalFeatureCount} individual capabilities. Updated with every release.
          </p>
        </section>

        {/* Quick nav */}
        <nav aria-label="Feature categories" className="mb-12 flex flex-wrap gap-2">
          {featureCategories.map((cat) => (
            <a
              key={cat.id}
              href={`#${cat.id}`}
              className="px-3 py-1.5 text-xs md:text-sm rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {cat.name}
            </a>
          ))}
        </nav>

        {/* Categories */}
        <div className="space-y-16">
          {featureCategories.map((cat) => (
            <section key={cat.id} id={cat.id} className="scroll-mt-24">
              <div className="mb-6 max-w-2xl">
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-2">
                  {cat.name}
                </h2>
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                  {cat.blurb}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {cat.features.map((f) => (
                  <Card
                    key={f.title}
                    className="border-border/60 hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <h3 className="font-medium text-foreground">{f.title}</h3>
                        {f.tag && (
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                            {f.tag}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {f.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer CTA */}
        <section className="mt-20 text-center bg-primary/5 rounded-2xl p-10 border border-border/40">
          <h2 className="text-xl md:text-2xl font-semibold mb-3 tracking-tight">
            See it for yourself
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Try a real conversation with eight frontier models — no credit card.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/auth">
              <Button size="lg">Open RoboHeard</Button>
            </Link>
            <Link to="/whats-new">
              <Button size="lg" variant="outline">
                Read what's new
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Features;
