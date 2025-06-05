
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
