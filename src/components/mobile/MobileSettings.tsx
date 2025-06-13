
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AIPlatform } from '@/types/chat';

interface MobileSettingsProps {
  platforms: AIPlatform[];
  onTogglePlatform: (platformId: string) => void;
}

const MobileSettings: React.FC<MobileSettingsProps> = ({
  platforms,
  onTogglePlatform
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-4">AI Agents</h2>
        <div className="space-y-3">
          {platforms.map((platform) => (
            <Card key={platform.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{platform.icon}</span>
                  <div>
                    <h3 className="font-medium">{platform.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Model: {platform.selectedModel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={platform.enabled ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {platform.enabled ? 'Active' : 'Inactive'}
                  </Badge>
                  <Switch
                    checked={platform.enabled}
                    onCheckedChange={() => onTogglePlatform(platform.id)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">About</h3>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">
            RoboHeard allows you to chat with multiple AI agents simultaneously. 
            Enable or disable agents above to customize your experience.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default MobileSettings;
