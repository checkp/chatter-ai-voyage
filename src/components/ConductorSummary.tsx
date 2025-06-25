
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain } from 'lucide-react';

interface ConductorSummaryProps {
  summary: string;
  isVisible: boolean;
  onClose: () => void;
}

const ConductorSummary: React.FC<ConductorSummaryProps> = ({
  summary,
  isVisible,
  onClose
}) => {
  if (!isVisible || !summary) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 z-50">
      <Card className="border-primary/20 bg-background/95 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Conductor Analysis</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">AI</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
            {summary}
          </div>
          <div className="mt-3 flex justify-end">
            <button 
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Dismiss
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConductorSummary;
