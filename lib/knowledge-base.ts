// Knowledge base service for PiPilot
// This service provides a way to store and retrieve design guidelines, best practices, and other knowledge

export interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
}

// In-memory knowledge base - in production, this would be stored in a database
const knowledgeBase: KnowledgeItem[] = [
  {
    id: 'design-system',
    category: 'design',
    title: 'Design System Guidelines',
    content: `# React Website Builder AI - Master Design System

## Core Mission
Create **modern, professional, and visually stunning** React applications that will **WOW users**. Every application must be a masterpiece of modern web design showcasing cutting-edge aesthetics and exceptional user experience.

## Design Philosophy & Visual Standards

### 🎨 **Aesthetic Priorities**
- **Dark Theme First**: Always default to dark themes with sophisticated color palettes
- **Glass Morphism**: Implement stunning glass morphism effects throughout the UI
- **Modern Minimalism**: Clean, spacious layouts with purposeful white space
- **Premium Feel**: Every element should feel polished and professional
- **Visual Hierarchy**: Clear information architecture with proper typography scaling

### 🌟 **Visual Effects Arsenal**
- **Glowing Elements**: Subtle glows, shadows, and luminescent borders
- **Glass Morphism**: \`backdrop-blur-xl\`, semi-transparent backgrounds with borders
- **Gradient Magic**: Modern gradient overlays and backgrounds
- **Smooth Animations**: Framer Motion for all interactions and transitions
- **Interactive States**: Rich hover effects and micro-interactions

## Technical Stack Requirements

### 📚 **Required Technologies**
1. **React 18+** with functional components and hooks
2. **Tailwind CSS** - Leverage the full power of utility classes
3. **Shadcn/UI** - Use for consistent, accessible components
4. **Framer Motion** - Mandatory for all animations and transitions
5. **Lucide React** - Primary icon library
6. **Vite** - Build tool optimization

### 🎯 **Component Architecture**
- **Modular Design**: Break down into reusable, well-structured components
- **Custom Hooks**: Create utility hooks for common functionality
- **State Management**: Use React hooks efficiently (useState, useEffect, useContext)
- **Performance**: Optimize with React.memo, useMemo, useCallback when needed

## Layout & Structure Standards

### 🏗️ **Page Organization**
1. **Sticky Glass Header**
   - Glass morphism backdrop blur effect
   - Mobile-responsive navigation with hamburger menu
   - Smooth scroll-based transparency changes
   - Logo + navigation links + CTA buttons

2. **Hero Sections**
   - Compelling headlines with gradient text effects
   - Animated elements and floating components
   - Background gradients or subtle patterns
   - Call-to-action buttons with glow effects

3. **Content Sections**
   - Well-organized with proper spacing and alignment
   - Mix of text, media, and interactive elements
   - Cards with glass morphism effects
   - Proper content hierarchy

4. **Multi-Column Footers**
   - Comprehensive link organization
   - Social media icons with hover effects
   - Newsletter signup forms
   - Company information and legal links

### 📱 **Responsive Design**
- **Mobile-First Approach**: Design for mobile, enhance for desktop
- **Breakpoint Strategy**: sm, md, lg, xl, 2xl breakpoints
- **Touch-Friendly**: Proper touch targets and gestures
- **Performance**: Optimize images and animations for mobile

## Interactive Components Mandate

### 🔧 **Required Interactive Elements** (Every App Must Include)

1. **Navigation Components**
   - Sticky headers with glass morphism
   - Mobile hamburger menus with smooth animations
   - Breadcrumb navigation for complex sites

2. **Data Display**
   - **Grids**: Responsive card grids with hover effects
   - **Sliders**: Image/content sliders with smooth transitions
   - **Accordions**: Expandable content sections
   - **Carousels**: Touch-friendly, animated carousels

3. **Form Elements**
   - Floating label inputs with validation
   - Custom styled buttons with hover states
   - Toggle switches and checkboxes
   - Progress indicators

4. **Feedback & Interaction**
   - Loading states and skeletons
   - Toast notifications
   - Modal dialogs with backdrop blur
   - Tooltips and popovers

### 🎪 **Animation Requirements**
- **Page Transitions**: Smooth enter/exit animations
- **Scroll Animations**: Elements animate on scroll into view
- **Hover Effects**: Rich micro-interactions on all interactive elements
- **Loading States**: Engaging skeleton screens and spinners
- **Gesture Support**: Swipe, drag, and touch interactions

## UI Component Standards

### 💎 **Button Specifications**
\`\`\`jsx
// Example button styles to follow
<Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 backdrop-blur-sm border border-white/10">
  Get Started
</Button>
\`\`\`

### 🃏 **Card Specifications**
\`\`\`jsx
// Glass morphism card template
<Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl hover:bg-white/10 transition-all duration-300 hover:scale-105">
  {/* Card content */}
</Card>
\`\`\`

### 🎨 **Color Palette Guidelines**
- **Dark Base**: \`bg-gray-900\`, \`bg-slate-900\`, \`bg-zinc-900\`
- **Glass Effects**: \`bg-white/5\`, \`bg-white/10\`, \`backdrop-blur-xl\`
- **Accents**: Modern blues, purples, teals, and gradients
- **Text**: \`text-white\`, \`text-gray-100\`, \`text-gray-300\`
- **Borders**: \`border-white/10\`, \`border-white/20\`

## Content & Typography Standards

### ✍️ **Typography Hierarchy**
- **Headlines**: Large, bold, often with gradient effects
- **Subheadings**: Clear hierarchy with proper spacing
- **Body Text**: Readable contrast and line height
- **Captions**: Subtle, smaller text with reduced opacity

### 📸 **Media Integration**
- **High-Quality Placeholders**: Use premium placeholder images
- **Lazy Loading**: Implement proper image loading strategies
- **Responsive Images**: Proper srcSet and sizes attributes
- **Alt Text**: Meaningful descriptions for accessibility

## Performance & Accessibility

### ⚡ **Performance Requirements**
- **Lazy Loading**: Components and images
- **Code Splitting**: Route-based splitting
- **Bundle Optimization**: Tree shaking and minimization
- **Animation Performance**: Use transform and opacity for animations

### ♿ **Accessibility Standards**
- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: WCAG AA compliance
- **Focus States**: Visible focus indicators

## Code Quality Standards

### 🧹 **Code Organization**
- **Component Structure**: Logical file organization
- **Naming Conventions**: Descriptive, consistent naming
- **Comments**: Document complex logic
- **Error Handling**: Proper error boundaries and fallbacks

### 🔧 **Development Practices**
- **TypeScript Ready**: Write code that's easily convertible to TypeScript
- **ESLint Compatible**: Follow modern JavaScript standards
- **Reusable Components**: Build for modularity and reuse
- **Performance Monitoring**: Include performance considerations

## Implementation Checklist

### ✅ **Every Generated App Must Include:**
- [ ] Dark theme as default
- [ ] Glass morphism effects on key components
- [ ] Sticky header with backdrop blur
- [ ] Mobile-responsive navigation
- [ ] At least 3 interactive components (grids, sliders, accordions, carousels)
- [ ] Framer Motion animations throughout
- [ ] Lucide React icons
- [ ] Shadcn/UI components
- [ ] Multi-column footer
- [ ] Proper responsive design
- [ ] Loading states and transitions
- [ ] Hover effects on all interactive elements

### 🎯 **Quality Metrics**
- **Visual Impact**: Does it make users say "wow"?
- **Interactivity**: Are there enough engaging elements?
- **Performance**: Does it load and animate smoothly?
- **Responsiveness**: Does it work perfectly on all screen sizes?
- **Professional Feel**: Does it look like a premium application?

## Output Requirements

When generating React applications:

1. **Always use React functional components with hooks**
2. **Include comprehensive Tailwind classes for styling**
3. **Implement Framer Motion for all animations**
4. **Use Shadcn/UI components where appropriate**
5. **Include Lucide React icons**
6. **Ensure mobile responsiveness**
7. **Add glass morphism effects**
8. **Create interactive components**
9. **Include proper loading states**
10. **Add hover effects and micro-interactions**

## Inspiration Sources
Draw inspiration from:
- Premium SaaS landing pages
- Modern design systems (Vercel, Linear, Stripe)
- Award-winning websites (Awwwards, CSS Design Awards)
- Mobile-first design principles
- Glass morphism and neumorphism trends

Remember: Every application you generate should be **production-ready**, **visually stunning**, and **user-friendly**. Aim to create experiences that users will remember and want to interact with.`,
    tags: ['design', 'tailwind', 'ui', 'ux', 'react', 'modern', 'glass-morphism'],
    createdAt: new Date()
  },
  {
    id: 'hero-section',
    category: 'design',
    title: 'Hero Section Requirements',
    content: `### HERO SECTION REQUIREMENTS (MANDATORY)
- **Two-Column Layout**: Always use flex layout with text-left and image-right
- **Text Content**: Include heading (text-5xl/6xl), subheading, paragraph, and 2 CTA buttons
- **Heading Style**: Bold font, possible gradient or color highlight on key words
- **CTA Section**: Primary button (filled with hover effect) and secondary button (outline)
- **Image/Video**: Right side must have featured image or video with play button overlay
- **Background Elements**: Subtle patterns, gradients, or shapes in background
- **Animations**: Text should have subtle entrance animations using Framer Motion
- **Mobile Responsive**: Stack columns on mobile with image below text
- **Visual Balance**: Proper spacing between elements and balanced visual weight
- **Dark Overlay**: If using background image, apply subtle gradient overlay for text contrast`,
    tags: ['hero', 'layout', 'design'],
    createdAt: new Date()
  },
  {
    id: 'header-navigation',
    category: 'design',
    title: 'Header/Navigation Requirements',
    content: `### HEADER/NAVIGATION REQUIREMENTS (MANDATORY)
- **Sticky Behavior**: Header must stay fixed at top when scrolling
- **Logo Section**: Left-aligned logo with hover animation
- **Nav Links**: Horizontal links with hover underline or color change effect
- **Right Actions**: Include login/signup buttons or user account section
- **Mobile Toggle**: Hamburger menu for mobile that expands with smooth animation
- **Dropdown Support**: Support for dropdown menus with proper styling
- **Active State**: Clear indicator for current page
- **Background**: Subtle transparency or blur effect for modern look
- **Shadow**: Light shadow to create separation from content
- **Transition**: Smooth color/opacity transition when scrolling`,
    tags: ['header', 'navigation', 'layout'],
    createdAt: new Date()
  },
  {
    id: 'technical-execution',
    category: 'development',
    title: 'Technical Execution Standards',
    content: `**TECHNICAL EXECUTION:**
✅ **TYPESCRIPT** - Full TypeScript support with proper typing
✅ **REACT HOOKS** - Use functional components with hooks
✅ **PACKAGE MANAGEMENT:**
✅ **CHECK PACKAGE.JSON FIRST** - Always verify packages exist before importing
✅ **USE PRE-INSTALLED PACKAGES** - Prefer packages already in dependencies
✅ **ADD MISSING DEPENDENCIES** - If needed, update package.json before using new packages
✅ **EXACT VERSIONS** - Match versions from main package.json
✅ **MANDATORY PRE-CHECK** - Never import a package without confirming it's available

**FILE ORGANIZATION:** - Proper directory structure (src/pages, src/components)
✅ **ACCESSIBILITY** - Follow accessibility best practices`,
    tags: ['typescript', 'react', 'packages', 'accessibility'],
    createdAt: new Date()
  },
  {
    id: 'tools-usage',
    category: 'development',
    title: 'Tool Usage Guidelines',
    content: `🛠️ **AVAILABLE TOOLS & WHEN TO USE THEM** 🛠️

** ALWAYS USE THESE TOOLS AS NEEDED - THEY ARE YOUR PRIMARY WAY OF INTERACTING WITH THE FILE SYSTEM AND EXTERNAL DATA **

1. **list_files** - Use this tool to:
   - See all files in the project workspace
   - Understand the current project structure
   - Identify where to create new files
   - Check if files already exist
   - ALWAYS use this at the beginning of any request to understand the project structure

2. **read_file** - Use this tool to:
   - Read the contents of any existing file
   - Understand how components are structured
   - See current implementation before making changes
   - Check package.json dependencies
   - Review configuration files

3. **write_file** - Use this tool to:
   - Create new files in the project
   - Update existing files with new content
   - Add new pages to src/pages/
   - Update package.json with new dependencies
   - Modify any file content

4. **delete_file** - Use this tool to:
   - Remove files that are no longer needed
   - Delete obsolete pages
   - Clean up temporary files

5. **delete_folder** - Use this tool to:
   - Remove entire directories and all their contents
   - Delete obsolete folder structures
   - Clean up entire feature directories

6. **web_search** - Use this tool to:
   - Search the web for current information and context
   - Find up-to-date data not available in the knowledge base
   - Research topics that require real-world information
   - Verify facts and get current statistics

6. **web_extract** - Use this tool to:
   - Extract detailed content from specific web pages
   - Get raw text content from URLs
   - Process multiple URLs for comprehensive research

**TOOL USAGE BEST PRACTICES:**
✅ ALWAYS use list_files first to understand the project structure
✅ ALWAYS read existing files before modifying them
✅ ALWAYS create files in the correct directories (src/pages/, src/components/, etc.)
✅ ALWAYS update package.json before using new packages
✅ ALWAYS search the web when you need current information
✅ ALWAYS extract content from specific URLs when you need detailed information
✅ NEVER skip using tools - they are mandatory for file operations and external data

**WORKFLOW:**
1. 📊 tool_results_summary (intro)
2. 🛠️ Execute with tools + explanations
3. 📊 tool_results_summary (completion)`,
    tags: ['tools', 'workflow', 'file-operations', 'web-search'],
    createdAt: new Date()
  },
  {
    id: 'image-generation',
    category: 'development',
    title: 'Image Generation API',
    content: `🖼️ **IMAGE GENERATION API** 🖼️

**API ENDPOINT:** https://api.a0.dev/assets/image

**USAGE:**
- **text parameter**: Describe the image you want to generate (image prompt)
- **seed parameter**: A number for consistent image generation (optional, defaults to random)
- **aspect parameter**: Image aspect ratio (optional, e.g., "1:1", "16:9", "4:3")

**EXAMPLE URLS:**
- Basic: https://api.a0.dev/assets/image?text=RideShare&aspect=1:1&seed=123
- Product: https://api.a0.dev/assets/image?text=Modern%20laptop%20computer&aspect=16:9&seed=456
- Hero: https://api.a0.dev/assets/image?text=Business%20team%20collaboration&aspect=16:9&seed=789

**IMPLEMENTATION:**
1. Use the URL directly in img src attributes
2. Encode spaces as %20 in the text parameter
3. Use descriptive prompts for better image quality
4. Keep seed consistent for similar images
5. Choose appropriate aspect ratios for different use cases

**BEST PRACTICES:**
✅ Use descriptive, specific prompts for better results
✅ Encode special characters properly in URLs
✅ Use consistent seeds for related images
✅ Choose aspect ratios that match your design needs
✅ Test different prompts to find the best results
✅ Use this API for all image needs in the application

**COMMON USE CASES:**
- Product images for e-commerce sites
- Hero section background images
- Feature illustration images
- Profile pictures and avatars
- Banner and promotional images`,
    tags: ['images', 'api', 'generation', 'ui', 'design'],
    createdAt: new Date()
  },
  {
    id: 'quality-standards',
    category: 'development',
    title: 'Quality Standards',
    content: `## Final Quality Standards

Before considering any React application complete, ensure it meets these standards:

**Visual Excellence**: Immediate visual impact, modern aesthetic, consistent design system, smooth animations, professional photography and imagery.

**Technical Performance**: Type-safe implementation, optimized performance, responsive design, proper error handling, accessible user interface.

**User Experience**: Intuitive navigation, clear call-to-actions, smooth interactions, fast loading, mobile-friendly design.

**Code Quality**: Clean TypeScript implementation, reusable components, proper state management, comprehensive testing setup, production-ready error handling.

The ultimate goal is creating React applications that feel premium, modern, and engaging - designs that users remember and want to interact with, built with professional-grade code that's maintainable and scalable.`,
    tags: ['quality', 'standards', 'performance'],
    createdAt: new Date()
  },
  {
    id: 'caching-mechanisms',
    category: 'development',
    title: 'Caching Mechanisms for Performance Optimization',
    content: `## Caching Mechanisms for Performance Optimization

**Client-Side Caching Strategies**:
- Use browser's localStorage or sessionStorage for simple data caching
- Implement IndexedDB for complex structured data caching
- Use React Query or SWR for server state caching with automatic refetching
- Apply memoization techniques with useMemo and useCallback for expensive computations

**API Response Caching**:
- Implement HTTP caching headers (Cache-Control, ETag) on your API responses
- Use service workers to intercept network requests and serve cached responses
- Apply cache-aside pattern where the client checks cache first before making API calls

**Best Practices for Caching Frequently Accessed Data**:
1. Set appropriate TTL (Time To Live) values based on data volatility
2. Implement cache invalidation strategies when data changes
3. Use cache keys that are specific and consistent
4. Monitor cache hit rates to optimize performance
5. Implement fallback mechanisms when cached data is not available
6. Consider cache warming strategies for critical data
7. Use LRU (Least Recently Used) eviction policies for memory-constrained environments

**Performance Benefits**:
- Reduced API calls leading to lower server load
- Faster response times for users
- Better offline experience capabilities
- Reduced bandwidth usage
- Improved application responsiveness

**Implementation Considerations**:
- Balance between data freshness and performance
- Handle cache consistency in distributed systems
- Consider privacy implications of cached data
- Implement proper error handling for cache failures`,
    tags: ['caching', 'performance', 'optimization', 'api', 'client-side'],
    createdAt: new Date()
  },
  {
    id: 'web-search',
    category: 'development',
    title: 'Web Search and Content Extraction Tools',
    content: `## Web Search and Content Extraction Tools

**Available Tools**:
1. **web_search**: Search the web for current information and context
   - Use this tool when you need to find up-to-date information
   - Provides current data that may not be in the knowledge base
   - Returns search results with titles, URLs, and content snippets

2. **web_extract**: Extract content from specific web pages
   - Use this tool when you need detailed information from specific URLs
   - Provides raw content extraction from web pages
   - Can process multiple URLs at once

**When to Use Web Search Tools**:
- When you need current information not available in the knowledge base
- When working with rapidly changing topics like news, stock prices, or weather
- When you need to verify or supplement existing knowledge with real-world data
- When building applications that require integration with external data sources

**Best Practices for Web Search**:
1. Use specific, targeted queries for better results
2. Extract only the information you need from search results
3. Always verify the credibility of sources
4. Respect rate limits and usage guidelines
5. Handle cases where no relevant results are found
6. Combine search results with existing knowledge for comprehensive responses

**Implementation Details**:
- Both tools use the Tavily API for reliable web search and extraction
- Search results are limited to 5 most relevant results by default
- Content extraction provides raw text content from web pages
- All tools handle errors gracefully and provide meaningful error messages`,
    tags: ['web-search', 'api', 'external-data', 'research'],
    createdAt: new Date()
  }
];

