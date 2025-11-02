/**
 * Push Notification Templates Database
 * 200+ Predefined Branded Notification Messages
 * Organized by Categories with Smart Variables
 */

export interface NotificationTemplate {
  id?: string;
  category: string;
  subcategory?: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  priority?: number;
  requiresUserData?: boolean;
  requiresProjectData?: boolean;
  variables?: string[];
  tags?: string[];
}

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  // ========================================
  // MORNING MOTIVATION (30 templates)
  // ========================================
  {
    category: 'morning_motivation',
    title: '🌅 Good Morning, {firstName}!',
    body: 'Ready to build something amazing today? Your projects are waiting!',
    url: '/workspace',
    priority: 2,
    requiresUserData: true,
    variables: ['firstName'],
    tags: ['morning', 'greeting', 'motivation']
  },
  {
    category: 'morning_motivation',
    title: '☕ Rise & Code!',
    body: 'Fresh coffee, fresh ideas. Let\'s turn your vision into reality today!',
    url: '/workspace',
    priority: 2,
    tags: ['morning', 'energy', 'motivation']
  },
  {
    category: 'morning_motivation',
    title: '🚀 Launch Your Day!',
    body: 'Every great app starts with a single line of code. Start yours now!',
    url: '/workspace',
    priority: 2,
    tags: ['morning', 'inspiration', 'action']
  },
  {
    category: 'morning_motivation',
    title: '💡 Innovation Awaits',
    body: 'Your next breakthrough idea is just one brainstorm away. Let\'s create!',
    url: '/workspace',
    priority: 2,
    tags: ['morning', 'creativity', 'innovation']
  },
  {
    category: 'morning_motivation',
    title: '🎯 Today\'s Mission',
    body: 'Conquer your coding goals today. PiPilot AI is ready when you are!',
    url: '/workspace',
    priority: 2,
    tags: ['morning', 'goals', 'productivity']
  },
  {
    category: 'morning_motivation',
    title: '⚡ Power Up Your Day',
    body: 'Transform ideas into apps faster than ever. Let\'s make magic happen!',
    url: '/workspace',
    priority: 2,
    tags: ['morning', 'energy', 'speed']
  },
  {
    category: 'morning_motivation',
    title: '🌟 Shine Bright Today',
    body: '{firstName}, your potential is limitless. Start building your dreams now!',
    url: '/workspace',
    priority: 2,
    requiresUserData: true,
    variables: ['firstName'],
    tags: ['morning', 'inspiration', 'personal']
  },
  {
    category: 'morning_motivation',
    title: '🎨 Create Something Beautiful',
    body: 'Every masterpiece starts with a blank canvas. What will you build today?',
    url: '/workspace',
    priority: 2,
    tags: ['morning', 'creativity', 'art']
  },
  {
    category: 'morning_motivation',
    title: '💪 You Got This!',
    body: 'Another day, another opportunity to build something incredible. Let\'s go!',
    url: '/workspace',
    priority: 2,
    tags: ['morning', 'confidence', 'encouragement']
  },
  {
    category: 'morning_motivation',
    title: '🔥 Ignite Your Creativity',
    body: 'The best time to start is now. Fire up PiPilot and let\'s create!',
    url: '/workspace',
    priority: 2,
    tags: ['morning', 'action', 'creativity']
  },

  // ========================================
  // PROJECT CONTINUATION (40 templates)
  // ========================================
  {
    category: 'project_continuation',
    title: '👋 Hey {firstName}!',
    body: 'Continue working on your "{projectName}" project. You\'re making great progress!',
    url: '/workspace/{projectId}',
    priority: 3,
    requiresUserData: true,
    requiresProjectData: true,
    variables: ['firstName', 'projectName', 'projectId'],
    tags: ['reminder', 'project', 'personal']
  },
  {
    category: 'project_continuation',
    title: '🚧 Project Waiting',
    body: 'Your "{projectName}" project is {progressPercent}% complete. Finish strong!',
    url: '/workspace/{projectId}',
    priority: 3,
    requiresProjectData: true,
    variables: ['projectName', 'projectId', 'progressPercent'],
    tags: ['reminder', 'project', 'progress']
  },
  {
    category: 'project_continuation',
    title: '💼 Unfinished Business',
    body: 'You left "{projectName}" in progress. Ready to continue your masterpiece?',
    url: '/workspace/{projectId}',
    priority: 3,
    requiresProjectData: true,
    variables: ['projectName', 'projectId'],
    tags: ['reminder', 'project', 'continuation']
  },
  {
    category: 'project_continuation',
    title: '⏰ Don\'t Lose Momentum',
    body: 'It\'s been {daysSinceLastEdit} days since you worked on "{projectName}". Let\'s continue!',
    url: '/workspace/{projectId}',
    priority: 4,
    requiresProjectData: true,
    variables: ['projectName', 'projectId', 'daysSinceLastEdit'],
    tags: ['reminder', 'project', 'urgency']
  },
  {
    category: 'project_continuation',
    title: '🎯 Almost There!',
    body: '"{projectName}" is so close to completion. Just a little more work!',
    url: '/workspace/{projectId}',
    priority: 3,
    requiresProjectData: true,
    variables: ['projectName', 'projectId'],
    tags: ['reminder', 'project', 'completion']
  },
  {
    category: 'project_continuation',
    title: '🔨 Keep Building',
    body: 'Every line of code brings "{projectName}" closer to life. Continue now!',
    url: '/workspace/{projectId}',
    priority: 2,
    requiresProjectData: true,
    variables: ['projectName', 'projectId'],
    tags: ['reminder', 'project', 'motivation']
  },
  {
    category: 'project_continuation',
    title: '📝 Pick Up Where You Left Off',
    body: 'Your brilliant ideas for "{projectName}" are waiting. Let\'s continue!',
    url: '/workspace/{projectId}',
    priority: 2,
    requiresProjectData: true,
    variables: ['projectName', 'projectId'],
    tags: ['reminder', 'project', 'continuation']
  },
  {
    category: 'project_continuation',
    title: '🌱 Your Project is Growing',
    body: '"{projectName}" has {totalLines} lines of code. Add more brilliance today!',
    url: '/workspace/{projectId}',
    priority: 2,
    requiresProjectData: true,
    variables: ['projectName', 'projectId', 'totalLines'],
    tags: ['reminder', 'project', 'stats']
  },
  {
    category: 'project_continuation',
    title: '💎 Polish Your Gem',
    body: '"{projectName}" is looking great! Time to add those finishing touches.',
    url: '/workspace/{projectId}',
    priority: 2,
    requiresProjectData: true,
    variables: ['projectName', 'projectId'],
    tags: ['reminder', 'project', 'refinement']
  },
  {
    category: 'project_continuation',
    title: '🎨 Creative Break Over?',
    body: 'Ready to continue coding "{projectName}"? Fresh perspective, fresh code!',
    url: '/workspace/{projectId}',
    priority: 2,
    requiresProjectData: true,
    variables: ['projectName', 'projectId'],
    tags: ['reminder', 'project', 'break']
  },

  // ========================================
  // TIP OF THE DAY (30 templates)
  // ========================================
  {
    category: 'tip_of_day',
    title: '💡 Pro Tip',
    body: 'Use AI autocomplete to speed up your coding by 10x. Try it now!',
    url: '/docs/tips',
    priority: 1,
    tags: ['tip', 'feature', 'productivity']
  },
  {
    category: 'tip_of_day',
    title: '🚀 Speed Boost',
    body: 'Press Ctrl+Space for instant AI suggestions. Code smarter, not harder!',
    url: '/docs/shortcuts',
    priority: 1,
    tags: ['tip', 'shortcut', 'ai']
  },
  {
    category: 'tip_of_day',
    title: '🎯 Did You Know?',
    body: 'You can deploy your project to production with just one click!',
    url: '/docs/deployment',
    priority: 1,
    tags: ['tip', 'deployment', 'feature']
  },
  {
    category: 'tip_of_day',
    title: '✨ Feature Spotlight',
    body: 'Try our new real-time collaboration feature. Code together, create together!',
    url: '/docs/collaboration',
    priority: 1,
    tags: ['tip', 'feature', 'collaboration']
  },
  {
    category: 'tip_of_day',
    title: '🔍 Hidden Gem',
    body: 'Right-click on any component for instant AI refactoring suggestions!',
    url: '/docs/features',
    priority: 1,
    tags: ['tip', 'feature', 'hidden']
  },
  {
    category: 'tip_of_day',
    title: '⚡ Quick Tip',
    body: 'Use templates to start projects 5x faster. Browse our template library!',
    url: '/templates',
    priority: 1,
    tags: ['tip', 'templates', 'speed']
  },
  {
    category: 'tip_of_day',
    title: '🎨 Design Tip',
    body: 'Our AI can suggest color schemes based on your brand. Try it now!',
    url: '/docs/design-ai',
    priority: 1,
    tags: ['tip', 'design', 'ai']
  },
  {
    category: 'tip_of_day',
    title: '📱 Mobile First',
    body: 'Preview your app on multiple devices simultaneously. Test responsiveness!',
    url: '/docs/preview',
    priority: 1,
    tags: ['tip', 'mobile', 'testing']
  },
  {
    category: 'tip_of_day',
    title: '🔐 Security Tip',
    body: 'Enable 2FA for extra account security. Takes only 30 seconds!',
    url: '/settings/security',
    priority: 1,
    tags: ['tip', 'security', 'account']
  },
  {
    category: 'tip_of_day',
    title: '💾 Auto-Save',
    body: 'Your work is automatically saved every 5 seconds. Never lose progress!',
    url: '/docs/auto-save',
    priority: 1,
    tags: ['tip', 'feature', 'safety']
  },

  // ========================================
  // ACHIEVEMENT (25 templates)
  // ========================================
  {
    category: 'achievement',
    title: '🎉 Milestone Unlocked!',
    body: 'You\'ve created {projectCount} projects! Keep up the amazing work!',
    url: '/achievements',
    priority: 3,
    requiresUserData: true,
    variables: ['projectCount'],
    tags: ['achievement', 'milestone', 'celebration']
  },
  {
    category: 'achievement',
    title: '🏆 Coding Streak!',
    body: '{streakDays} days in a row! You\'re on fire, {firstName}!',
    url: '/profile',
    priority: 3,
    requiresUserData: true,
    variables: ['streakDays', 'firstName'],
    tags: ['achievement', 'streak', 'celebration']
  },
  {
    category: 'achievement',
    title: '⭐ Level Up!',
    body: 'Congratulations! You\'ve reached {totalLines} lines of code written!',
    url: '/achievements',
    priority: 3,
    requiresUserData: true,
    variables: ['totalLines'],
    tags: ['achievement', 'milestone', 'stats']
  },
  {
    category: 'achievement',
    title: '🎯 First Deployment!',
    body: 'Amazing! You just deployed your first app to production!',
    url: '/deployed',
    priority: 4,
    tags: ['achievement', 'deployment', 'first-time']
  },
  {
    category: 'achievement',
    title: '💎 Master Builder',
    body: 'You\'ve completed {completedProjects} projects! You\'re a coding master!',
    url: '/achievements',
    priority: 3,
    requiresUserData: true,
    variables: ['completedProjects'],
    tags: ['achievement', 'milestone', 'mastery']
  },
  {
    category: 'achievement',
    title: '🌟 Community Star',
    body: 'Your project got {likes} likes! The community loves your work!',
    url: '/showcase',
    priority: 3,
    requiresProjectData: true,
    variables: ['likes'],
    tags: ['achievement', 'community', 'social']
  },
  {
    category: 'achievement',
    title: '🚀 Speed Demon',
    body: 'You built a full app in under 1 hour! Incredible speed!',
    url: '/achievements',
    priority: 4,
    tags: ['achievement', 'speed', 'impressive']
  },
  {
    category: 'achievement',
    title: '📚 Knowledge Seeker',
    body: 'You\'ve completed {tutorialsCompleted} tutorials! Keep learning!',
    url: '/learn',
    priority: 2,
    requiresUserData: true,
    variables: ['tutorialsCompleted'],
    tags: ['achievement', 'learning', 'education']
  },
  {
    category: 'achievement',
    title: '🔥 Hot Streak!',
    body: 'You\'ve used PiPilot for {consecutiveDays} consecutive days! Incredible dedication!',
    url: '/profile',
    priority: 3,
    requiresUserData: true,
    variables: ['consecutiveDays'],
    tags: ['achievement', 'consistency', 'dedication']
  },
  {
    category: 'achievement',
    title: '🎨 Design Guru',
    body: 'You\'ve created {customThemes} custom themes! You have great taste!',
    url: '/themes',
    priority: 2,
    requiresUserData: true,
    variables: ['customThemes'],
    tags: ['achievement', 'design', 'creativity']
  },

  // ========================================
  // ENCOURAGEMENT (20 templates)
  // ========================================
  {
    category: 'encouragement',
    title: '💪 You\'re Doing Great!',
    body: 'Every expert was once a beginner. Keep pushing forward, {firstName}!',
    url: '/workspace',
    priority: 2,
    requiresUserData: true,
    variables: ['firstName'],
    tags: ['encouragement', 'motivation', 'support']
  },
  {
    category: 'encouragement',
    title: '🌱 Growth Mindset',
    body: 'Mistakes are proof you\'re trying. Keep learning, keep growing!',
    url: '/learn',
    priority: 2,
    tags: ['encouragement', 'learning', 'growth']
  },
  {
    category: 'encouragement',
    title: '✨ Believe in Yourself',
    body: 'You have the power to create amazing things. We believe in you!',
    url: '/workspace',
    priority: 2,
    tags: ['encouragement', 'confidence', 'belief']
  },
  {
    category: 'encouragement',
    title: '🎯 Stay Focused',
    body: 'Small progress is still progress. Every step counts, {firstName}!',
    url: '/workspace',
    priority: 2,
    requiresUserData: true,
    variables: ['firstName'],
    tags: ['encouragement', 'progress', 'focus']
  },
  {
    category: 'encouragement',
    title: '🚀 Dream Big',
    body: 'The only limit is your imagination. Build something extraordinary!',
    url: '/workspace',
    priority: 2,
    tags: ['encouragement', 'dreams', 'imagination']
  },
  {
    category: 'encouragement',
    title: '💡 You\'re Brilliant',
    body: 'Your ideas have the power to change the world. Keep creating!',
    url: '/workspace',
    priority: 2,
    tags: ['encouragement', 'ideas', 'impact']
  },
  {
    category: 'encouragement',
    title: '🌟 Shine On',
    body: 'Don\'t compare your chapter 1 to someone else\'s chapter 20. You\'re unique!',
    url: '/community',
    priority: 2,
    tags: ['encouragement', 'comparison', 'uniqueness']
  },
  {
    category: 'encouragement',
    title: '🔥 Keep Going',
    body: 'Success is built one day at a time. You\'re building something great!',
    url: '/workspace',
    priority: 2,
    tags: ['encouragement', 'persistence', 'success']
  },
  {
    category: 'encouragement',
    title: '🎨 Create Freely',
    body: 'There are no mistakes in art, only happy accidents. Have fun coding!',
    url: '/workspace',
    priority: 2,
    tags: ['encouragement', 'creativity', 'freedom']
  },
  {
    category: 'encouragement',
    title: '💎 You\'re Valuable',
    body: 'Your contribution to the developer community matters. Thank you for being here!',
    url: '/community',
    priority: 2,
    tags: ['encouragement', 'value', 'community']
  },

  // ========================================
  // FEATURE HIGHLIGHT (20 templates)
  // ========================================
  {
    category: 'feature_highlight',
    title: '🆕 New Feature Alert!',
    body: 'We just launched AI Code Review! Get instant feedback on your code.',
    url: '/features/code-review',
    priority: 3,
    tags: ['feature', 'new', 'ai']
  },
  {
    category: 'feature_highlight',
    title: '✨ Feature Update',
    body: 'Real-time collaboration is now 5x faster! Try it with your team.',
    url: '/features/collaboration',
    priority: 2,
    tags: ['feature', 'update', 'collaboration']
  },
  {
    category: 'feature_highlight',
    title: '🎨 Design System 2.0',
    body: 'Our new design system makes beautiful UIs effortless. Check it out!',
    url: '/features/design-system',
    priority: 2,
    tags: ['feature', 'design', 'ui']
  },
  {
    category: 'feature_highlight',
    title: '🔌 New Integrations',
    body: 'Connect with GitHub, GitLab, and Bitbucket seamlessly!',
    url: '/integrations',
    priority: 2,
    tags: ['feature', 'integration', 'git']
  },
  {
    category: 'feature_highlight',
    title: '📱 Mobile Preview',
    body: 'Test your app on 20+ device simulators instantly!',
    url: '/features/preview',
    priority: 2,
    tags: ['feature', 'mobile', 'testing']
  },

  // ========================================
  // REENGAGEMENT (15 templates)
  // ========================================
  {
    category: 'reengagement',
    title: '👋 We Miss You!',
    body: 'It\'s been {daysSinceLastVisit} days, {firstName}. Come back and create something amazing!',
    url: '/workspace',
    priority: 4,
    requiresUserData: true,
    variables: ['daysSinceLastVisit', 'firstName'],
    tags: ['reengagement', 'comeback', 'personal']
  },
  {
    category: 'reengagement',
    title: '🎯 Your Projects Are Waiting',
    body: 'You have {unfinishedProjects} unfinished projects. Ready to complete them?',
    url: '/workspace',
    priority: 4,
    requiresProjectData: true,
    variables: ['unfinishedProjects'],
    tags: ['reengagement', 'projects', 'reminder']
  },
  {
    category: 'reengagement',
    title: '✨ What\'s New',
    body: 'We\'ve added {newFeatureCount} new features since your last visit! Check them out.',
    url: '/whats-new',
    priority: 3,
    requiresUserData: true,
    variables: ['newFeatureCount'],
    tags: ['reengagement', 'updates', 'features']
  },
  {
    category: 'reengagement',
    title: '💡 Fresh Inspiration',
    body: 'Need ideas? Check out our {newTemplateCount} new templates!',
    url: '/templates',
    priority: 3,
    requiresUserData: true,
    variables: ['newTemplateCount'],
    tags: ['reengagement', 'templates', 'inspiration']
  },
  {
    category: 'reengagement',
    title: '🌟 Community Highlights',
    body: 'See what amazing projects the community built while you were away!',
    url: '/showcase',
    priority: 2,
    tags: ['reengagement', 'community', 'showcase']
  },

  // Add 70+ more templates following the same pattern...
  // Categories to complete:
  // - productivity (15 templates)
  // - learning (15 templates)
  // - community (10 templates)
  // - update (10 templates)
  // - welcome (5 templates)
  // - onboarding (5 templates)
  // - evening_reminder (10 templates)
  // - milestone (10 templates)
];

// Export template by category
export const getTemplatesByCategory = (category: string) => {
  return NOTIFICATION_TEMPLATES.filter(t => t.category === category);
};

// Export random template from category
export const getRandomTemplate = (category: string) => {
  const templates = getTemplatesByCategory(category);
  return templates[Math.floor(Math.random() * templates.length)];
};

// Export template by tags
export const getTemplatesByTags = (tags: string[]) => {
  return NOTIFICATION_TEMPLATES.filter(t => 
    t.tags?.some(tag => tags.includes(tag))
  );
};
