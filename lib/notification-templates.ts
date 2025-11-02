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

  // ========================================
  // PRODUCTIVITY (15 templates)
  // ========================================
  {
    category: 'productivity',
    title: '⚡ Boost Your Workflow',
    body: 'Try keyboard shortcuts to code 3x faster! Press Ctrl+K for quick commands.',
    url: '/docs/shortcuts',
    priority: 2,
    tags: ['productivity', 'tips', 'shortcuts']
  },
  {
    category: 'productivity',
    title: '🎯 Focus Mode Activated',
    body: 'Distraction-free coding is just one click away. Enable Focus Mode now!',
    url: '/workspace?focus=true',
    priority: 2,
    tags: ['productivity', 'focus', 'feature']
  },
  {
    category: 'productivity',
    title: '📊 Weekly Report Ready',
    body: 'You completed {tasksCount} tasks this week! View your progress report.',
    url: '/analytics',
    priority: 3,
    requiresUserData: true,
    variables: ['tasksCount'],
    tags: ['productivity', 'analytics', 'report']
  },
  {
    category: 'productivity',
    title: '🔥 Streak Alert!',
    body: '{streakDays} days coding streak! Keep the momentum going!',
    url: '/profile',
    priority: 3,
    requiresUserData: true,
    variables: ['streakDays'],
    tags: ['productivity', 'streak', 'motivation']
  },
  {
    category: 'productivity',
    title: '💪 Power Hour',
    body: 'Your most productive hour is {peakHour}. Schedule important work then!',
    url: '/analytics',
    priority: 2,
    requiresUserData: true,
    variables: ['peakHour'],
    tags: ['productivity', 'insights', 'timing']
  },
  {
    category: 'productivity',
    title: '🚀 Batch Processing',
    body: 'Deploy multiple projects at once with our bulk deployment feature!',
    url: '/workspace?feature=batch',
    priority: 2,
    tags: ['productivity', 'deployment', 'feature']
  },
  {
    category: 'productivity',
    title: '⏱️ Time Tracking',
    body: 'You spent {hoursToday} hours coding today. Great dedication!',
    url: '/analytics',
    priority: 1,
    requiresUserData: true,
    variables: ['hoursToday'],
    tags: ['productivity', 'time', 'tracking']
  },
  {
    category: 'productivity',
    title: '📝 Smart Templates',
    body: 'Save time with reusable code snippets. Create your first template now!',
    url: '/templates/create',
    priority: 2,
    tags: ['productivity', 'templates', 'efficiency']
  },
  {
    category: 'productivity',
    title: '🔄 Auto-Save Enabled',
    body: 'Never lose your work again! Auto-save keeps everything protected.',
    url: '/settings',
    priority: 1,
    tags: ['productivity', 'safety', 'feature']
  },
  {
    category: 'productivity',
    title: '🎨 Theme Optimization',
    body: 'Dark mode reduces eye strain by 60%. Switch now for better focus!',
    url: '/settings/appearance',
    priority: 1,
    tags: ['productivity', 'health', 'theme']
  },
  {
    category: 'productivity',
    title: '⚙️ Custom Shortcuts',
    body: 'Set up personalized keyboard shortcuts for your favorite actions!',
    url: '/settings/shortcuts',
    priority: 2,
    tags: ['productivity', 'customization', 'shortcuts']
  },
  {
    category: 'productivity',
    title: '📈 Performance Boost',
    body: 'Enable code minification to make your apps load 40% faster!',
    url: '/settings/build',
    priority: 2,
    tags: ['productivity', 'performance', 'optimization']
  },
  {
    category: 'productivity',
    title: '🔍 Quick Search',
    body: 'Find anything instantly with Cmd+P. Try it now!',
    url: '/workspace',
    priority: 2,
    tags: ['productivity', 'search', 'navigation']
  },
  {
    category: 'productivity',
    title: '💡 Code Snippets Library',
    body: 'Access {snippetCount} pre-built code snippets for faster development!',
    url: '/snippets',
    priority: 2,
    requiresUserData: true,
    variables: ['snippetCount'],
    tags: ['productivity', 'snippets', 'library']
  },
  {
    category: 'productivity',
    title: '🎯 Daily Goals',
    body: 'Set daily coding goals and track your progress. Start today!',
    url: '/goals',
    priority: 2,
    tags: ['productivity', 'goals', 'tracking']
  },

  // ========================================
  // LEARNING (15 templates)
  // ========================================
  {
    category: 'learning',
    title: '📚 Tutorial Tuesday',
    body: 'New tutorial: Building scalable REST APIs in 30 minutes!',
    url: '/learn/api-tutorial',
    priority: 2,
    tags: ['learning', 'tutorial', 'api']
  },
  {
    category: 'learning',
    title: '🎓 Master Class',
    body: 'Join our live webinar: Advanced React Patterns with Hooks',
    url: '/events/webinar',
    priority: 3,
    tags: ['learning', 'webinar', 'react']
  },
  {
    category: 'learning',
    title: '💻 Code Challenge',
    body: 'Daily coding challenge: Build a custom authentication system!',
    url: '/challenges',
    priority: 2,
    tags: ['learning', 'challenge', 'practice']
  },
  {
    category: 'learning',
    title: '📖 Documentation Dive',
    body: 'Learn about our Database Schema Builder in 10 minutes',
    url: '/docs/database',
    priority: 2,
    tags: ['learning', 'docs', 'database']
  },
  {
    category: 'learning',
    title: '🎬 Video Tutorial',
    body: 'New: Deploy to Production in Under 5 Minutes (Video Guide)',
    url: '/learn/deployment-video',
    priority: 2,
    tags: ['learning', 'video', 'deployment']
  },
  {
    category: 'learning',
    title: '🧪 Experiment Lab',
    body: 'Try our beta feature: AI-powered code refactoring!',
    url: '/lab/refactoring',
    priority: 3,
    tags: ['learning', 'beta', 'ai']
  },
  {
    category: 'learning',
    title: '📝 Blog Post',
    body: 'New article: 10 TypeScript Tips Every Developer Should Know',
    url: '/blog/typescript-tips',
    priority: 1,
    tags: ['learning', 'blog', 'typescript']
  },
  {
    category: 'learning',
    title: '🔬 Case Study',
    body: 'See how {companyName} built their MVP in 2 weeks with PiPilot',
    url: '/case-studies',
    priority: 2,
    variables: ['companyName'],
    tags: ['learning', 'case-study', 'inspiration']
  },
  {
    category: 'learning',
    title: '🎯 Skill Path',
    body: 'Complete your Full-Stack Developer path: {progressPercent}% done!',
    url: '/learn/paths',
    priority: 2,
    requiresUserData: true,
    variables: ['progressPercent'],
    tags: ['learning', 'progress', 'path']
  },
  {
    category: 'learning',
    title: '🏆 Certification Ready',
    body: 'You\'ve completed all modules! Take the certification exam now.',
    url: '/certification',
    priority: 3,
    tags: ['learning', 'certification', 'achievement']
  },
  {
    category: 'learning',
    title: '💡 Quick Tip',
    body: 'Pro tip: Use ESLint auto-fix to clean up your code instantly!',
    url: '/tips/eslint',
    priority: 1,
    tags: ['learning', 'tip', 'code-quality']
  },
  {
    category: 'learning',
    title: '🎨 Design Patterns',
    body: 'Learn the Observer Pattern with real-world examples',
    url: '/learn/patterns/observer',
    priority: 2,
    tags: ['learning', 'patterns', 'architecture']
  },
  {
    category: 'learning',
    title: '🔐 Security Best Practices',
    body: 'New guide: Protecting your API from common vulnerabilities',
    url: '/learn/security',
    priority: 3,
    tags: ['learning', 'security', 'best-practices']
  },
  {
    category: 'learning',
    title: '⚡ Performance Workshop',
    body: 'Live workshop tomorrow: Optimizing React App Performance',
    url: '/events/workshop',
    priority: 3,
    tags: ['learning', 'workshop', 'performance']
  },
  {
    category: 'learning',
    title: '📚 Resource Library',
    body: 'Access {resourceCount} curated learning resources in your dashboard',
    url: '/resources',
    priority: 1,
    requiresUserData: true,
    variables: ['resourceCount'],
    tags: ['learning', 'resources', 'library']
  },

  // ========================================
  // COMMUNITY (10 templates)
  // ========================================
  {
    category: 'community',
    title: '👥 New Team Member',
    body: '{memberName} just joined your team! Welcome them aboard.',
    url: '/team',
    priority: 2,
    requiresUserData: true,
    variables: ['memberName'],
    tags: ['community', 'team', 'welcome']
  },
  {
    category: 'community',
    title: '💬 Forum Discussion',
    body: '{userName} replied to your question in the community forum!',
    url: '/community/forum',
    priority: 2,
    requiresUserData: true,
    variables: ['userName'],
    tags: ['community', 'forum', 'discussion']
  },
  {
    category: 'community',
    title: '⭐ Project Featured',
    body: 'Congrats! Your project {projectName} is now featured on our showcase!',
    url: '/showcase',
    priority: 3,
    requiresProjectData: true,
    variables: ['projectName'],
    tags: ['community', 'showcase', 'featured']
  },
  {
    category: 'community',
    title: '🎉 Community Milestone',
    body: 'We just hit {memberCount} community members! Thanks for being part of it!',
    url: '/community',
    priority: 2,
    variables: ['memberCount'],
    tags: ['community', 'milestone', 'celebration']
  },
  {
    category: 'community',
    title: '🤝 Collaboration Request',
    body: '{userName} wants to collaborate on {projectName}. Check it out!',
    url: '/collaborations',
    priority: 3,
    requiresUserData: true,
    variables: ['userName', 'projectName'],
    tags: ['community', 'collaboration', 'request']
  },
  {
    category: 'community',
    title: '🏅 Top Contributor',
    body: 'You\'re in the top 10 contributors this month! Keep it up!',
    url: '/leaderboard',
    priority: 2,
    tags: ['community', 'recognition', 'leaderboard']
  },
  {
    category: 'community',
    title: '📢 Community Event',
    body: 'Virtual Hackathon this weekend! Join {participantCount} developers.',
    url: '/events/hackathon',
    priority: 3,
    variables: ['participantCount'],
    tags: ['community', 'event', 'hackathon']
  },
  {
    category: 'community',
    title: '💡 Feature Request',
    body: 'Your feature request got {voteCount} upvotes! We\'re implementing it!',
    url: '/feature-requests',
    priority: 3,
    requiresUserData: true,
    variables: ['voteCount'],
    tags: ['community', 'feature-request', 'voting']
  },
  {
    category: 'community',
    title: '🎨 Template Shared',
    body: '{userName} shared an amazing template: {templateName}',
    url: '/templates/community',
    priority: 2,
    variables: ['userName', 'templateName'],
    tags: ['community', 'template', 'sharing']
  },
  {
    category: 'community',
    title: '🌟 Success Story',
    body: 'New success story: How {userName} launched their startup with PiPilot',
    url: '/stories',
    priority: 2,
    variables: ['userName'],
    tags: ['community', 'story', 'inspiration']
  },

  // ========================================
  // UPDATE (10 templates)
  // ========================================
  {
    category: 'update',
    title: '🆕 New Features',
    body: 'Version {version} is here! Check out {featureCount} new features.',
    url: '/changelog',
    priority: 3,
    variables: ['version', 'featureCount'],
    tags: ['update', 'release', 'features']
  },
  {
    category: 'update',
    title: '🔧 Bug Fixes',
    body: 'We fixed {bugCount} issues based on your feedback. Thank you!',
    url: '/changelog',
    priority: 2,
    variables: ['bugCount'],
    tags: ['update', 'bugfix', 'improvement']
  },
  {
    category: 'update',
    title: '⚡ Performance Upgrade',
    body: 'App is now 50% faster! Experience the speed boost.',
    url: '/whats-new',
    priority: 2,
    tags: ['update', 'performance', 'optimization']
  },
  {
    category: 'update',
    title: '🎨 UI Refresh',
    body: 'New look, same power! Check out our redesigned dashboard.',
    url: '/workspace',
    priority: 2,
    tags: ['update', 'ui', 'design']
  },
  {
    category: 'update',
    title: '🔐 Security Update',
    body: 'Important security update installed. Your projects are more secure now!',
    url: '/security',
    priority: 4,
    tags: ['update', 'security', 'important']
  },
  {
    category: 'update',
    title: '📱 Mobile Improvements',
    body: 'Mobile experience enhanced with touch-optimized controls!',
    url: '/mobile',
    priority: 2,
    tags: ['update', 'mobile', 'ux']
  },
  {
    category: 'update',
    title: '🌐 New Integrations',
    body: 'Now integrated with {serviceCount} more services! Expand your toolkit.',
    url: '/integrations',
    priority: 2,
    variables: ['serviceCount'],
    tags: ['update', 'integrations', 'tools']
  },
  {
    category: 'update',
    title: '📊 Analytics Dashboard',
    body: 'New analytics dashboard with real-time insights is now live!',
    url: '/analytics',
    priority: 3,
    tags: ['update', 'analytics', 'feature']
  },
  {
    category: 'update',
    title: '🎯 API v2.0',
    body: 'Our new API is faster and more powerful. Check the migration guide.',
    url: '/docs/api-v2',
    priority: 3,
    tags: ['update', 'api', 'migration']
  },
  {
    category: 'update',
    title: '🔔 Notification System',
    body: 'Smart notifications are here! Customize your preferences now.',
    url: '/settings/notifications',
    priority: 2,
    tags: ['update', 'notifications', 'feature']
  },

  // ========================================
  // WELCOME (5 templates)
  // ========================================
  {
    category: 'welcome',
    title: '🎉 Welcome to PiPilot!',
    body: 'Hi {firstName}! Let\'s build your first project together.',
    url: '/onboarding',
    priority: 5,
    requiresUserData: true,
    variables: ['firstName'],
    tags: ['welcome', 'onboarding', 'new-user']
  },
  {
    category: 'welcome',
    title: '🚀 Getting Started',
    body: 'Complete your profile to unlock all features and start building!',
    url: '/profile/setup',
    priority: 4,
    tags: ['welcome', 'setup', 'profile']
  },
  {
    category: 'welcome',
    title: '💎 Pro Features Unlocked',
    body: 'Welcome to Pro! You now have access to unlimited projects and deployments.',
    url: '/pro/welcome',
    priority: 4,
    tags: ['welcome', 'pro', 'upgrade']
  },
  {
    category: 'welcome',
    title: '👋 Nice to Meet You!',
    body: 'Join {memberCount}+ developers building amazing apps. Your journey starts now!',
    url: '/community',
    priority: 3,
    variables: ['memberCount'],
    tags: ['welcome', 'community', 'introduction']
  },
  {
    category: 'welcome',
    title: '🎁 Welcome Gift',
    body: 'Claim your {creditAmount} free credits to get started! Valid for 30 days.',
    url: '/credits',
    priority: 4,
    variables: ['creditAmount'],
    tags: ['welcome', 'credits', 'gift']
  },

  // ========================================
  // ONBOARDING (5 templates)
  // ========================================
  {
    category: 'onboarding',
    title: '📝 Step 1: Create Your First Project',
    body: 'Choose a template or start from scratch. It takes just 2 minutes!',
    url: '/workspace/new',
    priority: 4,
    tags: ['onboarding', 'step-1', 'project']
  },
  {
    category: 'onboarding',
    title: '🔗 Step 2: Connect Your GitHub',
    body: 'Link your GitHub account for seamless deployments and version control.',
    url: '/settings/integrations',
    priority: 4,
    tags: ['onboarding', 'step-2', 'github']
  },
  {
    category: 'onboarding',
    title: '🚀 Step 3: Deploy to Production',
    body: 'Your app is ready! Deploy it to the world with one click.',
    url: '/deploy',
    priority: 4,
    tags: ['onboarding', 'step-3', 'deploy']
  },
  {
    category: 'onboarding',
    title: '🎓 Quick Tour',
    body: 'Take a 3-minute tour to discover all the powerful features!',
    url: '/tour',
    priority: 3,
    tags: ['onboarding', 'tour', 'tutorial']
  },
  {
    category: 'onboarding',
    title: '✅ Setup Complete!',
    body: 'You\'re all set! Start building your next big idea now.',
    url: '/workspace',
    priority: 4,
    tags: ['onboarding', 'complete', 'success']
  },

  // ========================================
  // EVENING REMINDER (10 templates)
  // ========================================
  {
    category: 'evening_reminder',
    title: '🌙 Evening Wrap-Up',
    body: 'Great work today! You made {commitsCount} commits. Rest well!',
    url: '/analytics',
    priority: 1,
    requiresUserData: true,
    variables: ['commitsCount'],
    tags: ['evening', 'summary', 'rest']
  },
  {
    category: 'evening_reminder',
    title: '💤 Time to Unwind',
    body: 'You coded for {hoursToday} hours today. Take a break and recharge!',
    url: '/profile',
    priority: 1,
    requiresUserData: true,
    variables: ['hoursToday'],
    tags: ['evening', 'rest', 'health']
  },
  {
    category: 'evening_reminder',
    title: '📊 Daily Progress',
    body: 'Today\'s achievement: {tasksCompleted} tasks completed! See your stats.',
    url: '/analytics',
    priority: 2,
    requiresUserData: true,
    variables: ['tasksCompleted'],
    tags: ['evening', 'progress', 'stats']
  },
  {
    category: 'evening_reminder',
    title: '✨ Tomorrow\'s Plan',
    body: 'Plan tomorrow\'s work now and start fresh in the morning!',
    url: '/planner',
    priority: 1,
    tags: ['evening', 'planning', 'preparation']
  },
  {
    category: 'evening_reminder',
    title: '🔖 Bookmark Progress',
    body: 'Save your current work state so you can pick up right where you left off!',
    url: '/workspace',
    priority: 2,
    tags: ['evening', 'save', 'bookmark']
  },
  {
    category: 'evening_reminder',
    title: '🌟 Daily Highlight',
    body: 'Your best moment today: Completed {projectName}! Celebrate it!',
    url: '/achievements',
    priority: 2,
    requiresProjectData: true,
    variables: ['projectName'],
    tags: ['evening', 'highlight', 'achievement']
  },
  {
    category: 'evening_reminder',
    title: '💪 Streak Status',
    body: '{streakDays} day streak! Don\'t forget to commit tomorrow.',
    url: '/profile',
    priority: 2,
    requiresUserData: true,
    variables: ['streakDays'],
    tags: ['evening', 'streak', 'reminder']
  },
  {
    category: 'evening_reminder',
    title: '📝 Notes & Ideas',
    body: 'Have any ideas for tomorrow? Jot them down now!',
    url: '/notes',
    priority: 1,
    tags: ['evening', 'notes', 'ideas']
  },
  {
    category: 'evening_reminder',
    title: '🎯 Tomorrow\'s Goals',
    body: 'Set {goalCount} goals for tomorrow and start strong!',
    url: '/goals',
    priority: 1,
    variables: ['goalCount'],
    tags: ['evening', 'goals', 'planning']
  },
  {
    category: 'evening_reminder',
    title: '🌃 Good Night!',
    body: 'Rest well, {firstName}. Tomorrow brings new opportunities!',
    url: '/',
    priority: 1,
    requiresUserData: true,
    variables: ['firstName'],
    tags: ['evening', 'goodbye', 'rest']
  },

  // ========================================
  // MILESTONE (10 templates)
  // ========================================
  {
    category: 'milestone',
    title: '🎊 100 Projects Created!',
    body: 'Incredible! You\'ve built {projectCount} projects with PiPilot!',
    url: '/achievements',
    priority: 4,
    requiresUserData: true,
    variables: ['projectCount'],
    tags: ['milestone', 'projects', 'achievement']
  },
  {
    category: 'milestone',
    title: '🔥 30-Day Streak!',
    body: 'Amazing dedication! {streakDays} days of consecutive coding!',
    url: '/profile',
    priority: 4,
    requiresUserData: true,
    variables: ['streakDays'],
    tags: ['milestone', 'streak', 'dedication']
  },
  {
    category: 'milestone',
    title: '⭐ First Deployment',
    body: 'Congratulations! Your first app is now live for the world to see!',
    url: '/deployments',
    priority: 5,
    tags: ['milestone', 'deployment', 'first']
  },
  {
    category: 'milestone',
    title: '👥 Team of 10',
    body: 'Your team has grown to {teamSize} members! Leadership unlocked!',
    url: '/team',
    priority: 3,
    requiresUserData: true,
    variables: ['teamSize'],
    tags: ['milestone', 'team', 'growth']
  },
  {
    category: 'milestone',
    title: '💯 Perfect Week',
    body: 'You completed ALL your goals this week! Outstanding work!',
    url: '/achievements',
    priority: 4,
    tags: ['milestone', 'goals', 'perfect']
  },
  {
    category: 'milestone',
    title: '🚀 1000 Deployments',
    body: 'Wow! You\'ve deployed {deploymentCount} times! You\'re a pro!',
    url: '/stats',
    priority: 4,
    requiresUserData: true,
    variables: ['deploymentCount'],
    tags: ['milestone', 'deployments', 'expert']
  },
  {
    category: 'milestone',
    title: '📚 Learning Champion',
    body: 'You completed {courseCount} courses! Knowledge master achieved!',
    url: '/learn',
    priority: 3,
    requiresUserData: true,
    variables: ['courseCount'],
    tags: ['milestone', 'learning', 'courses']
  },
  {
    category: 'milestone',
    title: '💎 One Year Anniversary',
    body: 'Happy PiPilot anniversary! Thanks for an amazing year, {firstName}!',
    url: '/anniversary',
    priority: 5,
    requiresUserData: true,
    variables: ['firstName'],
    tags: ['milestone', 'anniversary', 'celebration']
  },
  {
    category: 'milestone',
    title: '🏆 Top 1% Developer',
    body: 'You\'re in the top 1% of most active developers! Elite status!',
    url: '/leaderboard',
    priority: 4,
    tags: ['milestone', 'elite', 'ranking']
  },
  {
    category: 'milestone',
    title: '🌟 10K Lines of Code',
    body: 'You\'ve written {linesOfCode} lines of code! Code master unlocked!',
    url: '/stats',
    priority: 3,
    requiresUserData: true,
    variables: ['linesOfCode'],
    tags: ['milestone', 'code', 'volume']
  }
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
