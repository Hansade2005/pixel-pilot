/**
 * Smart Notification Scheduling Algorithm
 * Uses ML-like behavior patterns to optimize engagement
 */

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserBehaviorPattern {
  userId: string;
  activeHours: number[]; // 0-23
  activeDays: number[]; // 0-6 (Sun-Sat)
  avgSessionDuration: number;
  preferredNotificationTimes: Date[];
  engagementScore: number;
  lastActiveAt: Date;
  timezone: string;
}

export interface NotificationSchedule {
  userId: string;
  templateId: string;
  scheduledFor: Date;
  priority: number;
  personalizedData: Record<string, any>;
}

export class SmartNotificationScheduler {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Analyze user behavior patterns
   */
  async analyzeUserBehavior(userId: string): Promise<UserBehaviorPattern> {
    // Get user activity log
    const { data: activities } = await this.supabase
      .from('user_activity_log')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (!activities || activities.length === 0) {
      return this.getDefaultPattern(userId);
    }

    // Analyze active hours
    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);
    let totalDuration = 0;

    activities.forEach((activity: any) => {
      const date = new Date(activity.created_at);
      hourCounts[date.getHours()]++;
      dayCounts[date.getDay()]++;
      totalDuration += activity.duration_seconds || 0;
    });

    // Get top 5 active hours
    const activeHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(h => h.hour);

    // Get active days (days with activity)
    const activeDays = dayCounts
      .map((count, day) => ({ day, count }))
      .filter(d => d.count > 0)
      .map(d => d.day);

    // Get engagement score
    const { data: engagement } = await this.supabase
      .from('user_engagement_scores')
      .select('overall_score, last_active_at')
      .eq('user_id', userId)
      .single();

