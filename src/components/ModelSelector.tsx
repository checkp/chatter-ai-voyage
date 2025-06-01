
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AI_MODELS, ModelConfig } from '@/config/aiModels';

interface ModelSelectorProps {
  platformId: string;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  platformId,
  selectedModel,
  onModelChange,
  disabled = false
}) => {
  const models = AI_MODELS[platformId] || [];
  
  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'fast': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'slow': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCostColor = (tier: string) => {
    switch (tier) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (models.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Model</label>
      <Select value={selectedModel} onValueChange={onModelChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {models.map((model: ModelConfig) => (
            <SelectItem key={model.id} value={model.id} className="space-y-2">
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{model.name}</span>
                  <div className="flex gap-1">
                    <Badge variant="outline" className={`text-xs ${getSpeedColor(model.speed)}`}>
                      {model.speed}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${getCostColor(model.costTier)}`}>
                      {model.costTier}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{model.description}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {model.capabilities.map((capability) => (
                    <Badge key={capability} variant="secondary" className="text-xs">
                      {capability}
                    </Badge>
                  ))}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModelSelector;
