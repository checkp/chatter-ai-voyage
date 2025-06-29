
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AdminPlatformUsageProps {
  platformUsage: Record<string, number>;
}

const AdminPlatformUsage: React.FC<AdminPlatformUsageProps> = ({ platformUsage }) => {
  if (!platformUsage || Object.keys(platformUsage).length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(platformUsage).map(([platform, usage]) => (
            <div key={platform} className="flex items-center justify-between">
              <span className="capitalize">{platform}</span>
              <Badge variant="outline">{usage.toLocaleString()} tokens</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPlatformUsage;
