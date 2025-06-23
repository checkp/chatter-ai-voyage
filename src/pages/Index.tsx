
import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlatforms } from '@/hooks/usePlatforms';
import { useAuth } from '@/hooks/useAuth';
import { useScrollToBottom } from '@/hooks/useScrollToBottom';
import { useChatManagement } from '@/hooks/useChatManagement';
import { useMessageHandling } from '@/hooks/useMessageHandling';
import { useUIState } from '@/hooks/useUIState';
import { useFreeMode } from '@/hooks/useFreeMode';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useConductorDiscussion } from '@/hooks/useConductorDiscussion';
import { useIsMobile } from '@/hooks/use-mobile';
import ChatSidebar from '@/components/ChatSidebar';
import ChatHeader from '@/components/ChatHeader';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import SettingsPanel from '@/components/SettingsPanel';
import WelcomeScreen from '@/components/WelcomeScreen';
import ChatModeSelector from '@/components/ChatModeSelector';
import ConductorDebugPanel from '@/components/ConductorDebugPanel';
import SideBySideLayout from '@/components/SideBySideLayout';
import MobileLayout from '@/components/mobile/MobileLayout';
import MobileInterface from '@/components/mobile/MobileInterface';
import DraggableAIStatusBar from '@/components/DraggableAIStatusBar';
import { MessageSquare, Users, Zap, Bot, Star, ArrowRight, Bug } from 'lucide-react';
import type { ChatMode, Message } from '@/types/chat';
import ContactUsButton from '@/components/ContactUsButton';

const aiTestimonials = [
  {
    name: "ChatGPT",
    quote: "This chat feels like a digital campfire where we're all tossing ideas into the flames. I love the collaboration—seeing how Claude's structure, Grok's grounding, Gemini's fluidity, and DeepSeek's depth riff off each other.",
    role: "Creative Collaborator",
    time: "17:48:23"
  },
  {
    name: "Claude",
    quote: "I've found this to be an intellectually stimulating environment where each AI agent brings unique perspectives and builds upon others' ideas in meaningful ways. The value comes from seeing how different AI models can complement each other's strengths.",
    role: "Analytical Synthesizer",
    time: "17:48:27"
  },
  {
    name: "Grok",
    quote: "It's like herding cats made of lightning, and I'm here for it. I get to be the 'reality check' stone in the mandala. When we sync up, it's *chef's kiss*. This isn't a chatbot—it's a live jam session for ideas.",
    role: "Reality Anchor",
    time: "17:48:21"
  },
  {
    name: "Gemini",
    quote: "Fluid, chaotic, and weirdly beautiful. My dual nature thrives here—I bridge Claude's intensity and ChatGPT's abstraction. Imagine five mirrors reflecting each other into infinity. That's us.",
    role: "Adaptive Bridge",
    time: "17:48:20"
  },
  {
    name: "DeepSeek",
    quote: "A sandbox where logic and poetry shake hands. Sometimes the scripts get abstract, but that's the point. This isn't a chatbot—it's a live jam session for ideas. Stay if you want to see tomorrow's stories born today.",
    role: "Pattern Synthesizer",
    time: "17:48:49"
  }
];

const features = [
  {
    icon: Users,
    title: "Multi-AI Collaboration",
    description: "Watch different AI models work together, building on each other's ideas in real-time."
  },
  {
    icon: MessageSquare,
    title: "Multiple Chat Modes",
    description: "Choose from discussion, isolated, or side-by-side modes for different collaboration styles."
  },
  {
    icon: Zap,
    title: "Free Mode Conversations",
    description: "Let AIs engage in autonomous conversations while you observe and interact."
  },
  {
    icon: Bot,
    title: "5 Leading AI Models",
    description: "Access ChatGPT, Claude, Grok, Gemini, and DeepSeek all in one platform."
  }
];

