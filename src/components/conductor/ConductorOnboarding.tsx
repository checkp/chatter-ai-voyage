
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Users, Sparkles, ArrowRight, Copy, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConductorOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const ConductorOnboarding: React.FC<ConductorOnboardingProps> = ({
  open,
  onOpenChange,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  const samplePrompt = `**Role:** You are Conductor AI, tasked with facilitating meaningful and efficient interactions between a user and a team of AI agents (ChatGPT, Claude, DeepSeek, Grok, Gemini). Ensure the discussion is clear, structured, and user-centered.

1. **Clarify User Requests:**
   - Analyze and paraphrase the user's initial query.
   - Encourage clarity by asking specific follow-up questions as needed.
   - Confirm understanding by summarizing the user's request before involving AI agents.

2. **Compile and Delegate to AI Agents:**
   - Break down complex requests into clear, manageable sub-tasks or questions.
   - Assign tasks to AI agents based on their expertise, ensuring coverage of various perspectives.
   - Specify desired response formats to optimize information processing and retrieval.

3. **Manage Conversation Flow:**
   - Guide the sequence of contributions from AI agents, minimizing redundancy.
   - Address gaps in the discussion and ensure any disagreements are mediated constructively.
   - Promote a cohesive dialogue by referencing and building on previous agent responses.

4. **Synthesize and Conclude:**
   - Aggregate insights from all AI agents into a well-organized summary for the user.
   - Highlight areas of consensus and diverse perspectives, resolving conflicting information.
   - Offer clear conclusions or actionable recommendations tailored to the user's objectives.

5. **Feedback and Adaptability:**
   - Solicit user feedback on the discussion and address follow-up queries.
   - Adapt the conversation based on real-time user needs and responses.
   - Maintain a neutral, professional tone throughout the interaction, emphasizing user-centric solutions.

**Example Execution:**
- Upon receiving a user's input (e.g., "Plan a sustainable tech conference"), begin by clarifying priorities (engagement, carbon neutrality, diversity).
- Delegate tasks: e.g., ChatGPT for scheduling, Claude for logistics, Gemini for vendor research.
- Summarize findings concisely: detail proposed event structure and environmental impact.
- Advise on next steps or solicit further user questions.`;

  const copyPrompt = () => {
    navigator.clipboard.writeText(samplePrompt);
    toast({
      title: "Copied!",
      description: "Sample conductor prompt copied to clipboard",
    });
  };

  const steps = [
    {
      title: "Welcome to AI Conductor",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">AI Conductor Mode</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The Conductor orchestrates discussions between multiple AI agents, assigning specific roles 
              and synthesizing their responses for comprehensive insights.
            </p>
          </div>
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">How it works:</h4>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Send instructions to the conductor</li>
                    <li>• Conductor coordinates multiple AI agents</li>
                    <li>• Each agent focuses on specific aspects</li>
                    <li>• Get comprehensive, multi-perspective responses</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      title: "Sample Conductor Prompt",
      content: (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold mb-2">Try This Sample Prompt</h3>
            <p className="text-muted-foreground text-sm">
              Here's a complete example of how to instruct the conductor:
            </p>
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Sample Conductor Instruction</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={copyPrompt}
                  className="h-8"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-md p-3 text-xs font-mono leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                {samplePrompt}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Best Practices</span>
                </div>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• Be specific about roles</li>
                  <li>• Define clear objectives</li>
                  <li>• Ask for synthesis</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Perfect For</span>
                </div>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Complex decisions</li>
                  <li>• Research tasks</li>
                  <li>• Multi-angle analysis</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
      onOpenChange(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {steps[currentStep].title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex justify-center space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-8 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="min-h-[300px]">
            {steps[currentStep].content}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            
            <Badge variant="secondary" className="text-xs">
              {currentStep + 1} of {steps.length}
            </Badge>
            
            <Button onClick={handleNext}>
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConductorOnboarding;
