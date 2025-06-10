
export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: {
    type: 'feature' | 'improvement' | 'bugfix';
    description: string;
  }[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: "1.7.1",
    date: "2025-06-10",
    title: "Mobile Interface Bug Fix",
    description: "Fixed critical mobile interface rendering issue that prevented mobile users from accessing the mobile-optimized experience.",
    changes: [
      {
        type: "bugfix",
        description: "Fixed MobileLayout component logic that was incorrectly showing desktop interface on mobile devices"
      },
      {
        type: "bugfix",
        description: "Resolved React hooks rendering order issues that were causing blank screens"
      },
      {
        type: "improvement",
        description: "Enhanced mobile detection and interface switching reliability"
      }
    ]
  },
  {
    version: "1.7.0",
    date: "2025-06-09",
    title: "Google Gemini Integration & Mobile Interface",
    description: "Added Google Gemini as a new AI agent and introduced a comprehensive mobile interface for seamless multi-device experience.",
    changes: [
      {
        type: "feature",
        description: "Added Google Gemini AI agent with support for Gemini 1.5 Flash, Pro, and 2.0 Flash Experimental models"
      },
      {
        type: "feature",
        description: "Implemented complete mobile interface with touch-optimized navigation and chat experience"
      },
      {
        type: "feature",
        description: "Added mobile-specific components including MobileHeader, MobileSettings, and MobileChatSidebar"
      },
      {
        type: "improvement",
        description: "Enhanced agent status bar to support Google Gemini with proper styling and icons"
      },
      {
        type: "improvement",
        description: "Updated platform management to include Google services with secure API key handling"
      },
      {
        type: "bugfix",
        description: "Fixed pastel theme color application to ensure proper amber-green styling"
      }
    ]
  },
  {
    version: "1.6.0",
    date: "2025-06-08",
    title: "Mobile Detection & UI Improvements",
    description: "Added mobile browser detection with coming soon page and fixed chat interface scrolling issues for better user experience.",
    changes: [
      {
        type: "feature",
        description: "Added mobile browser detection with comprehensive device and screen size checking"
      },
      {
        type: "feature",
        description: "Implemented 'Mobile Support Coming Soon' page with option to continue in desktop view"
      },
      {
        type: "bugfix",
        description: "Fixed double scrollbar issue in main chat interface"
      },
      {
        type: "improvement",
        description: "Enhanced scroll behavior and positioning in chat messages area"
      }
    ]
  },
  {
    version: "1.5.0",
    date: "2025-06-06",
    title: "UI/UX Enhancements",
    description: "Improved visual design with updated branding, enhanced conversation controls, and streamlined user interface elements.",
    changes: [
      {
        type: "improvement",
        description: "Updated application logo and branding across all pages"
      },
      {
        type: "improvement",
        description: "Applied consistent color theming to authentication page"
      },
      {
        type: "improvement",
        description: "Set default conversation mode message limit to 5 for better user experience"
      },
      {
        type: "feature",
        description: "Added play button for quick message send and conversation start"
      },
      {
        type: "improvement",
        description: "Reorganized chat input controls for better accessibility"
      }
    ]
  },
  {
    version: "1.4.0",
    date: "2025-06-06",
    title: "AI Image Generation",
    description: "Generate stunning images with AI using DALL-E models. Create, download, and share AI-generated artwork directly from the platform.",
    changes: [
      {
        type: "feature",
        description: "Added AI image generation with DALL-E 2, DALL-E 3, and GPT Image models"
      },
      {
        type: "feature",
        description: "Integrated image generation with token system - pay per generation"
      },
      {
        type: "feature",
        description: "Built-in image gallery to view, download, and manage generated images"
      },
      {
        type: "feature",
        description: "Multiple image sizes and model options for different quality levels"
      }
    ]
  },
  {
    version: "1.3.0",
    date: "2025-06-05",
    title: "Daily Free Tokens",
    description: "Introducing daily free tokens! Get 300 tokens every day automatically, with a maximum balance of 1000 tokens.",
    changes: [
      {
        type: "feature",
        description: "Added automatic daily token distribution - 300 tokens per day"
      },
      {
        type: "feature",
        description: "Implemented 1000 token daily balance limit to ensure fair usage"
      },
      {
        type: "improvement",
        description: "Enhanced token balance display with daily token indicators"
      }
    ]
  },
  {
    version: "1.2.0",
    date: "2025-06-04",
    title: "Drag & Drop Agent Reordering",
    description: "You can now reorder AI agents in the status bar by dragging them to your preferred position.",
    changes: [
      {
        type: "feature",
        description: "Added drag & drop functionality for AI agent reordering"
      },
      {
        type: "feature",
        description: "Agent order is now saved persistently for each user"
      },
      {
        type: "improvement",
        description: "Enhanced AI status bar with visual drag indicators"
      }
    ]
  },
  {
    version: "1.1.0",
    date: "2025-05-28",
    title: "Enhanced Multi-AI Chat Experience",
    description: "Improved conversation flow and agent collaboration features.",
    changes: [
      {
        type: "feature",
        description: "Added private agent chat functionality"
      },
      {
        type: "feature",
        description: "Implemented conversation mode for autonomous AI discussions"
      },
      {
        type: "improvement",
        description: "Enhanced AI status indicators with real-time updates"
      },
      {
        type: "bugfix",
        description: "Fixed message ordering in multi-agent conversations"
      }
    ]
  },
  {
    version: "1.0.0",
    date: "2025-05-15",
    title: "Initial Release",
    description: "Welcome to AI Chat - your multi-agent conversation platform.",
    changes: [
      {
        type: "feature",
        description: "Multi-AI chat with OpenAI, Claude, Grok, and DeepSeek"
      },
      {
        type: "feature",
        description: "User authentication and secure API key management"
      },
      {
        type: "feature",
        description: "Token-based usage system with purchase options"
      },
      {
        type: "feature",
        description: "Responsive design with dark/light theme support"
      }
    ]
  }
];
