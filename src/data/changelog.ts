
export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  type: 'feature' | 'improvement' | 'fix';
  changes: Array<{
    type: 'feature' | 'improvement' | 'bugfix';
    description: string;
  }>;
}

export const changelog: ChangelogEntry[] = [
  {
    version: "2.1.0",
    date: "2025-01-11",
    title: "New Chat Modes: Isolated & Side-by-Side",
    description: "Major update introducing three distinct chat interaction modes for different conversation styles.",
    type: "feature",
    changes: [
      { type: "feature", description: "🎯 Isolated Mode: Each AI agent only sees user messages and their own responses" },
      { type: "feature", description: "📱 Side-by-Side Mode: Desktop-only view showing each agent in separate windows" },
      { type: "feature", description: "💬 Discussion Mode: Original behavior where all agents can see each other's responses" },
      { type: "improvement", description: "🔄 Smart Mode Switching: Easy mode selection with automatic mobile fallback" },
      { type: "improvement", description: "🎨 Enhanced UI: Mode selector with clear descriptions and visual indicators" },
      { type: "feature", description: "📊 Per-Agent Windows: Each agent gets dedicated space with response counters" },
      { type: "feature", description: "🔒 Context Isolation: Agents in isolated modes receive filtered conversation history" },
      { type: "improvement", description: "💾 Mode Persistence: Chat mode settings are saved per conversation" },
      { type: "improvement", description: "📱 Mobile Optimized: Side-by-side mode gracefully falls back to isolated mode" }
    ]
  },
  {
    version: "2.0.3",
    date: "2025-01-10", 
    title: "Enhanced Multi-Agent Conversations",
    description: "Improved conversation flow and agent interaction capabilities.",
    type: "improvement",
    changes: [
      { type: "bugfix", description: "🤖 Fixed agent context building to prevent self-referencing responses" },
      { type: "improvement", description: "⚡ Improved conversation history management for better context" },
      { type: "improvement", description: "🔄 Enhanced message threading and response coordination" },
      { type: "improvement", description: "📊 Better handling of concurrent agent responses" },
      { type: "improvement", description: "🎯 Optimized token usage across multiple agents" }
    ]
  },
  {
    version: "2.0.2",
    date: "2025-01-09",
    title: "Mobile Interface Improvements", 
    description: "Enhanced mobile experience with better navigation and responsive design.",
    type: "improvement",
    changes: [
      { type: "improvement", description: "📱 Redesigned mobile header with improved agent status display" },
      { type: "improvement", description: "🎨 Better responsive layout for chat messages and input" },
      { type: "improvement", description: "⚡ Faster mobile chat loading and smoother scrolling" },
      { type: "bugfix", description: "🔧 Fixed mobile sidebar navigation issues" },
      { type: "improvement", description: "📊 Improved mobile settings panel organization" }
    ]
  },
  {
    version: "2.0.1",
    date: "2025-01-08",
    title: "Performance & Reliability Updates",
    description: "Backend optimizations and bug fixes for improved stability.",
    type: "fix", 
    changes: [
      { type: "improvement", description: "🚀 Optimized database queries for faster chat loading" },
      { type: "bugfix", description: "🔧 Fixed token balance synchronization issues" },
      { type: "improvement", description: "⚡ Improved real-time message updates" },
      { type: "improvement", description: "🛡️ Enhanced error handling for API calls" },
      { type: "improvement", description: "📊 Better memory management for large conversations" }
    ]
  },
  {
    version: "2.0.0",
    date: "2025-01-07",
    title: "RoboHerd 2.0 - Multi-Agent Platform",
    description: "Complete redesign introducing multiple AI agents working together in collaborative conversations.",
    type: "feature",
    changes: [
      { type: "feature", description: "🤖 Multi-Agent Support: Chat with ChatGPT, Claude, DeepSeek, Grok, and Gemini simultaneously" },
      { type: "feature", description: "💬 Collaborative Conversations: AI agents can see and build upon each other's responses" },
      { type: "feature", description: "🎯 Smart Agent Management: Enable/disable specific agents and customize their models" },
      { type: "feature", description: "🔄 Real-time Responses: All enabled agents respond concurrently to your messages" },
      { type: "feature", description: "📊 Token System: Transparent token-based usage with daily free allowances" },
      { type: "feature", description: "🎨 Agent Customization: Reorder agents and select specific models for each platform" },
      { type: "feature", description: "⚡ Free Mode: Automated multi-round discussions between agents" },
      { type: "feature", description: "🛡️ Secure API Integration: Centralized API key management with encryption" },
      { type: "feature", description: "📱 Mobile Responsive: Full mobile support with touch-optimized interface" },
      { type: "feature", description: "🎪 Enhanced UI: Modern dark theme with agent-specific color coding" }
    ]
  }
];
