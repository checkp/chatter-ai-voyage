
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, Zap, ArrowRight, Bot, MessageCircle, ArrowLeft, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onSkip: () => void;
}

const WelcomeScreen = ({ onGetStarted, onSkip }: WelcomeScreenProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  const samplePrompts = [
    "Hello everyone! I'm new to this multi-AI chat environment. Could each of you introduce yourselves and explain your unique capabilities? I'd love to understand how you each approach problem-solving differently.",
    "I'm exploring this amazing platform where multiple AI assistants can collaborate. Can you all share what makes each of you special and how you might work together to help me with complex tasks?",
    "Welcome to our conversation! I'm curious about your individual strengths. Could each AI agent tell me about your specialty areas and how you prefer to assist users in this collaborative environment?",
    "Hi team! I'm getting started with this multi-AI setup. Would each of you mind introducing your unique perspective and explaining how having multiple AI assistants available changes the conversation dynamic?"
  ];

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success('Prompt copied to clipboard!');
  };

  if (currentPage === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full space-y-8 animate-in fade-in duration-700">
          {/* Header with Logo */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <img 
                src="/lovable-uploads/90258cc1-9b63-4dac-b077-ccc51f69f93e.png" 
                alt="AI Chat Logo" 
                className="h-12 w-12 object-contain"
              />
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
                  <CardTitle className="text-lg">Conversation Mode</CardTitle>
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
            <Button onClick={() => setCurrentPage(2)} size="lg" className="group min-w-[200px]">
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
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8 animate-in fade-in duration-700">
        {/* Header with Logo */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <img 
              src="/lovable-uploads/90258cc1-9b63-4dac-b077-ccc51f69f93e.png" 
              alt="AI Chat Logo" 
              className="h-12 w-12 object-contain"
            />
            <Bot className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Get Started with AI Collaboration
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Here are some sample prompts to help onboard all AI agents and introduce them to this collaborative environment.
          </p>
        </div>

        {/* Sample Prompts */}
        <div className="grid gap-4">
          {samplePrompts.map((prompt, index) => (
            <Card key={index} className="relative overflow-hidden border hover:border-primary/50 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Sample Prompt {index + 1}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {prompt}
                    </p>
                  </div>
                  <Button
                    onClick={() => copyPrompt(prompt)}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tip Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg text-primary">💡 Pro Tip</h3>
              <p className="text-sm text-muted-foreground">
                Copy any of these prompts and paste them into your first chat to help all AI agents understand their collaborative environment. 
                This creates a great foundation for future conversations!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button onClick={() => setCurrentPage(1)} variant="outline" size="lg" className="min-w-[200px]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={onGetStarted} size="lg" className="group min-w-[200px]">
            Start Chatting
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
