
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  MessageSquare, 
  Users, 
  Zap, 
  Shield, 
  Sparkles,
  Grid3X3,
  Eye,
  Layers,
  ArrowRight,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Bot className="h-8 w-8 text-blue-600" />,
      title: "Multi-Agent AI Platform",
      description: "Chat with GPT-4, Claude, DeepSeek, Grok, and Gemini simultaneously in one unified interface."
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-green-600" />,
      title: "Three Chat Modes",
      description: "Discussion mode for collaborative AI, Isolated mode for independent responses, and Side-by-Side for focused comparison."
    },
    {
      icon: <Users className="h-8 w-8 text-purple-600" />,
      title: "AI Collaboration",
      description: "Watch AI agents discuss, debate, and build upon each other's ideas in real-time conversations."
    },
    {
      icon: <Zap className="h-8 w-8 text-yellow-600" />,
      title: "Free Mode Conversations",
      description: "Automated multi-round discussions between AI agents without manual intervention."
    },
    {
      icon: <Grid3X3 className="h-8 w-8 text-indigo-600" />,
      title: "Side-by-Side Analysis",
      description: "Compare AI responses in dedicated windows with individual agent controls and response tracking."
    },
    {
      icon: <Shield className="h-8 w-8 text-red-600" />,
      title: "Secure & Private",
      description: "Encrypted API key storage and secure token-based usage with transparent pricing."
    }
  ];

  const aiModels = [
    { name: "GPT-4", provider: "OpenAI", color: "bg-green-100 text-green-800" },
    { name: "Claude", provider: "Anthropic", color: "bg-orange-100 text-orange-800" },
    { name: "DeepSeek", provider: "DeepSeek AI", color: "bg-blue-100 text-blue-800" },
    { name: "Grok", provider: "xAI", color: "bg-purple-100 text-purple-800" },
    { name: "Gemini", provider: "Google", color: "bg-red-100 text-red-800" }
  ];

  const chatModes = [
    {
      name: "Discussion Mode",
      icon: <Users className="h-6 w-6" />,
      description: "All AI agents can see each other's responses and build collaborative conversations",
      features: ["Cross-agent collaboration", "Rich context sharing", "Emergent insights"]
    },
    {
      name: "Isolated Mode", 
      icon: <Eye className="h-6 w-6" />,
      description: "Each agent only sees user messages and their own responses",
      features: ["Independent perspectives", "Unbiased responses", "Parallel processing"]
    },
    {
      name: "Side-by-Side Mode",
      icon: <Grid3X3 className="h-6 w-6" />,
      description: "Isolated mode with dedicated windows for each agent (desktop only)",
      features: ["Visual comparison", "Individual controls", "Response tracking"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/50 to-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/lovable-uploads/8f377fa8-bfb6-4d05-b000-3d477e975e49.png" 
              alt="RoboHeard" 
              className="h-8 w-8" 
            />
            <h1 className="text-2xl font-bold">RoboHeard</h1>
          </div>
          <Button onClick={() => navigate('/auth')}>
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-4">
            <Sparkles className="mr-2 h-4 w-4" />
            Multi-Agent AI Platform
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-600 to-blue-600 bg-clip-text text-transparent">
            Train Your AI Army
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
            Revolutionary conversation platform where multiple AI agents collaborate, debate, and generate insights together. 
            Watch GPT-4, Claude, DeepSeek, Grok, and Gemini work as a team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8 py-6">
              Start Free Conversations
              <Bot className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="text-lg px-8 py-6">
              View Demo
              <Eye className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* AI Models Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Supported AI Models</h2>
          <p className="text-muted-foreground text-lg">Access the best AI models from leading providers in one platform</p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          {aiModels.map((model) => (
            <Badge key={model.name} className={`px-6 py-3 text-lg ${model.color}`}>
              {model.name} by {model.provider}
            </Badge>
          ))}
        </div>
      </section>

      {/* Chat Modes Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Three Conversation Modes</h2>
          <p className="text-muted-foreground text-lg">Choose how your AI agents interact and collaborate</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {chatModes.map((mode) => (
            <Card key={mode.name} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  {mode.icon}
                  <CardTitle className="text-xl">{mode.name}</CardTitle>
                </div>
                <CardDescription className="text-base leading-relaxed">
                  {mode.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {mode.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
          <p className="text-muted-foreground text-lg">Everything you need for advanced AI conversations</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Card key={feature.title} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  {feature.icon}
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-20 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">Ready to Build Your AI Team?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of users who are already experiencing the power of collaborative AI conversations.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-12 py-6">
            Start Your Free Trial
            <Sparkles className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-secondary/50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <img 
                src="/lovable-uploads/8f377fa8-bfb6-4d05-b000-3d477e975e49.png" 
                alt="RoboHeard" 
                className="h-6 w-6" 
              />
              <span className="font-semibold">RoboHeard</span>
            </div>
            <p className="text-muted-foreground text-center">
              © 2025 RoboHeard. Train your AI army with collaborative conversations.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
