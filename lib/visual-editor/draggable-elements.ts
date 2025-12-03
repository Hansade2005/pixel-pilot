// Draggable Elements for Visual Editor
// Defines all elements that can be dragged and dropped into the UI

export interface DraggableElement {
  id: string;
  name: string;
  description: string;
  category: ElementCategory;
  icon: string; // Lucide icon name
  defaultContent: string; // JSX/HTML content
  variants?: ElementVariant[];
  properties?: ElementProperty[];
  supportsNesting?: boolean; // Whether the element can contain other elements
}

export interface ElementVariant {
  id: string;
  name: string;
  defaultContent: string;
}

export interface ElementProperty {
  name: string;
  type: 'text' | 'number' | 'select' | 'color' | 'url' | 'boolean';
  label: string;
  defaultValue: string | number | boolean;
  options?: { label: string; value: string }[]; // For select type
}

export type ElementCategory = 
  | 'layout'      // Containers, Grids, Sections
  | 'typography'  // Headings, Paragraphs, Text
  | 'media'       // Images, Videos, Icons
  | 'interactive' // Buttons, Links, CTAs
  | 'data'        // Tables, Lists
  | 'forms'       // Inputs, Selects, Forms
  | 'content';    // Blockquotes, Cards, Dividers

export const ELEMENT_CATEGORIES: { id: ElementCategory; name: string; icon: string }[] = [
  { id: 'layout', name: 'Layout', icon: 'LayoutGrid' },
  { id: 'typography', name: 'Typography', icon: 'Type' },
  { id: 'media', name: 'Media', icon: 'Image' },
  { id: 'interactive', name: 'Interactive', icon: 'MousePointer' },
  { id: 'data', name: 'Data', icon: 'Table' },
  { id: 'forms', name: 'Forms', icon: 'FormInput' },
  { id: 'content', name: 'Content', icon: 'FileText' },
];

// ============================================
// DRAGGABLE ELEMENTS LIBRARY
// ============================================

