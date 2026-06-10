
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Sparkles, Search, Zap, Gem, Brain, Wind, Globe, Cpu } from 'lucide-react';

interface ConductorAgentSelectorProps {
  conductorAgent: string;
  onConductorAgentChange: (agent: string) => void;
}

const ConductorAgentSelector: React.FC<ConductorAgentSelectorProps> = ({
  conductorAgent,
  onConductorAgentChange
}) => {
  const conductorOptions = [
    { 
      id: 'openai', 
      name: 'ChatGPT', 
      description: 'Advanced reasoning and analysis',
      icon: Bot,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    { 
      id: 'anthropic', 
      name: 'Claude', 
      description: 'Thoughtful and nuanced coordination',
      icon: Sparkles,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    { 
      id: 'deepseek', 
      name: 'DeepSeek', 
      description: 'Deep analytical insights',
      icon: Search,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      id: 'grok', 
      name: 'Grok', 
      description: 'Fast and direct orchestration',
      icon: Zap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    { 
      id: 'google', 
      name: 'Gemini', 
      description: 'Comprehensive multi-modal coordination',
      icon: Gem,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    { 
      id: 'mistral', 
      name: 'Mistral', 
      description: 'Efficient European-engineered reasoning',
      icon: Wind,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    { 
      id: 'perplexity', 
      name: 'Perplexity', 
      description: 'Research-driven, citation-backed coordination',
      icon: Globe,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50'
    },
    { 
      id: 'qwen', 
      name: 'Qwen', 
      description: 'Versatile multilingual orchestration',
      icon: Cpu,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50'
    }
  ];

  const selectedOption = conductorOptions.find(option => option.id === conductorAgent);
  const SelectedIcon = selectedOption?.icon || Brain;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground block">
        Conductor Agent
      </label>
      <Select value={conductorAgent} onValueChange={onConductorAgentChange}>
        <SelectTrigger className="w-full h-12 bg-background/80 backdrop-blur-sm border-border/50 hover:border-border transition-colors">
          <SelectValue>
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-md ${selectedOption?.bgColor || 'bg-gray-50'}`}>
                <SelectedIcon className={`h-4 w-4 ${selectedOption?.color || 'text-gray-600'}`} />
              </div>
              <div className="text-left">
                <div className="font-medium">{selectedOption?.name || 'Select Conductor'}</div>
                <div className="text-xs text-muted-foreground">{selectedOption?.description}</div>
              </div>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-full">
          {conductorOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <SelectItem key={option.id} value={option.id} className="h-16 p-3">
                <div className="flex items-start gap-3 w-full">
                  <div className={`p-2 rounded-md ${option.bgColor} mt-0.5`}>
                    <IconComponent className={`h-4 w-4 ${option.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{option.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {option.description}
                    </div>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ConductorAgentSelector;