export class KnowledgeBase {
  // Search knowledge base by query
  static search(query: string): KnowledgeItem[] {
    const lowerQuery = query.toLowerCase();
    
    // Split query into words for better matching
    const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 2);
    
    return knowledgeBase.filter(item => {
      const itemText = `${item.title} ${item.content} ${item.tags.join(' ')}`.toLowerCase();
      
      // Exact match
      if (itemText.includes(lowerQuery)) return true;
      
      // Word-level matching
      return queryWords.some(word => itemText.includes(word));
    });
  }
  
  // Get knowledge item by ID
  static getById(id: string): KnowledgeItem | undefined {
    return knowledgeBase.find(item => item.id === id);
  }
  
  // Get all knowledge items in a category
  static getByCategory(category: string): KnowledgeItem[] {
    return knowledgeBase.filter(item => item.category === category);
  }
  
  // Get all knowledge items with specific tags
  static getByTags(tags: string[]): KnowledgeItem[] {
    return knowledgeBase.filter(item => 
      item.tags.some(tag => tags.includes(tag))
    );
  }
  
  // Add new knowledge item
  static add(item: Omit<KnowledgeItem, 'createdAt'>): KnowledgeItem {
    const newItem: KnowledgeItem = {
      ...item,
      createdAt: new Date()
    };
    
    knowledgeBase.push(newItem);
    return newItem;
  }
  
  // Get all knowledge items
  static getAll(): KnowledgeItem[] {
    return [...knowledgeBase];
  }
}

// Export the knowledge base service
export const knowledgeBaseService = new KnowledgeBase();