export const DRAGGABLE_ELEMENTS: DraggableElement[] = [
  // ============================================
  // LAYOUT ELEMENTS
  // ============================================
  {
    id: 'container',
    name: 'Container',
    description: 'A flexible container that can hold other elements',
    category: 'layout',
    icon: 'Box',
    supportsNesting: true,
    defaultContent: `<div className="p-6 border rounded-lg bg-card">
  {/* Drop elements here */}
  <p className="text-muted-foreground text-center">Drop content here</p>
</div>`,
    variants: [
      {
        id: 'container-simple',
        name: 'Simple',
        defaultContent: `<div className="p-4">
  <p className="text-muted-foreground">Content goes here</p>
</div>`,
      },
      {
        id: 'container-bordered',
        name: 'Bordered',
        defaultContent: `<div className="p-6 border rounded-lg">
  <p className="text-muted-foreground">Content goes here</p>
</div>`,
      },
      {
        id: 'container-card',
        name: 'Card Style',
        defaultContent: `<div className="p-6 border rounded-lg bg-card shadow-sm">
  <p className="text-muted-foreground">Content goes here</p>
</div>`,
      },
    ],
  },
  {
    id: 'section',
    name: 'Section',
    description: 'A full-width section with max-width container',
    category: 'layout',
    icon: 'Layers',
    supportsNesting: true,
    defaultContent: `<section className="py-16 px-4">
  <div className="max-w-6xl mx-auto">
    <h2 className="text-3xl font-bold mb-6">Section Title</h2>
    <p className="text-muted-foreground">Section content goes here.</p>
  </div>
</section>`,
  },
  {
    id: 'grid-2col',
    name: '2 Column Grid',
    description: 'A responsive 2-column grid layout',
    category: 'layout',
    icon: 'Columns2',
    supportsNesting: true,
    defaultContent: `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div className="p-4 border rounded-lg">
    <p className="text-muted-foreground">Column 1</p>
  </div>
  <div className="p-4 border rounded-lg">
    <p className="text-muted-foreground">Column 2</p>
  </div>
</div>`,
  },
  {
    id: 'grid-3col',
    name: '3 Column Grid',
    description: 'A responsive 3-column grid layout',
    category: 'layout',
    icon: 'Columns3',
    supportsNesting: true,
    defaultContent: `<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div className="p-4 border rounded-lg">
    <p className="text-muted-foreground">Column 1</p>
  </div>
  <div className="p-4 border rounded-lg">
    <p className="text-muted-foreground">Column 2</p>
  </div>
  <div className="p-4 border rounded-lg">
    <p className="text-muted-foreground">Column 3</p>
  </div>
</div>`,
  },
  {
    id: 'grid-4col',
    name: '4 Column Grid',
    description: 'A responsive 4-column grid layout',
    category: 'layout',
    icon: 'LayoutGrid',
    supportsNesting: true,
    defaultContent: `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  <div className="p-4 border rounded-lg">
    <p className="text-muted-foreground">Column 1</p>
  </div>
  <div className="p-4 border rounded-lg">
    <p className="text-muted-foreground">Column 2</p>
  </div>
  <div className="p-4 border rounded-lg">
    <p className="text-muted-foreground">Column 3</p>
  </div>
  <div className="p-4 border rounded-lg">
    <p className="text-muted-foreground">Column 4</p>
  </div>
</div>`,
  },
  {
    id: 'flex-row',
    name: 'Flex Row',
    description: 'A horizontal flex container',
    category: 'layout',
    icon: 'ArrowRight',
    supportsNesting: true,
    defaultContent: `<div className="flex flex-wrap gap-4 items-center">
  <div className="p-4 border rounded-lg">Item 1</div>
  <div className="p-4 border rounded-lg">Item 2</div>
  <div className="p-4 border rounded-lg">Item 3</div>
</div>`,
  },
  {
    id: 'flex-col',
    name: 'Flex Column',
    description: 'A vertical flex container',
    category: 'layout',
    icon: 'ArrowDown',
    supportsNesting: true,
    defaultContent: `<div className="flex flex-col gap-4">
  <div className="p-4 border rounded-lg">Item 1</div>
  <div className="p-4 border rounded-lg">Item 2</div>
  <div className="p-4 border rounded-lg">Item 3</div>
</div>`,
  },
  {
    id: 'divider',
    name: 'Divider',
    description: 'A horizontal divider line',
    category: 'layout',
    icon: 'Minus',
    supportsNesting: false,
    defaultContent: `<hr className="my-8 border-t border-border" />`,
    variants: [
      {
        id: 'divider-thin',
        name: 'Thin',
        defaultContent: `<hr className="my-4 border-t border-border" />`,
      },
      {
        id: 'divider-thick',
        name: 'Thick',
        defaultContent: `<hr className="my-8 border-t-2 border-border" />`,
      },
      {
        id: 'divider-dashed',
        name: 'Dashed',
        defaultContent: `<hr className="my-8 border-t border-dashed border-border" />`,
      },
    ],
  },
  {
    id: 'spacer',
    name: 'Spacer',
    description: 'Add vertical spacing between elements',
    category: 'layout',
    icon: 'Space',
    supportsNesting: false,
    defaultContent: `<div className="h-8" aria-hidden="true"></div>`,
    variants: [
      { id: 'spacer-sm', name: 'Small (16px)', defaultContent: `<div className="h-4" aria-hidden="true"></div>` },
      { id: 'spacer-md', name: 'Medium (32px)', defaultContent: `<div className="h-8" aria-hidden="true"></div>` },
      { id: 'spacer-lg', name: 'Large (64px)', defaultContent: `<div className="h-16" aria-hidden="true"></div>` },
      { id: 'spacer-xl', name: 'Extra Large (96px)', defaultContent: `<div className="h-24" aria-hidden="true"></div>` },
    ],
  },

  // ============================================
  // TYPOGRAPHY ELEMENTS
  // ============================================
  {
    id: 'heading-1',
    name: 'Heading 1',
    description: 'Main page heading (H1)',
    category: 'typography',
    icon: 'Heading1',
    supportsNesting: false,
    defaultContent: `<h1 className="text-4xl font-bold tracking-tight">Heading 1</h1>`,
  },
  {
    id: 'heading-2',
    name: 'Heading 2',
    description: 'Section heading (H2)',
    category: 'typography',
    icon: 'Heading2',
    supportsNesting: false,
    defaultContent: `<h2 className="text-3xl font-semibold tracking-tight">Heading 2</h2>`,
  },
  {
    id: 'heading-3',
    name: 'Heading 3',
    description: 'Sub-section heading (H3)',
    category: 'typography',
    icon: 'Heading3',
    supportsNesting: false,
    defaultContent: `<h3 className="text-2xl font-semibold">Heading 3</h3>`,
  },
  {
    id: 'heading-4',
    name: 'Heading 4',
    description: 'Minor heading (H4)',
    category: 'typography',
    icon: 'Heading4',
    supportsNesting: false,
    defaultContent: `<h4 className="text-xl font-semibold">Heading 4</h4>`,
  },
  {
    id: 'heading-5',
    name: 'Heading 5',
    description: 'Small heading (H5)',
    category: 'typography',
    icon: 'Heading5',
    supportsNesting: false,
    defaultContent: `<h5 className="text-lg font-medium">Heading 5</h5>`,
  },
  {
    id: 'heading-6',
    name: 'Heading 6',
    description: 'Smallest heading (H6)',
    category: 'typography',
    icon: 'Heading6',
    supportsNesting: false,
    defaultContent: `<h6 className="text-base font-medium">Heading 6</h6>`,
  },
  {
    id: 'paragraph',
    name: 'Paragraph',
    description: 'A block of text content',
    category: 'typography',
    icon: 'AlignLeft',
    supportsNesting: false,
    defaultContent: `<p className="text-base leading-7">
  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.
</p>`,
    variants: [
      {
        id: 'paragraph-lead',
        name: 'Lead Paragraph',
        defaultContent: `<p className="text-xl text-muted-foreground leading-8">
  A larger paragraph style for introductions and important text.
</p>`,
      },
      {
        id: 'paragraph-small',
        name: 'Small Text',
        defaultContent: `<p className="text-sm text-muted-foreground">
  A smaller paragraph for captions and secondary information.
</p>`,
      },
    ],
  },
  {
    id: 'text-span',
    name: 'Text Span',
    description: 'Inline text for custom styling',
    category: 'typography',
    icon: 'Type',
    supportsNesting: false,
    defaultContent: `<span className="text-primary font-medium">Styled text</span>`,
  },
  {
    id: 'label',
    name: 'Label',
    description: 'A small label or tag',
    category: 'typography',
    icon: 'Tag',
    supportsNesting: false,
    defaultContent: `<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground">
  Label
</span>`,
    variants: [
      {
        id: 'label-secondary',
        name: 'Secondary',
        defaultContent: `<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
  Label
</span>`,
      },
      {
        id: 'label-outline',
        name: 'Outline',
        defaultContent: `<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border">
  Label
</span>`,
      },
    ],
  },

  // ============================================
  // MEDIA ELEMENTS
  // ============================================
  {
    id: 'image',
    name: 'Image',
    description: 'Display an image from URL',
    category: 'media',
    icon: 'Image',
    supportsNesting: false,
    defaultContent: `<img 
  src="https://placehold.co/600x400" 
  alt="Placeholder image" 
  className="w-full h-auto rounded-lg"
/>`,
    properties: [
      { name: 'src', type: 'url', label: 'Image URL', defaultValue: 'https://placehold.co/600x400' },
      { name: 'alt', type: 'text', label: 'Alt Text', defaultValue: 'Image description' },
    ],
    variants: [
      {
        id: 'image-rounded',
        name: 'Rounded',
        defaultContent: `<img 
  src="https://placehold.co/600x400" 
  alt="Placeholder image" 
  className="w-full h-auto rounded-2xl"
/>`,
      },
      {
        id: 'image-circle',
        name: 'Circle (Avatar)',
        defaultContent: `<img 
  src="https://placehold.co/200x200" 
  alt="Avatar" 
  className="w-24 h-24 rounded-full object-cover"
/>`,
      },
      {
        id: 'image-cover',
        name: 'Cover',
        defaultContent: `<div className="aspect-video">
  <img 
    src="https://placehold.co/1200x675" 
    alt="Cover image" 
    className="w-full h-full object-cover rounded-lg"
  />
</div>`,
      },
    ],
  },
  {
    id: 'video-embed',
    name: 'Video Embed',
    description: 'Embed a YouTube or Vimeo video',
    category: 'media',
    icon: 'Play',
    supportsNesting: false,
    defaultContent: `<div className="aspect-video">
  <iframe 
    src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
    title="Video" 
    className="w-full h-full rounded-lg"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
    allowFullScreen
  />
</div>`,
  },
  {
    id: 'icon-placeholder',
    name: 'Icon',
    description: 'A placeholder for icons',
    category: 'media',
    icon: 'Smile',
    supportsNesting: false,
    defaultContent: `<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
</div>`,
  },

  // ============================================
  // INTERACTIVE ELEMENTS
  // ============================================
  {
    id: 'button-primary',
    name: 'Button',
    description: 'A clickable button',
    category: 'interactive',
    icon: 'MousePointer',
    supportsNesting: false,
    defaultContent: `<button className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
  Click Me
</button>`,
    variants: [
      {
        id: 'button-secondary',
        name: 'Secondary',
        defaultContent: `<button className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors">
  Secondary
</button>`,
      },
      {
        id: 'button-outline',
        name: 'Outline',
        defaultContent: `<button className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-input bg-background font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
  Outline
</button>`,
      },
      {
        id: 'button-ghost',
        name: 'Ghost',
        defaultContent: `<button className="inline-flex items-center justify-center px-4 py-2 rounded-md font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
  Ghost
</button>`,
      },
      {
        id: 'button-destructive',
        name: 'Destructive',
        defaultContent: `<button className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition-colors">
  Delete
</button>`,
      },
      {
        id: 'button-large',
        name: 'Large',
        defaultContent: `<button className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground text-lg font-medium hover:bg-primary/90 transition-colors">
  Large Button
</button>`,
      },
      {
        id: 'button-small',
        name: 'Small',
        defaultContent: `<button className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
  Small
</button>`,
      },
    ],
  },
  {
    id: 'link',
    name: 'Link',
    description: 'A hyperlink to navigate',
    category: 'interactive',
    icon: 'Link',
    supportsNesting: false,
    defaultContent: `<a href="#" className="text-primary hover:underline font-medium">
  Link Text
</a>`,
    properties: [
      { name: 'href', type: 'url', label: 'URL', defaultValue: '#' },
      { name: 'text', type: 'text', label: 'Link Text', defaultValue: 'Link Text' },
    ],
    variants: [
      {
        id: 'link-muted',
        name: 'Muted',
        defaultContent: `<a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
  Muted Link
</a>`,
      },
      {
        id: 'link-external',
        name: 'External Link',
        defaultContent: `<a href="#" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline font-medium">
  External Link
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
</a>`,
      },
    ],
  },
  {
    id: 'button-link',
    name: 'Button Link',
    description: 'A link styled as a button',
    category: 'interactive',
    icon: 'ExternalLink',
    supportsNesting: false,
    defaultContent: `<a href="#" className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
  Get Started
</a>`,
    properties: [
      { name: 'href', type: 'url', label: 'URL', defaultValue: '#' },
    ],
  },
  {
    id: 'cta-section',
    name: 'CTA Section',
    description: 'A call-to-action section with heading and button',
    category: 'interactive',
    icon: 'Megaphone',
    supportsNesting: true,
    defaultContent: `<section className="py-16 px-4 bg-primary text-primary-foreground rounded-lg">
  <div className="max-w-3xl mx-auto text-center">
    <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
    <p className="text-lg opacity-90 mb-8">Join thousands of users who have already transformed their workflow.</p>
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <a href="#" className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-background text-foreground font-medium hover:bg-background/90 transition-colors">
        Start Free Trial
      </a>
      <a href="#" className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-primary-foreground/30 text-primary-foreground font-medium hover:bg-primary-foreground/10 transition-colors">
        Learn More
      </a>
    </div>
  </div>
</section>`,
  },

  // ============================================
  // DATA ELEMENTS
  // ============================================
  {
    id: 'unordered-list',
    name: 'Bullet List',
    description: 'An unordered bullet point list',
    category: 'data',
    icon: 'List',
    supportsNesting: false,
    defaultContent: `<ul className="list-disc list-inside space-y-2">
  <li>First item in the list</li>
  <li>Second item in the list</li>
  <li>Third item in the list</li>
</ul>`,
    variants: [
      {
        id: 'list-check',
        name: 'Checkmark List',
        defaultContent: `<ul className="space-y-3">
  <li className="flex items-center gap-2">
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>Feature one included</span>
  </li>
  <li className="flex items-center gap-2">
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>Feature two included</span>
  </li>
  <li className="flex items-center gap-2">
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>Feature three included</span>
  </li>
</ul>`,
      },
    ],
  },
  {
    id: 'ordered-list',
    name: 'Numbered List',
    description: 'An ordered numbered list',
    category: 'data',
    icon: 'ListOrdered',
    supportsNesting: false,
    defaultContent: `<ol className="list-decimal list-inside space-y-2">
  <li>First step in the process</li>
  <li>Second step in the process</li>
  <li>Third step in the process</li>
</ol>`,
  },
  {
    id: 'table',
    name: 'Table',
    description: 'A data table with headers',
    category: 'data',
    icon: 'Table',
    supportsNesting: false,
    defaultContent: `<div className="overflow-x-auto">
  <table className="w-full border-collapse">
    <thead>
      <tr className="border-b">
        <th className="text-left p-3 font-semibold">Name</th>
        <th className="text-left p-3 font-semibold">Role</th>
        <th className="text-left p-3 font-semibold">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b">
        <td className="p-3">John Doe</td>
        <td className="p-3">Developer</td>
        <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">Active</span></td>
      </tr>
      <tr className="border-b">
        <td className="p-3">Jane Smith</td>
        <td className="p-3">Designer</td>
        <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">Active</span></td>
      </tr>
      <tr className="border-b">
        <td className="p-3">Bob Wilson</td>
        <td className="p-3">Manager</td>
        <td className="p-3"><span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">Away</span></td>
      </tr>
    </tbody>
  </table>
</div>`,
    variants: [
      {
        id: 'table-striped',
        name: 'Striped',
        defaultContent: `<div className="overflow-x-auto">
  <table className="w-full border-collapse">
    <thead>
      <tr className="bg-muted">
        <th className="text-left p-3 font-semibold">Name</th>
        <th className="text-left p-3 font-semibold">Role</th>
        <th className="text-left p-3 font-semibold">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr className="bg-background">
        <td className="p-3">John Doe</td>
        <td className="p-3">Developer</td>
        <td className="p-3">Active</td>
      </tr>
      <tr className="bg-muted/50">
        <td className="p-3">Jane Smith</td>
        <td className="p-3">Designer</td>
        <td className="p-3">Active</td>
      </tr>
      <tr className="bg-background">
        <td className="p-3">Bob Wilson</td>
        <td className="p-3">Manager</td>
        <td className="p-3">Away</td>
      </tr>
    </tbody>
  </table>
</div>`,
      },
    ],
  },
  {
    id: 'definition-list',
    name: 'Definition List',
    description: 'A list of terms and definitions',
    category: 'data',
    icon: 'BookOpen',
    supportsNesting: false,
    defaultContent: `<dl className="space-y-4">
  <div>
    <dt className="font-semibold">Term 1</dt>
    <dd className="text-muted-foreground mt-1">Definition for term 1 goes here.</dd>
  </div>
  <div>
    <dt className="font-semibold">Term 2</dt>
    <dd className="text-muted-foreground mt-1">Definition for term 2 goes here.</dd>
  </div>
  <div>
    <dt className="font-semibold">Term 3</dt>
    <dd className="text-muted-foreground mt-1">Definition for term 3 goes here.</dd>
  </div>
</dl>`,
  },

  // ============================================
  // FORM ELEMENTS
  // ============================================
  {
    id: 'input-text',
    name: 'Text Input',
    description: 'A text input field with label',
    category: 'forms',
    icon: 'TextCursor',
    supportsNesting: false,
    defaultContent: `<div className="space-y-2">
  <label htmlFor="input" className="text-sm font-medium">Label</label>
  <input 
    type="text" 
    id="input" 
    placeholder="Enter text..." 
    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
  />
</div>`,
    variants: [
      {
        id: 'input-email',
        name: 'Email Input',
        defaultContent: `<div className="space-y-2">
  <label htmlFor="email" className="text-sm font-medium">Email</label>
  <input 
    type="email" 
    id="email" 
    placeholder="you@example.com" 
    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
  />
</div>`,
      },
      {
        id: 'input-password',
        name: 'Password Input',
        defaultContent: `<div className="space-y-2">
  <label htmlFor="password" className="text-sm font-medium">Password</label>
  <input 
    type="password" 
    id="password" 
    placeholder="••••••••" 
    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
  />
</div>`,
      },
    ],
  },
  {
    id: 'textarea',
    name: 'Textarea',
    description: 'A multi-line text input',
    category: 'forms',
    icon: 'AlignLeft',
    supportsNesting: false,
    defaultContent: `<div className="space-y-2">
  <label htmlFor="textarea" className="text-sm font-medium">Message</label>
  <textarea 
    id="textarea" 
    rows={4}
    placeholder="Enter your message..." 
    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
  />
</div>`,
  },
  {
    id: 'select',
    name: 'Select',
    description: 'A dropdown select field',
    category: 'forms',
    icon: 'ChevronDown',
    supportsNesting: false,
    defaultContent: `<div className="space-y-2">
  <label htmlFor="select" className="text-sm font-medium">Select Option</label>
  <select 
    id="select" 
    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
  >
    <option value="">Choose an option</option>
    <option value="1">Option 1</option>
    <option value="2">Option 2</option>
    <option value="3">Option 3</option>
  </select>
</div>`,
  },
  {
    id: 'checkbox',
    name: 'Checkbox',
    description: 'A checkbox input with label',
    category: 'forms',
    icon: 'CheckSquare',
    supportsNesting: false,
    defaultContent: `<div className="flex items-center gap-2">
  <input 
    type="checkbox" 
    id="checkbox" 
    className="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-ring"
  />
  <label htmlFor="checkbox" className="text-sm font-medium">I agree to the terms</label>
</div>`,
  },
  {
    id: 'radio-group',
    name: 'Radio Group',
    description: 'A group of radio buttons',
    category: 'forms',
    icon: 'Circle',
    supportsNesting: false,
    defaultContent: `<fieldset className="space-y-3">
  <legend className="text-sm font-medium mb-2">Choose an option</legend>
  <div className="flex items-center gap-2">
    <input type="radio" id="radio1" name="radio-group" className="w-4 h-4" />
    <label htmlFor="radio1" className="text-sm">Option 1</label>
  </div>
  <div className="flex items-center gap-2">
    <input type="radio" id="radio2" name="radio-group" className="w-4 h-4" />
    <label htmlFor="radio2" className="text-sm">Option 2</label>
  </div>
  <div className="flex items-center gap-2">
    <input type="radio" id="radio3" name="radio-group" className="w-4 h-4" />
    <label htmlFor="radio3" className="text-sm">Option 3</label>
  </div>
</fieldset>`,
  },
  {
    id: 'form-complete',
    name: 'Contact Form',
    description: 'A complete contact form',
    category: 'forms',
    icon: 'Send',
    supportsNesting: true,
    defaultContent: `<form className="space-y-4 p-6 border rounded-lg">
  <h3 className="text-xl font-semibold mb-4">Contact Us</h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div className="space-y-2">
      <label htmlFor="firstName" className="text-sm font-medium">First Name</label>
      <input type="text" id="firstName" placeholder="John" className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
    <div className="space-y-2">
      <label htmlFor="lastName" className="text-sm font-medium">Last Name</label>
      <input type="text" id="lastName" placeholder="Doe" className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  </div>
  <div className="space-y-2">
    <label htmlFor="email" className="text-sm font-medium">Email</label>
    <input type="email" id="email" placeholder="john@example.com" className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
  </div>
  <div className="space-y-2">
    <label htmlFor="message" className="text-sm font-medium">Message</label>
    <textarea id="message" rows={4} placeholder="Your message..." className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
  </div>
  <button type="submit" className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
    Send Message
  </button>
</form>`,
  },

  // ============================================
  // CONTENT ELEMENTS
  // ============================================
  {
    id: 'blockquote',
    name: 'Blockquote',
    description: 'A styled quotation block',
    category: 'content',
    icon: 'Quote',
    supportsNesting: false,
    defaultContent: `<blockquote className="border-l-4 border-primary pl-4 italic text-lg">
  "The best way to predict the future is to create it."
  <footer className="text-sm text-muted-foreground mt-2 not-italic">— Abraham Lincoln</footer>
</blockquote>`,
    variants: [
      {
        id: 'blockquote-large',
        name: 'Large Quote',
        defaultContent: `<blockquote className="text-2xl font-medium text-center py-8">
  "The best way to predict the future is to create it."
  <footer className="text-base text-muted-foreground mt-4 font-normal">— Abraham Lincoln</footer>
</blockquote>`,
      },
    ],
  },
  {
    id: 'card',
    name: 'Card',
    description: 'A content card with image and text',
    category: 'content',
    icon: 'Square',
    supportsNesting: true,
    defaultContent: `<div className="border rounded-lg overflow-hidden bg-card">
  <img src="https://placehold.co/400x200" alt="Card image" className="w-full h-48 object-cover" />
  <div className="p-4">
    <h3 className="text-lg font-semibold mb-2">Card Title</h3>
    <p className="text-muted-foreground text-sm mb-4">This is a brief description of the card content.</p>
    <a href="#" className="text-primary hover:underline text-sm font-medium">Learn more →</a>
  </div>
</div>`,
    variants: [
      {
        id: 'card-horizontal',
        name: 'Horizontal',
        defaultContent: `<div className="flex flex-col sm:flex-row border rounded-lg overflow-hidden bg-card">
  <img src="https://placehold.co/300x200" alt="Card image" className="w-full sm:w-48 h-48 sm:h-auto object-cover" />
  <div className="p-4 flex flex-col justify-center">
    <h3 className="text-lg font-semibold mb-2">Card Title</h3>
    <p className="text-muted-foreground text-sm mb-4">This is a brief description of the card content.</p>
    <a href="#" className="text-primary hover:underline text-sm font-medium">Learn more →</a>
  </div>
</div>`,
      },
      {
        id: 'card-simple',
        name: 'Simple (No Image)',
        defaultContent: `<div className="border rounded-lg p-6 bg-card">
  <h3 className="text-lg font-semibold mb-2">Card Title</h3>
  <p className="text-muted-foreground text-sm mb-4">This is a brief description of the card content that goes here.</p>
  <a href="#" className="text-primary hover:underline text-sm font-medium">Learn more →</a>
</div>`,
      },
    ],
  },
  {
    id: 'testimonial',
    name: 'Testimonial',
    description: 'A customer testimonial card',
    category: 'content',
    icon: 'MessageSquareQuote',
    supportsNesting: false,
    defaultContent: `<div className="p-6 border rounded-lg bg-card">
  <p className="text-lg mb-4">"This product has completely transformed how our team works. Highly recommended!"</p>
  <div className="flex items-center gap-4">
    <img src="https://placehold.co/48x48" alt="Avatar" className="w-12 h-12 rounded-full" />
    <div>
      <p className="font-semibold">Sarah Johnson</p>
      <p className="text-sm text-muted-foreground">CEO at TechCorp</p>
    </div>
  </div>
</div>`,
  },
  {
    id: 'feature-card',
    name: 'Feature Card',
    description: 'A feature highlight card with icon',
    category: 'content',
    icon: 'Star',
    supportsNesting: false,
    defaultContent: `<div className="p-6 border rounded-lg bg-card">
  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  </div>
  <h3 className="text-lg font-semibold mb-2">Feature Title</h3>
  <p className="text-muted-foreground text-sm">A brief description of this amazing feature and its benefits.</p>
</div>`,
  },
  {
    id: 'pricing-card',
    name: 'Pricing Card',
    description: 'A pricing tier card',
    category: 'content',
    icon: 'CreditCard',
    supportsNesting: true,
    defaultContent: `<div className="p-6 border rounded-lg bg-card flex flex-col">
  <h3 className="text-lg font-semibold">Pro Plan</h3>
  <p className="text-muted-foreground text-sm mb-4">Best for growing businesses</p>
  <div className="mb-6">
    <span className="text-4xl font-bold">$29</span>
    <span className="text-muted-foreground">/month</span>
  </div>
  <ul className="space-y-3 mb-6 flex-grow">
    <li className="flex items-center gap-2">
      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span>Unlimited projects</span>
    </li>
    <li className="flex items-center gap-2">
      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span>Priority support</span>
    </li>
    <li className="flex items-center gap-2">
      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span>Advanced analytics</span>
    </li>
  </ul>
  <button className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
    Get Started
  </button>
</div>`,
  },
  {
    id: 'stat-card',
    name: 'Stat Card',
    description: 'A statistics display card',
    category: 'content',
    icon: 'TrendingUp',
    supportsNesting: false,
    defaultContent: `<div className="p-6 border rounded-lg bg-card text-center">
  <p className="text-4xl font-bold text-primary mb-2">10,000+</p>
  <p className="text-muted-foreground">Active Users</p>
</div>`,
  },
  {
    id: 'alert',
    name: 'Alert',
    description: 'An alert or notification box',
    category: 'content',
    icon: 'AlertCircle',
    supportsNesting: false,
    defaultContent: `<div className="flex items-start gap-3 p-4 border rounded-lg bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
  <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  <div>
    <p className="font-medium text-blue-800 dark:text-blue-200">Information</p>
    <p className="text-sm text-blue-700 dark:text-blue-300">This is an informational alert message.</p>
  </div>
</div>`,
    variants: [
      {
        id: 'alert-success',
        name: 'Success',
        defaultContent: `<div className="flex items-start gap-3 p-4 border rounded-lg bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900">
  <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
  <div>
    <p className="font-medium text-green-800 dark:text-green-200">Success</p>
    <p className="text-sm text-green-700 dark:text-green-300">Your changes have been saved successfully.</p>
  </div>
</div>`,
      },
      {
        id: 'alert-warning',
        name: 'Warning',
        defaultContent: `<div className="flex items-start gap-3 p-4 border rounded-lg bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-900">
  <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
  <div>
    <p className="font-medium text-yellow-800 dark:text-yellow-200">Warning</p>
    <p className="text-sm text-yellow-700 dark:text-yellow-300">Please review before proceeding.</p>
  </div>
</div>`,
      },
      {
        id: 'alert-error',
        name: 'Error',
        defaultContent: `<div className="flex items-start gap-3 p-4 border rounded-lg bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900">
  <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
  <div>
    <p className="font-medium text-red-800 dark:text-red-200">Error</p>
    <p className="text-sm text-red-700 dark:text-red-300">Something went wrong. Please try again.</p>
  </div>
</div>`,
      },
    ],
  },
  {
    id: 'badge',
    name: 'Badge',
    description: 'A small status badge',
    category: 'content',
    icon: 'Award',
    supportsNesting: false,
    defaultContent: `<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
  New
</span>`,
    variants: [
      {
        id: 'badge-success',
        name: 'Success',
        defaultContent: `<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
  Active
</span>`,
      },
      {
        id: 'badge-warning',
        name: 'Warning',
        defaultContent: `<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
  Pending
</span>`,
      },
      {
        id: 'badge-error',
        name: 'Error',
        defaultContent: `<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
  Inactive
</span>`,
      },
    ],
  },
  {
    id: 'avatar-group',
    name: 'Avatar Group',
    description: 'A group of overlapping avatars',
    category: 'content',
    icon: 'Users',
    supportsNesting: false,
    defaultContent: `<div className="flex -space-x-4">
  <img src="https://placehold.co/40x40" alt="User" className="w-10 h-10 rounded-full border-2 border-background" />
  <img src="https://placehold.co/40x40" alt="User" className="w-10 h-10 rounded-full border-2 border-background" />
  <img src="https://placehold.co/40x40" alt="User" className="w-10 h-10 rounded-full border-2 border-background" />
  <div className="w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">+5</div>
</div>`,
  },
  {
    id: 'code-block',
    name: 'Code Block',
    description: 'A code snippet display',
    category: 'content',
    icon: 'Code',
    supportsNesting: false,
    defaultContent: `<pre className="p-4 bg-muted rounded-lg overflow-x-auto">
  <code className="text-sm font-mono">
{\`const greeting = "Hello, World!";
console.log(greeting);\`}
  </code>
</pre>`,
  },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get all elements in a category
 */
export function getElementsByCategory(category: ElementCategory): DraggableElement[] {
  return DRAGGABLE_ELEMENTS.filter(el => el.category === category);
}

/**
 * Get an element by ID
 */
export function getElementById(elementId: string): DraggableElement | undefined {
  return DRAGGABLE_ELEMENTS.find(el => el.id === elementId);
}

/**
 * Get a variant of an element
 */
export function getElementVariant(elementId: string, variantId: string): ElementVariant | undefined {
  const element = getElementById(elementId);
  return element?.variants?.find(v => v.id === variantId);
}

/**
 * Get elements that support nesting
 */
export function getNestableElements(): DraggableElement[] {
  return DRAGGABLE_ELEMENTS.filter(el => el.supportsNesting);
}

/**
 * Generate unique ID for a new element instance
 */
export function generateElementId(elementType: string): string {
  return `${elementType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert JSX string to HTML for preview
 */
export function jsxToHtmlPreview(jsxContent: string): string {
  return jsxContent
    .replace(/className=/g, 'class=')
    .replace(/htmlFor=/g, 'for=')
    .replace(/\{\/\*.*?\*\/\}/g, '') // Remove JSX comments
    .replace(/\{`([^`]*)`\}/g, '$1') // Convert template literals
    .replace(/\{true\}/g, '')
    .replace(/\{false\}/g, '')
    .replace(/strokeLinecap/g, 'stroke-linecap')
    .replace(/strokeLinejoin/g, 'stroke-linejoin')
    .replace(/strokeWidth/g, 'stroke-width')
    .replace(/viewBox/g, 'viewBox')
    .replace(/fillRule/g, 'fill-rule')
    .replace(/clipRule/g, 'clip-rule')
    .replace(/allowFullScreen/g, 'allowfullscreen');
}

export default {
  DRAGGABLE_ELEMENTS,
  ELEMENT_CATEGORIES,
  getElementsByCategory,
  getElementById,
  getElementVariant,
  getNestableElements,
  generateElementId,
  jsxToHtmlPreview,
};