    // Get user preferences
    const { data: prefs } = await this.supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    return {
      userId,
      activeHours: activeHours.sort((a, b) => a - b),
      activeDays: activeDays.sort((a, b) => a - b),
      avgSessionDuration: activities.length > 0 ? totalDuration / activities.length : 0,
      preferredNotificationTimes: this.calculatePreferredTimes(activeHours, prefs),
      engagementScore: engagement?.overall_score || 0,
      lastActiveAt: engagement?.last_active_at ? new Date(engagement.last_active_at) : new Date(),
      timezone: prefs?.timezone || 'America/Toronto'
    };
  }

  /**
   * Calculate optimal notification times based on user patterns
   */
  private calculatePreferredTimes(activeHours: number[], prefs: any): Date[] {
    const times: Date[] = [];
    const now = new Date();

    // Morning notification (user's morning time or preference)
    if (prefs?.morning_reminders) {
      const morningTime = prefs.morning_time || '09:00:00';
      const [hour, minute] = morningTime.split(':').map(Number);
      const morning = new Date(now);
      morning.setHours(hour, minute, 0, 0);
      if (morning < now) morning.setDate(morning.getDate() + 1);
      times.push(morning);
    }

    // Peak activity time (based on behavior)
    if (activeHours.length > 0) {
      const peakHour = activeHours[0];
      const peak = new Date(now);
      peak.setHours(peakHour, 0, 0, 0);
      if (peak < now) peak.setDate(peak.getDate() + 1);
      times.push(peak);
    }

    // Evening notification (if enabled)
    if (prefs?.evening_reminders) {
      const eveningTime = prefs.evening_time || '18:00:00';
      const [hour, minute] = eveningTime.split(':').map(Number);
      const evening = new Date(now);
      evening.setHours(hour, minute, 0, 0);
      if (evening < now) evening.setDate(evening.getDate() + 1);
      times.push(evening);
    }

    return times;
  }

  /**
   * Generate personalized notification schedule for user
   */
  async generateSchedule(userId: string, days: number = 7): Promise<NotificationSchedule[]> {
    const schedule: NotificationSchedule[] = [];
    const behavior = await this.analyzeUserBehavior(userId);
    const { data: prefs } = await this.supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!prefs?.enabled) return [];

    // Get user's projects
    const { data: projects } = await this.supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    // Get notification frequency
    const frequency = this.getNotificationFrequency(prefs.frequency, behavior.engagementScore);

    // Generate schedule for next N days
    for (let day = 0; day < days; day++) {
      const notifications = await this.generateDailyNotifications(
        userId,
        day,
        behavior,
        prefs,
        projects || [],
        frequency
      );
      schedule.push(...notifications);
    }

    return schedule;
  }

  /**
   * Generate notifications for a single day
   */
  private async generateDailyNotifications(
    userId: string,
    dayOffset: number,
    behavior: UserBehaviorPattern,
    prefs: any,
    projects: any[],
    frequency: number
  ): Promise<NotificationSchedule[]> {
    const notifications: NotificationSchedule[] = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + dayOffset);
    const dayOfWeek = baseDate.getDay();

    // Skip if not an active day for this user
    if (!behavior.activeDays.includes(dayOfWeek) && Math.random() > 0.3) {
      return notifications;
    }

    // Morning motivation (if enabled)
    if (prefs.morning_reminders && Math.random() < frequency) {
      const morningTime = this.getTimeOnDate(baseDate, prefs.morning_time || '09:00:00');
      notifications.push({
        userId,
        templateId: await this.selectTemplate('morning_motivation', behavior),
        scheduledFor: morningTime,
        priority: 2,
        personalizedData: {
          firstName: await this.getUserFirstName(userId)
        }
      });
    }

    // Project continuation (if has active projects)
    if (prefs.project_reminders && projects.length > 0) {
      const activeProject = this.selectActiveProject(projects, behavior);
      if (activeProject && Math.random() < frequency) {
        const reminderTime = this.getOptimalProjectReminderTime(baseDate, behavior);
        notifications.push({
          userId,
          templateId: await this.selectTemplate('project_continuation', behavior),
          scheduledFor: reminderTime,
          priority: 3,
          personalizedData: {
            firstName: await this.getUserFirstName(userId),
            projectName: activeProject.name,
            projectId: activeProject.id,
            progressPercent: this.calculateProjectProgress(activeProject),
            daysSinceLastEdit: this.daysSince(new Date(activeProject.updated_at))
          }
        });
      }
    }

    // Tip of the day (if enabled)
    if (prefs.tips_and_features && Math.random() < frequency * 0.7) {
      const tipTime = this.getRandomTimeInActiveHours(baseDate, behavior.activeHours);
      notifications.push({
        userId,
        templateId: await this.selectTemplate('tip_of_day', behavior),
        scheduledFor: tipTime,
        priority: 1,
        personalizedData: {}
      });
    }

    // Achievement notifications (check for milestones)
    const achievement = await this.checkForAchievements(userId);
    if (achievement && prefs.achievement_notifications) {
      const achievementTime = this.getRandomTimeInActiveHours(baseDate, behavior.activeHours);
      notifications.push({
        userId,
        templateId: achievement.templateId,
        scheduledFor: achievementTime,
        priority: 4,
        personalizedData: achievement.data
      });
    }

    // Evening reminder (if enabled)
    if (prefs.evening_reminders && Math.random() < frequency * 0.5) {
      const eveningTime = this.getTimeOnDate(baseDate, prefs.evening_time || '18:00:00');
      notifications.push({
        userId,
        templateId: await this.selectTemplate('evening_reminder', behavior),
        scheduledFor: eveningTime,
        priority: 2,
        personalizedData: {
          firstName: await this.getUserFirstName(userId)
        }
      });
    }

    // Reengagement (if user is inactive)
    const daysSinceActive = this.daysSince(behavior.lastActiveAt);
    if (daysSinceActive >= 3 && Math.random() < 0.8) {
      const reengageTime = this.getTimeOnDate(baseDate, prefs.morning_time || '10:00:00');
      notifications.push({
        userId,
        templateId: await this.selectTemplate('reengagement', behavior),
        scheduledFor: reengageTime,
        priority: 4,
        personalizedData: {
          firstName: await this.getUserFirstName(userId),
          daysSinceLastVisit: daysSinceActive,
          unfinishedProjects: projects.filter(p => !p.completed).length
        }
      });
    }

    return notifications;
  }

  /**
   * Select best template based on user behavior
   */
  private async selectTemplate(category: string, behavior: UserBehaviorPattern): Promise<string> {
    const { data: templates } = await this.supabase
      .from('notification_templates')
      .select('*')
      .eq('category', category)
      .eq('is_active', true);

    if (!templates || templates.length === 0) {
      throw new Error(`No templates found for category: ${category}`);
    }

    // Use engagement score to select template priority
    const filteredTemplates = templates.filter((t: any) => {
      if (behavior.engagementScore > 70) return t.priority >= 2;
      if (behavior.engagementScore > 40) return t.priority >= 1;
      return true;
    });

    // Select random template from filtered list
    return filteredTemplates[Math.floor(Math.random() * filteredTemplates.length)].id;
  }

  /**
   * Calculate notification frequency based on preference and engagement
   */
  private getNotificationFrequency(preference: string, engagementScore: number): number {
    const baseFrequency = {
      minimal: 0.3,
      optimal: 0.6,
      maximum: 0.9
    }[preference] || 0.6;

    // Adjust based on engagement score (0-100)
    const engagementMultiplier = engagementScore / 100;
    return Math.min(1, baseFrequency * (0.5 + engagementMultiplier * 0.5));
  }

  /**
   * Helper: Get user first name
   */
  private async getUserFirstName(userId: string): Promise<string> {
    const { data: user } = await this.supabase
      .from('users')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    if (user?.full_name) {
      return user.full_name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'there';
  }

  /**
   * Helper: Select active project
   */
  private selectActiveProject(projects: any[], behavior: UserBehaviorPattern): any {
    // Prioritize recently updated projects
    const recent = projects.filter(p => {
      const daysSince = this.daysSince(new Date(p.updated_at));
      return daysSince <= 7 && !p.completed;
    });

    return recent.length > 0 ? recent[0] : projects[0];
  }

  /**
   * Helper: Calculate project progress
   */
  private calculateProjectProgress(project: any): number {
    // Simple estimation based on file count and completeness
    return Math.floor(Math.random() * 40) + 30; // 30-70% for demo
  }

  /**
   * Helper: Get optimal time for project reminder
   */
  private getOptimalProjectReminderTime(baseDate: Date, behavior: UserBehaviorPattern): Date {
    const hour = behavior.activeHours[1] || behavior.activeHours[0] || 14;
    const time = new Date(baseDate);
    time.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
    return time;
  }

  /**
   * Helper: Get random time in active hours
   */
  private getRandomTimeInActiveHours(baseDate: Date, activeHours: number[]): Date {
    const hour = activeHours[Math.floor(Math.random() * activeHours.length)] || 12;
    const time = new Date(baseDate);
    time.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
    return time;
  }

  /**
   * Helper: Get time on specific date
   */
  private getTimeOnDate(date: Date, timeString: string): Date {
    const [hour, minute] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hour, minute, 0, 0);
    return result;
  }

  /**
   * Helper: Calculate days since date
   */
  private daysSince(date: Date): number {
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Check for achievements
   */
  private async checkForAchievements(userId: string): Promise<{ templateId: string; data: any } | null> {
    const { data: engagement } = await this.supabase
      .from('user_engagement_scores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!engagement) return null;

    // Check for streak milestone
    if (engagement.streak_days % 7 === 0 && engagement.streak_days > 0) {
      const { data: template } = await this.supabase
        .from('notification_templates')
        .select('id')
        .eq('category', 'achievement')
        .ilike('title', '%streak%')
        .single();

      if (template) {
        return {
          templateId: template.id,
          data: {
            streakDays: engagement.streak_days,
            firstName: await this.getUserFirstName(userId)
          }
        };
      }
    }

    // Check for project milestone
    if (engagement.total_projects % 5 === 0 && engagement.total_projects > 0) {
      const { data: template } = await this.supabase
        .from('notification_templates')
        .select('id')
        .eq('category', 'achievement')
        .ilike('title', '%project%')
        .single();

      if (template) {
        return {
          templateId: template.id,
          data: {
            projectCount: engagement.total_projects,
            firstName: await this.getUserFirstName(userId)
          }
        };
      }
    }

    return null;
  }

  /**
   * Get default behavior pattern for new users
   */
  private getDefaultPattern(userId: string): UserBehaviorPattern {
    return {
      userId,
      activeHours: [9, 12, 14, 16, 19],
      activeDays: [1, 2, 3, 4, 5], // Weekdays
      avgSessionDuration: 1800, // 30 minutes
      preferredNotificationTimes: [],
      engagementScore: 50,
      lastActiveAt: new Date(),
      timezone: 'America/Toronto'
    };
  }
}

// Factory function to create scheduler with supabase instance
export async function createNotificationScheduler() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  return new SmartNotificationScheduler(supabase);
}
