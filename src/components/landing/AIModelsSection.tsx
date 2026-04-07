
import React from 'react';
import { Badge } from '@/components/ui/badge';

const AIModelsSection = () => {
  const aiModels = [
    { name: "GPT-5", provider: "OpenAI", color: "bg-green-100 text-green-800", tag: "Reasoning" },
    { name: "GPT-4o", provider: "OpenAI", color: "bg-green-100 text-green-800", tag: "Multimodal" },
    { name: "Claude 4", provider: "Anthropic", color: "bg-orange-100 text-orange-800", tag: "Analysis" },
    { name: "DeepSeek-R2", provider: "DeepSeek AI", color: "bg-blue-100 text-blue-800", tag: "Open-Source" },
    { name: "Grok-4", provider: "xAI", color: "bg-purple-100 text-purple-800", tag: "Real-Time" },
    { name: "Grok", provider: "xAI", color: "bg-purple-100 text-purple-800", tag: "Wit & Speed" },
    { name: "Gemini 2.5", provider: "Google", color: "bg-red-100 text-red-800", tag: "Long Context" }
  ];

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">7 Frontier Models, One Conductor</h2>
        <p className="text-muted-foreground text-lg">Every major 2025-2026 model family — reasoning, multimodal, long-context, and real-time — unified under intelligent orchestration</p>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {aiModels.map((model) => (
          <div key={model.name} className="flex flex-col items-center gap-1">
            <Badge className={`px-6 py-3 text-lg ${model.color}`}>
              {model.name} by {model.provider}
            </Badge>
            <span className="text-xs text-muted-foreground">{model.tag}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AIModelsSection;
