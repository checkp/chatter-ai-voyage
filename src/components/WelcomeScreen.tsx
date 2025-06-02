
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, Zap, ArrowRight, Bot, MessageCircle } from 'lucide-react';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onSkip: () => void;
}

const WelcomeScreen = ({ onGetStarted, onSkip }: WelcomeScreenProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8 animate-in fade-in duration-700">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Bot className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Welcome to AI Chat
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience the power of multiple AI agents working together. Let's show you how to get the most out of your conversations.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Multi-AI Chat</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription className="text-sm leading-relaxed">
                Send one message and get responses from multiple AI agents simultaneously. Compare perspectives and get comprehensive answers.
              </CardDescription>
              <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1">
                <div className="font-medium text-foreground">Example:</div>
                <div className="text-muted-foreground italic">Ask: "What's the best programming language?"</div>
                <div className="text-muted-foreground">→ Get responses from OpenAI, Claude, Grok & DeepSeek</div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Private Agent Chat</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription className="text-sm leading-relaxed">
                Click any AI agent's badge in the header to start a private conversation. Perfect for focused discussions with specific agents.
              </CardDescription>
              <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1">
                <div className="font-medium text-foreground">How to use:</div>
                <div className="text-muted-foreground">1. Look for AI badges in the header</div>
                <div className="text-muted-foreground">2. Click any badge to chat privately</div>
                <div className="text-muted-foreground">3. Your conversation stays between you and that agent</div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Free Mode</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription className="text-sm leading-relaxed">
                Watch AI agents discuss topics autonomously. Set a message limit and let the AIs explore ideas while you observe their conversation.
              </CardDescription>
              <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1">
                <div className="font-medium text-foreground">Perfect for:</div>
                <div className="text-muted-foreground">• Research and brainstorming</div>
                <div className="text-muted-foreground">• Exploring different viewpoints</div>
                <div className="text-muted-foreground">• Learning from AI discussions</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Demo Preview */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <MessageSquare className="h-12 w-12 text-primary mx-auto" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Ready to start chatting?</h3>
                <p className="text-muted-foreground text-sm">
                  Your first chat will be created automatically. You can enable/disable AI agents in settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button onClick={onGetStarted} size="lg" className="group min-w-[200px]">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button onClick={onSkip} variant="ghost" size="lg" className="min-w-[200px]">
            Skip Tutorial
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
