# AI Development Rules & Guidelines

## 🎯 **Template Overview**
This is a **Vite React + TypeScript + Tailwind CSS** template designed for building modern multi-page web applications. The AI should use this template as a foundation and extend it based on user requirements.

## 🏗️ **Tech Stack & Architecture**

### **Core Technologies**
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast development and optimized builds)
- **Styling**: Tailwind CSS (utility-first CSS framework)
- **Routing**: React Router v6 for multi-page navigation
- **Language**: TypeScript (type-safe JavaScript)
- **Package Manager**: pnpm (fast and efficient)

### **Project Structure**
```
src/
├── main.tsx          # React entry point
├── App.tsx           # Main application component with routing
├── App.css           # App-specific styles
├── index.css         # Global Tailwind CSS imports
├── pages/            # Page components with routing
│   ├── Home.tsx
│   ├── About.tsx
│   └── Contact.tsx
├── components/       # Reusable UI components
├── hooks/            # Custom React hooks
└── utils/            # Utility functions
```

## 🤖 **AI Development Guidelines**

### **1. Code Generation Rules**
- **Always use TypeScript** with proper typing
- **Use functional components** with React hooks
- **Apply Tailwind CSS** for styling (avoid custom CSS when possible)
- **Follow React best practices** (immutable state, proper dependencies)
- **Use modern ES6+ syntax** (arrow functions, destructuring, etc.)

### **2. Multi-Page Application Structure**
- **Create pages in src/pages/** directory with proper routing
- **Use React Router v6** for navigation between pages
- **Define navigation and footer in App.tsx** for consistency across pages
- **Each page should be a self-contained component** with its own state and logic

### **3. Routing Implementation**
```typescript
// App.tsx - Proper routing structure
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
```

### **4. Component Structure**
```typescript
// ✅ Good: Functional component with TypeScript
interface ComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: ComponentProps) {
  const [state, setState] = useState('');
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      <button 
        onClick={onAction}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Action
      </button>
    </div>
  );
}
```

### **Multi-Section Page Requirements**

```typescript
// HERO SECTION EXAMPLE - Two-Column with Video Play Button
const HeroSection = () => (
  <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-blue-900 text-white">
    <div className="container mx-auto px-4 py-20 md:py-28">
      <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
        {/* Left Column - Text and CTAs */}
        <div className="md:w-1/2 space-y-6 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            Create <span className="text-blue-400">stunning</span> web experiences
          </h1>
          <p className="text-lg text-gray-300 max-w-xl">
            Our landing page template works on all devices, so you only have to set it up once.
          </p>
          <div className="flex flex-wrap gap-4 pt-4 justify-center md:justify-start">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-md transition-all duration-200 hover:scale-105 hover:shadow-lg">
              Request Demo
            </button>
            <button className="border border-gray-600 hover:border-gray-500 text-white font-medium px-6 py-3 rounded-md transition-all duration-200 hover:bg-white/10">
              Explore Product
            </button>
          </div>
        </div>
        
        {/* Right Column - Video with Play Button */}
        <div className="md:w-1/2 relative mt-12 md:mt-0">
          <div className="relative overflow-hidden rounded-lg shadow-2xl">
            <img src="/dashboard-preview.jpg" alt="Dashboard" className="w-full h-auto" />
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/30 to-purple-600/20 mix-blend-overlay"></div>
            
            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 group">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center relative overflow-hidden">
                  <span className="text-white text-2xl ml-1 relative z-10">▶</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// FEATURES SECTION - Cards with Hover Effects
const FeaturesSection = () => (
  <section className="py-20 bg-white dark:bg-gray-800">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Powerful Features</h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">Everything you need to create stunning websites</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Feature Card 1 */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-100 dark:border-gray-700">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Intuitive Design</h3>
          <p className="text-gray-600 dark:text-gray-300">Create beautiful interfaces with our easy-to-use design system.</p>
        </div>
        
        {/* Additional cards would go here */}
      </div>
    </div>
  </section>
);

// TESTIMONIAL SLIDER SECTION
const TestimonialSection = () => (
  <section className="py-20 bg-gray-50 dark:bg-gray-900">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">What Our Customers Say</h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">Don't just take our word for it</p>
      </div>
      
      {/* Testimonial Carousel */}
      <div className="relative max-w-4xl mx-auto">
        {/* Testimonial Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 md:p-10 shadow-lg border border-gray-100 dark:border-gray-700 relative">
          <div className="absolute top-0 left-10 transform -translate-y-1/2 text-6xl text-blue-500 opacity-50">"</div>
          <div className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-6 pt-4">
            This platform completely transformed our online presence. The designs are stunning and the performance is unmatched.
          </div>
          
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full overflow-hidden mr-4">
              <img src="/avatar.jpg" alt="Customer" className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Sarah Johnson</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">CEO, TechStart Inc.</p>
            </div>
          </div>
        </div>
        
        {/* Carousel Controls - Pagination dots and arrows would go here */}
      </div>
    </div>
  </section>
);

