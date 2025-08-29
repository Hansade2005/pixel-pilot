"use client"

import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const DBManagerDashboard = dynamic(() => import('@/components/db-manager/DBManagerDashboard'), { ssr: false });

export default function DatabasePage() {
  return (
    <Card className="w-full max-w-6xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Database Management</CardTitle>
      </CardHeader>
      <CardContent>
        <DBManagerDashboard />
      </CardContent>
    </Card>
  );
}
