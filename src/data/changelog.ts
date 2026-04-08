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
    version: "2.2.0",
    date: "2026-04-08",
    title: "Agentic AI Refresh & Security Hardening",
    description: "Major content refresh for the agentic AI era, security improvements, and conductor UX polish.",
    type: "feature",
    changes: [
      { type: "feature", description: "🌐 Landing Page Refresh: Updated all content to reflect 2026 frontier models (GPT-5, Claude 4, Gemini 2.5, Grok-4, DeepSeek-R2)" },
      { type: "feature", description: "🎼 Conductor Showcase: Redesigned hero and features to spotlight agentic multi-model orchestration" },
      { type: "improvement", description: "🔒 Security Hardening: Migrated admin role checks to a dedicated user_roles table with security-definer functions" },
      { type: "improvement", description: "⬇️ Auto-Scroll in Conductor: Both conductor and agent panes now auto-scroll to the latest message" },
      { type: "improvement", description: "📏 Activity Console Resize: Floating activity log is now more compact to avoid overlapping the chat" },
      { type: "bugfix", description: "🔧 Conductor Chat Context: Fixed issue where conductor mode created duplicate conversations instead of reusing the active one" }
    ]
  },
  {
    version: "2.1.13",
    date: "2026-04-05",
    title: "AI Model Updates & Deprecation Fixes",
    description: "Fixed all broken AI agents by updating deprecated model IDs and API parameters across all platforms.",
    type: "fix",
    changes: [
      { type: "bugfix", description: "🔧 OpenAI: Replaced deprecated `max_tokens` with `max_completion_tokens` parameter" },
      { type: "bugfix", description: "🔧 Claude: Updated from retired `claude-3-5-sonnet/haiku` to `claude-sonnet-4-20250514`" },
      { type: "bugfix", description: "🔧 Grok: Fixed `max_tokens` → `max_completion_tokens` and added better error logging" },
      { type: "bugfix", description: "🔧 Gemini: Updated to `gemini-2.5-flash` with legacy model fallback mapping" },
      { type: "improvement", description: "📋 Updated all model configurations with current model IDs for all platforms" },
      { type: "bugfix", description: "🗃️ Migrated all existing user agent settings to use valid model IDs" }
    ]
  },
  {
    version: "2.1.12",
    date: "2025-09-04",
    title: "Enhanced Conductor Mode with AI-Based Decision Making",
    description: "Upgraded conductor mode with intelligent coordination decisions and improved agent orchestration.",
    type: "feature",
    changes: [
      { type: "feature", description: "🧠 AI-Powered Coordination: Conductor now intelligently decides when multi-agent coordination is needed" },
      { type: "improvement", description: "🔒 Enhanced Privacy: User messages to conductor remain private and aren't forwarded to agents" },
      { type: "improvement", description: "🎯 Optimized Agent Prompts: Conductor creates specialized prompts for agents instead of forwarding original messages" },
      { type: "improvement", description: "💬 Two-Phase Response Flow: Conductor first analyzes, then coordinates only when beneficial" },
      { type: "improvement", description: "⚡ Smarter Orchestration: Replaced keyword detection with AI-based decision making for better user experience" },
      { type: "improvement", description: "🛡️ Improved Message Flow: Clear separation between conductor conversation and agent coordination" }
    ]
  },
  {
    version: "2.1.11",
    date: "2025-08-08",
    title: "Model pricing sync (admin) + pricing refresh",
    description: "Added admin sync for model_pricing and refreshed provider-backed costs.",
    type: "improvement",
    changes: [
      { type: "feature", description: "One-click admin sync of model_pricing via edge function" },
      { type: "improvement", description: "Updated pricing for OpenAI, Anthropic, Google, DeepSeek, xAI (provisional where noted)" }
    ]
  },
  {
    version: "2.1.10",
    date: "2025-08-08",
    title: "ChatGPT 5 Model Support",
    description: "Added ChatGPT 5 to OpenAI agent options with enhanced reasoning and vision.",
    type: "feature",
    changes: [
      { type: "feature", description: "🚀 New Model: ChatGPT 5 now available in OpenAI models list" },
      { type: "improvement", description: "🧠 Advanced Capabilities: Improved reasoning, coding, and multimodal support" },
      { type: "improvement", description: "🎛️ Model Selector: Updated descriptions and capabilities indicators" }
    ]
  },
  {
    version: "2.1.9",
    date: "2025-01-29",
    title: "Mobile UI & Navigation Improvements",
    description: "Enhanced mobile experience with responsive logos, clickable navigation, and improved spacing across all pages.",
    type: "improvement",
    changes: [
      { type: "improvement", description: "📱 Responsive Logo Design: Logos now scale properly on small screens across all pages" },
      { type: "feature", description: "🔗 Clickable Logos: All logos are now clickable and navigate to home page with hover effects" },
      { type: "improvement", description: "✨ Mobile Typography: Better responsive text sizing on auth page and onboarding screens" },
      { type: "improvement", description: "📐 Enhanced Spacing: Improved padding and margins for better mobile layout" },
      { type: "improvement", description: "🎨 Visual Polish: Added hover transitions and opacity effects for better user feedback" }
    ]
  },
  {
    version: "2.1.8",
    date: "2025-07-15",
    title: "Grok 4 Models & Agent Expansion",
    description: "Added latest Grok 4 models and enhanced AI agent selection with new powerful options.",
    type: "feature",
    changes: [
      { type: "feature", description: "🚀 New Grok 4 Model: Added Grok 4 with advanced reasoning and real-time capabilities" },
      { type: "feature", description: "💪 Grok 4 Heavy Model: Introduced most powerful Grok model for complex tasks and deep reasoning" },
      { type: "improvement", description: "🎯 Updated Default Model: Grok 4 is now the default selection for new users" },
      { type: "improvement", description: "🤖 Enhanced Model Selection: Better model descriptions and capability indicators" },
      { type: "improvement", description: "⚡ Performance Tiers: Clear cost and speed indicators for all Grok models" }
    ]
  },
  {
    version: "2.1.7",
    date: "2025-07-01",
    title: "Database Security & Conductor Prompt Updates",
    description: "Fixed critical RLS policy issues and enhanced conductor AI instructions for better user experience.",
    type: "improvement",
    changes: [
      { type: "bugfix", description: "🔧 Fixed RLS Policy Violations: Resolved 'row violates row-level security policy' errors in conductor message saving" },
      { type: "improvement", description: "🛡️ Enhanced Conversation Security: Added automatic conversation creation with proper user_id validation" },
      { type: "improvement", description: "🤖 Updated Conductor Prompts: Enhanced AI conductor instructions with more detailed role descriptions and example execution" },
      { type: "improvement", description: "📋 Better Error Handling: Improved database constraint handling for message operations" },
      { type: "improvement", description: "🔒 Strengthened Authentication: Added comprehensive user authentication checks in conductor service" },
      { type: "improvement", description: "⚡ Optimized Message Flow: Streamlined conductor message saving with proper conversation validation" }
    ]
  },
  {
    version: "2.1.6",
    date: "2025-06-29",
    title: "Conductor Mode & Admin Panel Updates",
    description: "Enhanced conductor mode interface and improved admin panel functionality with better user management.",
    type: "improvement",
    changes: [
      { type: "feature", description: "🤖 Added Gemini Support: Gemini is now available as a conductor agent option" },
      { type: "improvement", description: "🎨 Enhanced Conductor UI: Redesigned conductor agent selector with better visual hierarchy and icons" },
      { type: "improvement", description: "💬 Updated Conversation Mode: Default message limit increased from 5 to 25 for longer discussions" },
      { type: "improvement", description: "🔧 Better Conductor Interface: Improved dropdown design with agent descriptions and color coding" },
      { type: "improvement", description: "👥 Admin Panel Enhancement: Admins can now view all users' data including profiles, tokens, and settings" },
      { type: "improvement", description: "🛡️ Secure Admin Access: Added proper RLS policies for admin user management capabilities" }
    ]
  },
  {
    version: "2.1.5",
    date: "2025-06-29",
    title: "Authentication & Database Stability Improvements",
    description: "Major backend improvements to fix authentication issues and enhance user onboarding reliability.",
    type: "improvement",
    changes: [
      { type: "bugfix", description: "🔧 Fixed Duplicate User Setup: Resolved race condition causing duplicate key constraint violations during user registration" },
      { type: "improvement", description: "🛠️ Consolidated Database Triggers: Streamlined user initialization into a single, reliable database trigger" },
      { type: "bugfix", description: "⚡ Enhanced Authentication Flow: Fixed token initialization and profile creation conflicts" },
      { type: "improvement", description: "🔒 Improved User Onboarding: More reliable automatic setup of user profiles and default tokens" },
      { type: "improvement", description: "📊 Better Error Handling: Enhanced database constraint handling to prevent signup failures" },
      { type: "improvement", description: "🎯 Optimized Agent Settings: Streamlined default agent configuration setup for new users" }
    ]
  },
  {
    version: "2.1.4",
    date: "2025-01-14",
    title: "Private Chat & Theme Improvements",
    description: "Enhanced private agent chat functionality and improved dark theme with brownish color palette.",
    type: "improvement",
    changes: [
      { type: "improvement", description: "🎨 Brownish Night Theme: Updated amber-dark theme with warm brown tones for better visual comfort" },
      { type: "bugfix", description: "💬 Fixed Private Chat Windows: Resolved duplicate dialog windows appearing when clicking agent badges" },
      { type: "improvement", description: "📱 Better Dialog Layout: Improved private chat window formatting and text wrapping" },
      { type: "improvement", description: "🔧 Enhanced Dialog State Management: Better handling of dialog open/close states" },
      { type: "improvement", description: "✨ Improved Visual Hierarchy: Better contrast and readability in dark mode" }
    ]
  },
  {
    version: "2.1.3",
    date: "2025-01-13",
    title: "Code Architecture Improvements",
    description: "Major refactoring to improve code organization and maintainability with better component structure.",
    type: "improvement",
    changes: [
      { type: "improvement", description: "🔧 Refactored AIStatusBar: Split large component into smaller, focused components for better maintainability" },
      { type: "improvement", description: "🎨 CSS Architecture: Reorganized CSS into modular files (base, themes, components, agents) for better organization" },
      { type: "improvement", description: "⚡ Better Code Organization: Improved component structure and separation of concerns" },
      { type: "improvement", description: "🛠️ Enhanced Maintainability: Smaller, focused files make the codebase easier to navigate and modify" },
      { type: "improvement", description: "🧹 Code Cleanup: Removed unused code and optimized imports for better performance" },
      { type: "bugfix", description: "🎯 Fixed Theme Application: Resolved issues with theme switching and CSS variable application" }
    ]
  },
  {
    version: "2.1.2",
    date: "2025-01-12",
    title: "UI Improvements & User Feedback",
    description: "Enhanced user interface with better notification positioning and added contact functionality.",
    type: "improvement",
    changes: [
      { type: "feature", description: "📧 Contact Us Button: Added convenient feedback button in bottom-left corner" },
      { type: "feature", description: "💬 Feedback Dialog: Easy-to-use contact form for suggestions and issue reporting" },
      { type: "improvement", description: "🔔 Improved Toast Positioning: Notifications now appear higher to avoid covering controls" },
      { type: "improvement", description: "👁️ Better Drag Handle Visibility: Made draggable AI status bar handles much more visible" },
      { type: "bugfix", description: "🎯 Fixed LED Status Positioning: Status indicators no longer cover agent icons" },
      { type: "improvement", description: "✨ Enhanced Visual Feedback: Better contrast and positioning throughout the interface" }
    ]
  },
  {
    version: "2.1.1",
    date: "2025-01-12",
    title: "Enhanced Side-by-Side Mode & Agent Controls",
    description: "Major improvements to side-by-side chat mode with better agent management and responsive design.",
    type: "improvement",
    changes: [
      { type: "improvement", description: "🖥️ Enhanced Side-by-Side Layout: All enabled agents now display in one horizontal scrollable row" },
      { type: "improvement", description: "📜 Scrollable Agent Windows: Each agent window now has proper scrolling for message history" },
      { type: "feature", description: "👁️ Individual Agent Toggle: Quick enable/disable buttons directly in each agent window" },
      { type: "improvement", description: "🎯 Improved Mode Selector: Chat mode selection moved to header for better accessibility" },
      { type: "improvement", description: "🔄 Better Agent Synchronization: Agent status updates consistently across all views" },
      { type: "improvement", description: "📱 Responsive Design: Side-by-side mode gracefully handles different screen sizes" },
      { type: "bugfix", description: "🐛 Fixed Runtime Errors: Resolved undefined message filtering in isolated mode" },
      { type: "improvement", description: "⚡ Performance Optimizations: Faster rendering of multiple agent windows" }
    ]
  },
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
    title: "RoboHeard 2.0 - Multi-Agent Platform",
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
