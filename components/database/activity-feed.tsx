'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table as TableIcon,
    Upload,
    Trash2,
    Key,
    Edit,
    Clock,
    Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
    id: string;
    database_id: number;
    user_id: string;
    activity_type: string;
    entity_type: string;
    entity_name: string;
    metadata: Record<string, any>;
    created_at: string;
}

interface ActivityFeedProps {
    databaseId: string;
}

export default function ActivityFeed({ databaseId }: ActivityFeedProps) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActivities();

        // Auto-refresh every 10 seconds
        const interval = setInterval(fetchActivities, 10000);
        return () => clearInterval(interval);
    }, [databaseId]);

    const fetchActivities = async () => {
        try {
            const response = await fetch(`/api/database/${databaseId}/activity?limit=10`);
            if (!response.ok) throw new Error('Failed to fetch activities');

            const data = await response.json();
            setActivities(data.activities || []);
        } catch (error) {
            console.error('Error fetching activities:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActivityIcon = (activityType: string) => {
        switch (activityType) {
            case 'table_created':
                return <TableIcon className="h-4 w-4 text-blue-400" />;
            case 'table_updated':
                return <Edit className="h-4 w-4 text-yellow-400" />;
            case 'table_deleted':
                return <Trash2 className="h-4 w-4 text-red-400" />;
            case 'file_uploaded':
                return <Upload className="h-4 w-4 text-green-400" />;
            case 'file_deleted':
                return <Trash2 className="h-4 w-4 text-red-400" />;
            case 'api_key_created':
                return <Key className="h-4 w-4 text-purple-400" />;
            case 'api_key_deleted':
                return <Trash2 className="h-4 w-4 text-red-400" />;
            default:
                return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };

    const getActivityDescription = (activity: Activity) => {
        const { activity_type, entity_name, metadata } = activity;

        switch (activity_type) {
            case 'table_created':
                return (
                    <>
                        Created table <span className="font-semibold text-white">{entity_name}</span>
                        {metadata.columns_count && (
                            <span className="text-gray-500"> ({metadata.columns_count} columns)</span>
                        )}
                    </>
                );
            case 'table_updated':
                return (
                    <>
                        Updated table <span className="font-semibold text-white">{entity_name}</span>
                    </>
                );
            case 'table_deleted':
                return (
                    <>
                        Deleted table <span className="font-semibold text-white">{entity_name}</span>
                    </>
                );
            case 'file_uploaded':
                return (
                    <>
                        Uploaded file <span className="font-semibold text-white">{entity_name}</span>
                        {metadata.file_size && (
                            <span className="text-gray-500"> ({formatBytes(metadata.file_size)})</span>
                        )}
                    </>
                );
            case 'file_deleted':
                return (
                    <>
                        Deleted file <span className="font-semibold text-white">{entity_name}</span>
                    </>
                );
            case 'api_key_created':
                return (
                    <>
                        Created API key <span className="font-semibold text-white">{entity_name}</span>
                    </>
                );
            case 'api_key_deleted':
                return (
                    <>
                        Deleted API key <span className="font-semibold text-white">{entity_name}</span>
                    </>
                );
            default:
                return entity_name;
        }
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <Card className="bg-gray-900/50 backdrop-blur-xl border-white/5">
                <CardHeader>
                    <CardTitle className="text-white">Recent Activity</CardTitle>
                    <CardDescription>Latest changes to your database</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (activities.length === 0) {
        return (
            <Card className="bg-gray-900/50 backdrop-blur-xl border-white/5">
                <CardHeader>
                    <CardTitle className="text-white">Recent Activity</CardTitle>
                    <CardDescription>Latest changes to your database</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>No recent activity</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-gray-900/50 backdrop-blur-xl border-white/5">
            <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
                <CardDescription>Latest changes to your database</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {activities.map((activity) => (
                        <div
                            key={activity.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                        >
                            <div className="mt-0.5">{getActivityIcon(activity.activity_type)}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-300">{getActivityDescription(activity)}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formatDistanceToNow(new Date(activity.created_at + 'Z'), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