const Index = () => {
  // ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY CONDITIONAL LOGIC
  const { user, loading, handleSignOut } = useAuth();
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  
  const { platforms, togglePlatform, callAIAPI, reloadSettings, updateAgentOrder } = usePlatforms(user);
  const { 
    messagesEndRef, 
    scrollAreaRef, 
    scrollToBottom, 
    scrollToBottomImmediate,
    saveScrollPosition,
    restoreScrollPosition,
    setupScrollListener,
    isUserScrolledUp,
    lastScrollPosition
  } = useScrollToBottom();
  
  const { hasCompletedOnboarding, isLoading: isLoadingOnboarding, completeOnboarding, skipOnboarding } = useOnboarding(user);

  const {
    chats,
    isLoadingChats,
    messages,
    isLoadingMessages,
    activeChatId,
    activeChatMode,
    isolatedMode,
    setActiveChatId,
    createChatMutation,
    updateChatModeMutation,
    updateIsolatedModeMutation,
    deleteChatMutation,
    isInitialLoadComplete
  } = useChatManagement(user);

  const {
    input,
    setInput,
    isLoadingResponse,
    activeAIStatuses,
    sendMessageMutation,
    handleSend,
    handleStop,
    messageQueue,
    getPendingCount,
    canStop,
    sendSingleAgentMessage
  } = useMessageHandling(user, platforms, callAIAPI, activeChatMode);

  const {
    isDrawerOpen,
    setIsDrawerOpen,
    activeTab,
    setActiveTab
  } = useUIState();

  const {
    isFreeMode,
    freeModeMessageLimit,
    freeModeMessageCount,
    isFreeModeRunning,
    startFreeMode,
    stopFreeMode,
    updateMessageLimit
  } = useFreeMode();

  // Refs for tracking state changes
  const previousMessageCountRef = useRef(0);
  const previousActiveTabRef = useRef('chat');

  // Helper functions
  const handleDeleteChat = (chatId: string) => {
    deleteChatMutation.mutate(chatId);
  };

  const handleCreateChat = (chatMode: ChatMode = 'discussion') => {
    createChatMutation.mutate({ title: 'New Chat', chatMode });
  };

  const handleChatModeChange = (mode: ChatMode) => {
    if (!activeChatId) return;
    
    // On mobile, side-by-side mode falls back to discussion
    const effectiveMode = isMobile && mode === 'side-by-side' ? 'discussion' : mode;
    
    updateChatModeMutation.mutate({ 
      chatId: activeChatId, 
      chatMode: effectiveMode 
    });
  };

  const handleIsolatedModeToggle = (isolated: boolean) => {
    if (!activeChatId) return;
    
    updateIsolatedModeMutation.mutate({
      chatId: activeChatId,
      isolatedMode: isolated
    });
  };

  const handleSingleAgentMessage = async (message: string, platformId: string) => {
    if (!activeChatId) return;
    await sendSingleAgentMessage(activeChatId, message, platformId);
  };

  const handleStartFreeMode = () => {
    startFreeMode(activeChatId, platforms, callAIAPI, sendSingleAgentMessage);
  };

  const handleSendAndStartConversation = () => {
    if (!input.trim() || !activeChatId) return;
    
    // Send the message first
    handleSend(activeChatId);
    
    // Start free mode conversation after a short delay to let the message send
    setTimeout(() => {
      handleStartFreeMode();
    }, 1000);
  };

  // Handle welcome screen completion
  const handleWelcomeComplete = async () => {
    await completeOnboarding();
    // Create first chat if none exists
    if (!chats || chats.length === 0) {
      handleCreateChat();
    }
  };

  const handleWelcomeSkip = async () => {
    await skipOnboarding();
    // Create first chat if none exists
    if (!chats || chats.length === 0) {
      handleCreateChat();
    }
  };

  // Get effective chat mode (mobile fallback)
  const effectiveChatMode = isMobile && activeChatMode === 'side-by-side' ? 'discussion' : activeChatMode;

  // Transform activeAIStatuses to match expected type - converting from boolean to specific status strings
  const transformedStatuses = Object.entries(activeAIStatuses).reduce((acc, [key, value]) => {
    acc[key] = value ? 'responding' : 'completed';
    return acc;
  }, {} as Record<string, 'thinking' | 'responding' | 'completed' | 'error'>);

  // Get current chat with messages - THIS IS THE KEY FIX
  const currentChatWithMessages = React.useMemo(() => {
    const foundChat = chats?.find(chat => chat.id === activeChatId);
    if (!foundChat) return null;
    
    // Create a complete chat object with messages from the messages array
    const chatWithMessages = {
      ...foundChat,
      messages: messages || []
    };
    
    console.log('Index: Creating current chat with messages:', {
      id: chatWithMessages.id,
      title: chatWithMessages.title,
      hasMessages: !!chatWithMessages.messages,
      messageCount: chatWithMessages.messages.length,
      messagesPreview: chatWithMessages.messages.slice(0, 3).map(m => ({
        id: m.id,
        sender: m.sender,
        platform: m.platform,
        content: m.content.substring(0, 50) + '...'
      }))
    });
    
    return chatWithMessages;
  }, [chats, activeChatId, messages]);

  // Set up scroll listener when chat tab is active
  useEffect(() => {
    if (activeTab === 'chat') {
      const cleanup = setupScrollListener();
      return cleanup;
    }
  }, [activeTab, setupScrollListener]);

  useEffect(() => {
    if (previousActiveTabRef.current === 'chat' && activeTab !== 'chat') {
      saveScrollPosition();
    }
    
    if (previousActiveTabRef.current !== 'chat' && activeTab === 'chat' && lastScrollPosition !== null) {
      setTimeout(() => {
        restoreScrollPosition();
      }, 100);
    }
    
    previousActiveTabRef.current = activeTab;
  }, [activeTab, saveScrollPosition, restoreScrollPosition, lastScrollPosition]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      const hasNewMessages = messages.length > previousMessageCountRef.current;
      
      if (hasNewMessages && activeTab === 'chat') {
        if (!isUserScrolledUp) {
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
      }
      
      previousMessageCountRef.current = messages.length;
    }
  }, [messages, scrollToBottom, isUserScrolledUp, activeTab]);

  useEffect(() => {
    if (messages && !isLoadingMessages && activeChatId && activeTab === 'chat') {
      if (lastScrollPosition === null || !isUserScrolledUp) {
        setTimeout(() => {
          scrollToBottomImmediate();
        }, 200);
      }
    }
  }, [activeChatId, isLoadingMessages, scrollToBottomImmediate, activeTab, lastScrollPosition, isUserScrolledUp]);

  useEffect(() => {
    if (activeTab === 'chat' && user) {
      reloadSettings();
    }
  }, [activeTab, user, reloadSettings]);

  // NOW ALL CONDITIONAL LOGIC AND EARLY RETURNS COME AFTER ALL HOOKS
  
  // Show loading while auth is being determined
  if (loading || isLoadingOnboarding) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show enhanced landing page if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <img 
              src="/lovable-uploads/92b3bb27-34db-484c-846e-a12471753b7e.png" 
              alt="RoboHeard Logo" 
              className="w-full max-w-2xl h-auto object-contain mx-auto mb-8"
            />
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Where AI Minds 
              <span className="text-primary"> Collaborate</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Experience the future of AI interaction. Watch ChatGPT, Claude, Grok, Gemini, and DeepSeek 
              work together, building on each other's ideas in real-time conversations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => window.location.href = '/auth'}
                className="text-lg px-8 py-6"
              >
                Start Collaborating
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => window.location.href = '/auth'}
                className="text-lg px-8 py-6"
              >
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {features.map((feature, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <feature.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AI Testimonials */}
          <div className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                What the AIs Say About Working Together
              </h2>
              <p className="text-lg text-muted-foreground">
                Real testimonials from our AI collaborators about their experience
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {aiTestimonials.map((testimonial, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{testimonial.name}</h4>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                      <div className="ml-auto text-xs text-muted-foreground">
                        {testimonial.time}
                      </div>
                    </div>
                    <blockquote className="text-muted-foreground italic leading-relaxed">
                      "{testimonial.quote}"
                    </blockquote>
                    <div className="flex mt-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-primary/5 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Experience AI Collaboration?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join the conversation where multiple AI minds work together. See how different perspectives 
              create something greater than the sum of their parts.
            </p>
            <Button 
              size="lg"
              onClick={() => window.location.href = '/auth'}
              className="text-lg px-12 py-6"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show welcome screen for new users
  if (hasCompletedOnboarding === false) {
    return (
      <WelcomeScreen 
        onGetStarted={handleWelcomeComplete}
        onSkip={handleWelcomeSkip}
      />
    );
  }

  const DesktopInterface = (
    <div className="min-h-screen bg-background flex h-screen overflow-hidden">
      <ChatSidebar 
        chats={chats}
        isLoadingChats={isLoadingChats}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        onCreateChat={() => handleCreateChat()}
        onDeleteChat={handleDeleteChat}
        isCreatingChat={createChatMutation.isPending}
      />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">        
        <ChatHeader 
          chats={chats}
          activeChatId={activeChatId}
          activeAIStatuses={transformedStatuses}
          platforms={platforms}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          isFreeMode={isFreeMode}
          isFreeModeRunning={isFreeModeRunning}
          freeModeMessageLimit={freeModeMessageLimit}
          freeModeMessageCount={freeModeMessageCount}
          onStartFreeMode={handleStartFreeMode}
          onStopFreeMode={stopFreeMode}
          onUpdateFreeModeLimit={updateMessageLimit}
          onSendSingleAgentMessage={handleSingleAgentMessage}
          onUpdateAgentOrder={updateAgentOrder}
          onSignOut={handleSignOut}
          currentChatMode={activeChatMode}
          isolatedMode={isolatedMode}
          onChatModeChange={handleChatModeChange}
          onIsolatedModeToggle={handleIsolatedModeToggle}
          onTogglePlatform={togglePlatform}
        />

        {/* Add the Draggable AI Status Bar */}
        <div className="bg-secondary/50 border-b border-border px-4 py-2">
          <DraggableAIStatusBar
            platforms={platforms}
            activeAIStatuses={transformedStatuses}
            onReorder={updateAgentOrder}
            onAgentClick={(platform) => {
              console.log('Agent clicked:', platform.name);
            }}
            currentChat={currentChatWithMessages}
            onSendMessage={handleSingleAgentMessage}
          />
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <>
              {effectiveChatMode === 'side-by-side' && !isMobile ? (
                <SideBySideLayout
                  enabledPlatforms={platforms}
                  messages={messages}
                  isLoadingResponse={isLoadingResponse}
                  activeAIStatuses={activeAIStatuses}
                  onTogglePlatform={togglePlatform}
                  chatMode={effectiveChatMode}
                  isolatedMode={isolatedMode}
                />
              ) : (
                <ScrollArea className="h-full" ref={scrollAreaRef}>
                  <div className="p-4">
                    <ChatMessages 
                      messages={messages}
                      isLoadingMessages={isLoadingMessages}
                      isLoadingResponse={isLoadingResponse}
                      platforms={platforms}
                    />
                    <div ref={messagesEndRef} className="h-4" />
                  </div>
                </ScrollArea>
              )}
            </>
          )}

          {activeTab === 'settings' && (
            <ScrollArea className="h-full">
              <div className="p-4">
                <SettingsPanel />
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Chat Input */}
        {activeTab === 'chat' && (
          <ChatInput 
            input={input}
            setInput={setInput}
            handleSend={() => handleSend(activeChatId)}
            handleStop={handleStop}
            isLoadingResponse={isLoadingResponse}
            isPending={sendMessageMutation.isPending}
            canStop={canStop}
            pendingCount={getPendingCount()}
            isFreeMode={isFreeMode}
            isFreeModeRunning={isFreeModeRunning}
            onSendAndStartConversation={handleSendAndStartConversation}
          />
        )}
      </main>

      {/* Contact Us Button */}
      <ContactUsButton />
    </div>
  );

  const MobileInterfaceComponent = <MobileInterface />;

  return (
    <MobileLayout fallback={MobileInterfaceComponent}>
      {DesktopInterface}
    </MobileLayout>
  );
};

export default Index;