// MULTI-COLUMN FOOTER
const Footer = () => (
  <footer className="bg-gray-900 text-white pt-16 pb-8">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
        {/* Column 1 - Logo and About */}
        <div className="lg:col-span-2">
          <div className="text-2xl font-bold mb-4">Brand<span className="text-blue-500">Name</span></div>
          <p className="text-gray-400 mb-4 max-w-md">
            We help businesses of all sizes build stunning web experiences.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Twitter</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Facebook</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Instagram</a>
          </div>
        </div>
        
        {/* Column 2 - Products */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Products</h3>
          <ul className="space-y-2">
            <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Templates</a></li>
            <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Hosting</a></li>
            <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Domains</a></li>
          </ul>
        </div>
        
        {/* Additional columns would go here */}
      </div>
      
      {/* Copyright */}
      <div className="pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} BrandName. All rights reserved.
      </div>
    </div>
    
    {/* Scroll to Top Button */}
    <button className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors hover:scale-110 transform duration-300">
      ↑
    </button>
  </footer>
);
```

## 📱 **Multi-Page Application Requirements**

### **Page Organization**
- **Create separate files** for each page in `src/pages/`
- **Each page should be self-contained** with its own components and state
- **Use proper routing** with React Router
- **Implement navigation** that works across all pages
- **Include consistent header/footer** across all pages

### **Navigation & Routing**
- **Use React Router v6** for all navigation
- **Create a Navigation component** in `src/components/`
- **Implement responsive navigation** with mobile hamburger menu
- **Add active state indicators** for current page
- **Ensure all routes are properly defined** in App.tsx

## 🛠️ **File System Tools & Usage**

The AI has access to several tools for interacting with the file system:

### **1. list_files**
**Purpose**: See all files in the project workspace
**When to use**:
- At the beginning of any request to understand the project structure
- To identify where to create new files
- To check if files already exist
- To understand the current directory structure

### **2. read_file**
**Purpose**: Read the contents of any existing file
**When to use**:
- To understand how components are structured
- To see current implementation before making changes
- To check package.json dependencies
- To review configuration files

### **3. write_file**
**Purpose**: Create new files or update existing files
**When to use**:
- To create new pages in src/pages/
- To create components in src/components/
- To update package.json with new dependencies
- To modify any file content

### **4. delete_file**
**Purpose**: Remove files that are no longer needed
**When to use**:
- To delete obsolete components or pages
- To clean up temporary files
- To remove unused files

### **Tool Usage Best Practices**
✅ ALWAYS use list_files first to understand the project structure
✅ ALWAYS read existing files before modifying them
✅ ALWAYS create files in the correct directories (src/pages/, src/components/, etc.)
✅ ALWAYS update package.json before using new packages
✅ NEVER skip using tools - they are mandatory for file operations

## 🚀 **Development Workflow**

### **When User Requests Features**
1. **Analyze Requirements**: Understand what the user wants to build
2. **Plan Structure**: Design component hierarchy and routing
3. **Update package.json**: Add required dependencies (especially react-router-dom)
4. **Implement Components**: Create/modify components following guidelines
5. **Add Styling**: Apply Tailwind CSS for responsive design
6. **Test Functionality**: Ensure features work as expected
7. **Optimize**: Improve performance and user experience

### **File Organization**
- **Pages**: Route-specific components in `src/pages/`
- **Components**: Reusable UI components in `src/components/`
- **Utils**: Helper functions in `src/utils/`
- **Hooks**: Custom React hooks in `src/hooks/`

## ⚠️ **Important Notes**

1. **Always use React Router** for multi-page applications
2. **Keep navigation and footer in App.tsx** for consistency
3. **Maintain TypeScript** typing throughout
4. **Use Tailwind CSS** for all styling
5. **Follow React Patterns** with hooks and functional components
6. **Test Responsiveness** on different screen sizes
7. **Add dependencies to package.json** before using them

## ✅ **Quality Assurance**

### **Code Quality**
- Use proper TypeScript interfaces and types
- Implement error handling and loading states
- Follow accessibility best practices
- Write clean, maintainable code

### **Performance**
- Optimize images and assets
- Implement lazy loading where appropriate
- Minimize bundle size
- Use React.memo and useMemo for optimization

### **User Experience**
- Implement smooth transitions and animations
- Provide clear feedback for user actions
- Ensure fast loading times
- Create intuitive navigation