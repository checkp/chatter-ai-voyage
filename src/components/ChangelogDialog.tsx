
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Wrench, Bug } from 'lucide-react';
import { changelog, type ChangelogEntry } from '@/data/changelog';

interface ChangelogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ChangelogDialog: React.FC<ChangelogDialogProps> = ({ open, onOpenChange }) => {
  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'feature':
        return <Sparkles className="h-4 w-4 text-green-600" />;
      case 'improvement':
        return <Wrench className="h-4 w-4 text-blue-600" />;
      case 'bugfix':
        return <Bug className="h-4 w-4 text-orange-600" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'feature':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'improvement':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'bugfix':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            What's New?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {changelog.map((entry, index) => (
            <Card key={entry.version} className={index === 0 ? 'border-primary/50' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{entry.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">v{entry.version}</Badge>
                    <span className="text-sm text-muted-foreground">{entry.date}</span>
                  </div>
                </div>
                <CardDescription>{entry.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {entry.changes.map((change, changeIndex) => (
                    <div key={changeIndex} className="flex items-start gap-3">
                      {getChangeIcon(change.type)}
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-sm">{change.description}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getChangeColor(change.type)}`}
                        >
                          {change.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChangelogDialog;
