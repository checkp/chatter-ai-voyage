
export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  type: 'feature' | 'improvement' | 'fix';
  details: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: "2.1.0",
    date: "2025-01-11",
    title: "New Chat Modes: Isolated & Side-by-Side",
    description: "Major update introducing three distinct chat interaction modes for different conversation styles.",
    type: "feature",
    details: [
      "🎯 **Isolated Mode**: Each AI agent only sees user messages and their own responses, creating independent conversations",
      "📱 **Side-by-Side Mode**: Desktop-only view showing each agent in separate windows with isolated contexts",
      "💬 **Discussion Mode**: Original behavior where all agents can see and build upon each other's responses",
      "🔄 **Smart Mode Switching**: Easy mode selection with automatic mobile fallback (side-by-side → isolated)",
      "🎨 **Enhanced UI**: Mode selector with clear descriptions and visual indicators",
      "📊 **Per-Agent Windows**: In side-by-side mode, each agent gets dedicated space with response counters",
      "🔒 **Context Isolation**: Agents in isolated modes receive filtered conversation history",
      "💾 **Mode Persistence**: Chat mode settings are saved per conversation",
      "📱 **Mobile Optimized**: Side-by-side mode gracefully falls back to isolated mode on mobile devices"
    ]
  },
  {
    version: "2.0.3",
    date: "2025-01-10", 
    title: "Enhanced Multi-Agent Conversations",
    description: "Improved conversation flow and agent interaction capabilities.",
    type: "improvement",
    details: [
      "🤖 Fixed agent context building to prevent self-referencing responses",
      "⚡ Improved conversation history management for better context",
      "🔄 Enhanced message threading and response coordination",
      "📊 Better handling of concurrent agent responses",
      "🎯 Optimized token usage across multiple agents"
    ]
  },
  {
    version: "2.0.2",
    date: "2025-01-09",
    title: "Mobile Interface Improvements", 
    description: "Enhanced mobile experience with better navigation and responsive design.",
    type: "improvement",
    details: [
      "📱 Redesigned mobile header with improved agent status display",
      "🎨 Better responsive layout for chat messages and input",
      "⚡ Faster mobile chat loading and smoother scrolling",
      "🔧 Fixed mobile sidebar navigation issues",
      "📊 Improved mobile settings panel organization"
    ]
  },
  {
    version: "2.0.1",
    date: "2025-01-08",
    title: "Performance & Reliability Updates",
    description: "Backend optimizations and bug fixes for improved stability.",
    type: "fix", 
    details: [
      "🚀 Optimized database queries for faster chat loading",
      "🔧 Fixed token balance synchronization issues",
      "⚡ Improved real-time message updates",
      "🛡️ Enhanced error handling for API calls",
      "📊 Better memory management for large conversations"
    ]
  },
  {
    version: "2.0.0",
    date: "2025-01-07",
    title: "RoboHerd 2.0 - Multi-Agent Platform",
    description: "Complete redesign introducing multiple AI agents working together in collaborative conversations.",
    type: "feature",
    details: [
      "🤖 **Multi-Agent Support**: Chat with ChatGPT, Claude, DeepSeek, Grok, and Gemini simultaneously",
      "💬 **Collaborative Conversations**: AI agents can see and build upon each other's responses",
      "🎯 **Smart Agent Management**: Enable/disable specific agents and customize their models",
      "🔄 **Real-time Responses**: All enabled agents respond concurrently to your messages",
      "📊 **Token System**: Transparent token-based usage with daily free allowances",
      "🎨 **Agent Customization**: Reorder agents and select specific models for each platform",
      "⚡ **Free Mode**: Automated multi-round discussions between agents",
      "🛡️ **Secure API Integration**: Centralized API key management with encryption",
      "📱 **Mobile Responsive**: Full mobile support with touch-optimized interface",
      "🎪 **Enhanced UI**: Modern dark theme with agent-specific color coding"
    ]
  }
];
