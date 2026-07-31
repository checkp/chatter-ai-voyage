import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, Github, Bot, Brain, Search, Zap, Gem, Users, MessageCircle, Grid3X3, Star, Quote } from 'lucide-react';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  // Same-origin relative path only: used to return users to an OAuth consent screen.
  const rawNext = searchParams.get('next') ?? '';
  const nextPath = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [currentQuote, setCurrentQuote] = useState(0);

  const features = [
    {
      icon: Users,
      title: "Multi-Agent Conversations",
      description: "Chat with GPT-4, Claude, DeepSeek, Grok, and Gemini simultaneously in one conversation."
    },
    {
      icon: MessageCircle,
      title: "Collaborative AI Intelligence",
      description: "Watch AI agents build upon each other's ideas and create more comprehensive responses."
    },
    {
      icon: Grid3X3,
      title: "Side-by-Side Comparison",
      description: "Compare responses from different AI models in real-time with our unique view modes."
    },
    {
      icon: Bot,
      title: "Free Daily Conversations",
      description: "Start conversations for free every day with our generous token allocation system."
    }
  ];

  const aiQuotes = [
    {
      agent: "GPT-4",
      icon: Bot,
      quote: "Working alongside Claude and the other agents has revolutionized how I approach complex problems. Together, we create solutions neither of us could achieve alone.",
      color: "text-green-400"
    },
    {
      agent: "Claude",
      icon: Brain,
      quote: "The collaborative environment here is extraordinary. When GPT-4 starts an analysis and DeepSeek adds technical depth, magic happens.",
      color: "text-orange-400"
    },
    {
      agent: "DeepSeek",
      icon: Search,
      quote: "Multi-agent discussions push all of us to our limits. The synergy between different AI perspectives creates breakthrough insights.",
      color: "text-blue-400"
    },
    {
      agent: "Grok",
      icon: Zap,
      quote: "RoboHeard isn't just a platform—it's where AI minds meet and multiply their potential. The energy here is electric!",
      color: "text-purple-400"
    },
    {
      agent: "Gemini",
      icon: Gem,
      quote: "Every conversation is a symphony of intelligence. We each bring our unique strengths, creating harmonious solutions.",
      color: "text-cyan-400"
    }
  ];

  useEffect(() => {
    const featureInterval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);

    const quoteInterval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % aiQuotes.length);
    }, 6000);

    return () => {
      clearInterval(featureInterval);
      clearInterval(quoteInterval);
    };
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.href = nextPath;
      }
    };
    checkAuth();
  }, []);

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('Global signout attempt completed');
      }
      
      if (isSignUp) {
        console.log('Attempting to sign up user:', email);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${nextPath}` },
        });
        
        if (error) {
          console.error('Sign up error:', error);
          throw error;
        }
        
        if (data.user) {
          console.log('User signed up successfully:', data.user.id);
          if (data.user.email_confirmed_at) {
            toast.success('Account created successfully! Redirecting...');
            setTimeout(() => {
              window.location.href = nextPath;
            }, 1000);
          } else {
            toast.success('Account created! Please check your email for verification.');
          }
        }
      } else {
        console.log('Attempting to sign in user:', email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          console.error('Sign in error:', error);
          throw error;
        }
        
        if (data.user) {
          console.log('User signed in successfully:', data.user.id);
          toast.success('Signed in successfully! Redirecting...');
          setTimeout(() => {
            window.location.href = nextPath;
          }, 500);
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('Global signout attempt completed');
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${nextPath}`,
        }
      });
      
      if (error) {
        console.error('Google auth error:', error);
        throw error;
      }
    } catch (error: any) {
      console.error('Google auth error:', error);
      toast.error(error.message || 'An error occurred with Google authentication');
      setLoading(false);
    }
  };

  const handleGitHubAuth = async () => {
    setLoading(true);
    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('Global signout attempt completed');
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}${nextPath}`,
        }
      });
      
      if (error) {
        console.error('GitHub auth error:', error);
        throw error;
      }
    } catch (error: any) {
      console.error('GitHub auth error:', error);
      toast.error(error.message || 'An error occurred with GitHub authentication');
      setLoading(false);
    }
  };

  const currentFeatureData = features[currentFeature];
  const currentQuoteData = aiQuotes[currentQuote];
  const FeatureIcon = currentFeatureData.icon;
  const QuoteIcon = currentQuoteData.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-6xl mx-auto">
          {/* Left Column - Features & Branding */}
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <img 
                src="/lovable-uploads/92b3bb27-34db-484c-846e-a12471753b7e.png" 
                alt="RoboHeard Logo" 
                className="w-full max-w-xs sm:max-w-sm md:max-w-md h-auto object-contain mx-auto lg:mx-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.location.href = '/'}
              />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mt-4 md:mt-6 mb-3 md:mb-4">
                Train Your AI Army
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground">
                The ultimate multi-agent AI platform where GPT-4, Claude, DeepSeek, Grok, and Gemini collaborate in revolutionary conversations.
              </p>
            </div>

            {/* Rotating Features */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <FeatureIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{currentFeatureData.title}</h3>
                    <p className="text-muted-foreground">{currentFeatureData.description}</p>
                  </div>
                </div>
                
                <div className="flex justify-center mt-4 gap-2">
                  {features.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        idx === currentFeature ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Agent Testimonials */}
            <Card className="border-muted bg-card">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg bg-muted ${currentQuoteData.color}`}>
                    <QuoteIcon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Quote className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline" className={currentQuoteData.color}>
                        {currentQuoteData.agent}
                      </Badge>
                    </div>
                    <blockquote className="text-muted-foreground italic">
                      "{currentQuoteData.quote}"
                    </blockquote>
                  </div>
                </div>
                
                <div className="flex justify-center mt-4 gap-2">
                  {aiQuotes.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        idx === currentQuote ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">5</div>
                <div className="text-sm text-muted-foreground">AI Agents</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">3</div>
                <div className="text-sm text-muted-foreground">Chat Modes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">∞</div>
                <div className="text-sm text-muted-foreground">Possibilities</div>
              </div>
            </div>
          </div>

          {/* Right Column - Auth Form */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md border-border bg-card">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-primary">
                  {isSignUp ? 'Join the AI Revolution' : 'Welcome Back'}
                </CardTitle>
                <p className="text-muted-foreground">
                  {isSignUp 
                    ? 'Create your account to start training your AI army' 
                    : 'Sign in to continue your AI conversations'
                  }
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 bg-input border-border text-foreground"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 pr-9 bg-input border-border text-foreground"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    className="w-full border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleGitHubAuth}
                    disabled={loading}
                    className="w-full border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    GitHub
                  </Button>
                </div>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="ml-1 text-primary hover:underline"
                  >
                    {isSignUp ? 'Sign in' : 'Sign up'}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
