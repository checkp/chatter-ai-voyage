import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Server, Key, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageSeo from '@/components/PageSeo';


type ToolStatus = 'available' | 'soon';
const tools: Array<{ title: string; description: string; icon: typeof Server; to: string; status: ToolStatus; cta: string }> = [
  {
    title: 'MCP Server',
    description:
      'Connect your coding agents (Cursor, Claude Code, Windsurf) to RoboHeard. Access conductor, multi-model chat, and web search as MCP tools.',
    icon: Server,
    to: '/mcp',
    status: 'available',
    cta: 'Open MCP Setup',
  },
  {
    title: 'API Access',
    description:
      'Programmatic REST API for calling models, orchestrating the conductor, and running web search from your own scripts and apps.',
    icon: Key,
    to: '/api',
    status: 'available',
    cta: 'Open API Access',
  },
];

const Tools: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Developer Tools</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-muted-foreground mb-6 text-sm">
          Extend RoboHeard into your own workflows. Connect coding agents via MCP, or (soon) call our API directly.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {tools.map((t) => {
            const Icon = t.icon;
            const disabled = t.status === 'soon';
            const card = (
              <Card
                className={`h-full transition-colors ${
                  disabled ? 'opacity-70' : 'hover:border-primary cursor-pointer'
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base">{t.title}</CardTitle>
                    </div>
                    {disabled && <Badge variant="secondary">Soon</Badge>}
                  </div>
                  <CardDescription className="pt-2">{t.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant={disabled ? 'outline' : 'default'} size="sm" disabled={disabled} className="w-full">
                    {t.cta}
                  </Button>
                </CardContent>
              </Card>
            );
            return disabled ? (
              <div key={t.title}>{card}</div>
            ) : (
              <Link key={t.title} to={t.to} className="block">
                {card}
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Tools;
