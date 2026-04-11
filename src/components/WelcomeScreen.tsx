import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowRight, Bot, MessageCircle, ArrowLeft, Sparkles, Wrench, Bug, Brain } from 'lucide-react';
import { changelog } from '@/data/changelog';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onSkip: () => void;
}

const WelcomeScreen = ({ onGetStarted, onSkip }: WelcomeScreenProps) => {
  const [showChangelog, setShowChangelog] = useState(false);

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'feature': return <Sparkles className="h-4 w-4 text-green-600" />;
      case 'improvement': return <Wrench className="h-4 w-4 text-blue-600" />;
      case 'bugfix': return <Bug className="h-4 w-4 text-orange-600" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'feature': return 'bg-green-100 text-green-800 border-green-300';
      case 'improvement': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'bugfix': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (showChangelog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full space-y-8 animate-in fade-in duration-700">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <img src="/lovable-uploads/90258cc1-9b63-4dac-b077-ccc51f69f93e.png" alt="AI Chat Logo" className="h-8 sm:h-10 md:h-12 w-8 sm:w-10 md:w-12 object-contain" />
              <Sparkles className="h-6 sm:h-7 md:h-8 w-6 sm:w-7 md:w-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                What's New?
              </h1>
            </div>
          </div>

          <div className="space-y-6 max-h-[60vh] overflow-y-auto">
            {changelog.map((entry, index) => (
              <Card key={entry.version} className={index === 0 ? 'border-primary/50' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{entry.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v{entry.version}</Badge>
                      <span className="text-sm text-muted-foreground">{entry.date}</span>
                    </div>
                  </div>
                  <CardDescription>{entry.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {entry.changes.map((change, changeIndex) => (
                      <div key={changeIndex} className="flex items-start gap-3">
                        {getChangeIcon(change.type)}
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-sm">{change.description}</span>
                          <Badge variant="outline" className={`text-xs ${getChangeColor(change.type)}`}>
                            {change.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button onClick={() => setShowChangelog(false)} variant="outline" size="lg" className="min-w-[200px]">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={onGetStarted} size="lg" className="group min-w-[200px]">
              Start Chatting
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8 animate-in fade-in duration-700">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <img src="/lovable-uploads/90258cc1-9b63-4dac-b077-ccc51f69f93e.png" alt="AI Chat Logo" className="h-8 sm:h-10 md:h-12 w-8 sm:w-10 md:w-12 object-contain" />
            <Bot className="h-6 sm:h-7 md:h-8 w-6 sm:w-7 md:w-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Welcome to AI Chat
            </h1>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Multiple AI agents, one conversation. Get diverse perspectives instantly.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-2 hover:border-primary/50 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Multi-AI Chat</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed">
                Send one message, get responses from ChatGPT, Claude, Gemini, Grok & DeepSeek simultaneously.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Private Agent Chat</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed">
                Click any AI badge in the header to start a focused one-on-one conversation with a specific agent.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">AI Conductor</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed">
                Let one AI orchestrate the others for complex tasks requiring multiple perspectives and expertise.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button onClick={onGetStarted} size="lg" className="group min-w-[200px]">
            Start Chatting
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button onClick={() => setShowChangelog(true)} variant="outline" size="lg" className="min-w-[200px]">
            <Sparkles className="mr-2 h-4 w-4" />
            What's New?
          </Button>
          <Button onClick={onSkip} variant="ghost" size="lg" className="min-w-[200px]">
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
