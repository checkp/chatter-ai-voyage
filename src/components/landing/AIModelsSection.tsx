
import React from 'react';
import { Badge } from '@/components/ui/badge';

const AIModelsSection = () => {
  const aiModels = [
    { name: "GPT-4", provider: "OpenAI", color: "bg-green-100 text-green-800" },
    { name: "Claude", provider: "Anthropic", color: "bg-orange-100 text-orange-800" },
    { name: "DeepSeek", provider: "DeepSeek AI", color: "bg-blue-100 text-blue-800" },
    { name: "Grok", provider: "xAI", color: "bg-purple-100 text-purple-800" },
    { name: "Gemini", provider: "Google", color: "bg-red-100 text-red-800" }
  ];

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Supported AI Models</h2>
        <p className="text-muted-foreground text-lg">Access the best AI models from leading providers, orchestrated by our AI Conductor</p>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {aiModels.map((model) => (
          <Badge key={model.name} className={`px-6 py-3 text-lg ${model.color}`}>
            {model.name} by {model.provider}
          </Badge>
        ))}
      </div>
    </section>
  );
};

export default AIModelsSection;
