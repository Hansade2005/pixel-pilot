# AI Development Guidelines

## 🎯 Template Overview
**Vite React + TypeScript + Tailwind CSS** template for modern multi-page web applications.

## 🏗️ Tech Stack
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **UI Components**: shadcn/ui (pre-installed)

## 📁 Project Structure
```
src/
├── main.tsx          # React entry point
├── App.tsx           # Main application with routing
├── pages/            # Page components
├── components/       # Reusable UI components
│   └── ui/           # shadcn/ui components
├── hooks/            # Custom React hooks
└── utils/            # Utility functions
```

## 🤖 Development Guidelines

### Code Generation
- Always use TypeScript with proper typing
- Use functional components with React hooks
- Apply Tailwind CSS for styling
- Follow React best practices

### Multi-Page Applications
- Create pages in src/pages/ with proper routing
- Use React Router v6 for navigation
- Define navigation in App.tsx
- Each page should be self-contained

### Component Structure
```typescript
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

## 🎨 UI Component Usage

### shadcn/ui Components
The template includes pre-built shadcn/ui components in src/components/ui/:

1. **Button** - `import { Button } from "@/components/ui/button"`
2. **Card** - `import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"`
3. **Input** - `import { Input } from "@/components/ui/input"`
4. **Label** - `import { Label } from "@/components/ui/label"`
5. **Alert** - `import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"`
6. **Badge** - `import { Badge } from "@/components/ui/badge"`
7. **Dialog** - `import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog"`
8. **Dropdown Menu** - `import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"`
9. **Checkbox** - `import { Checkbox } from "@/components/ui/checkbox"`
10. **Select** - `import { Select, SelectContent, SelectItem } from "@/components/ui/select"`
11. **Textarea** - `import { Textarea } from "@/components/ui/textarea"`
12. **Switch** - `import { Switch } from "@/components/ui/switch"`
13. **Tabs** - `import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"`
14. **Tooltip** - `import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"`
15. **Avatar** - `import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"`
16. **Separator** - `import { Separator } from "@/components/ui/separator"`
17. **Accordion** - `import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"`
18. **Popover** - `import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"`
19. **Progress** - `import { Progress } from "@/components/ui/progress"`
20. **Slider** - `import { Slider } from "@/components/ui/slider"`
21. **Breadcrumb** - `import { Breadcrumb, BreadcrumbList, BreadcrumbItem } from "@/components/ui/breadcrumb"`
22. **Skeleton** - `import { Skeleton } from "@/components/ui/skeleton"`
23. **Sonner** - `import { Toaster } from "@/components/ui/sonner"`
24. **Table** - `import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table"`
25. **Form** - `import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form"`

### Using Components
1. Import correctly using the `@/components/ui/component-name` path
2. Use variants when available for consistent styling
3. Combine with Tailwind classes for additional styling

## 🛠️ File System Tools

1. **list_files** - See all files in the project
2. **read_file** - Read the contents of any existing file
3. **write_file** - Create new files or update existing files
4. **delete_file** - Remove files that are no longer needed

## 🖼️ Image Generation API

**API Endpoint:** https://api.a0.dev/assets/image

**Usage:**
- **text parameter**: Describe the image you want to generate (image prompt)
- **seed parameter**: A number for consistent image generation (optional, defaults to random)
- **aspect parameter**: Image aspect ratio (optional, e.g., "1:1", "16:9", "4:3")

**Example URLs:**
- Basic: https://api.a0.dev/assets/image?text=RideShare&aspect=1:1&seed=123
- Product: https://api.a0.dev/assets/image?text=Modern%20laptop%20computer&aspect=16:9&seed=456
- Hero: https://api.a0.dev/assets/image?text=Business%20team%20collaboration&aspect=16:9&seed=789

**Implementation:**
1. Use the URL directly in img src attributes
2. Encode spaces as %20 in the text parameter
3. Use descriptive prompts for better image quality
4. Keep seed consistent for similar images
5. Choose appropriate aspect ratios for different use cases

**Best Practices:**
- Use descriptive, specific prompts for better results
- Encode special characters properly in URLs
- Use consistent seeds for related images
- Choose aspect ratios that match your design needs
- Test different prompts to find the best results
- Use this API for all image needs in the application

## ⚠️ Important Notes

1. Always use React Router for multi-page applications
2. Keep navigation in App.tsx for consistency
3. Maintain TypeScript typing throughout
4. Use Tailwind CSS for all styling
5. Follow React patterns with hooks and functional components
6. ONLY USE PACKAGES SPECIFIED IN PACKAGE.JSON
7. NEVER modify vite.config.js or vite.config.ts files
8. Use the image generation API for all image needs in the application

## ✅ Quality Assurance

- Use proper TypeScript interfaces and types
- Implement error handling and loading states
- Follow accessibility best practices
- Write clean, maintainable code
- Optimize for performance and user experience
