'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Template {
  id: string
  name: string
  description: string
  prompt: string
  icon: string
  tables: number
  category: string
}

const templates: Template[] = [
  // Business & Commerce
  {
    id: 'ecommerce',
    name: 'E-commerce Store',
    description: 'Products, categories, orders, and customers',
    prompt: 'Create an e-commerce store with products (name, price, description, stock quantity), categories for organizing products, orders with order items, and customers with shipping addresses',
    icon: '🛒',
    tables: 5,
    category: 'Business'
  },
  {
    id: 'crm',
    name: 'CRM System',
    description: 'Customer relationship management with contacts and deals',
    prompt: 'Create a CRM system with contacts (name, email, phone, company), deals (amount, stage, expected close date), activities (notes, meetings, calls), and companies',
    icon: '🤝',
    tables: 4,
    category: 'Business'
  },
  {
    id: 'inventory',
    name: 'Inventory System',
    description: 'Products, warehouses, stock movements',
    prompt: 'Create an inventory system with products (SKU, name, description), warehouses (name, location, capacity), stock levels per warehouse, and stock movements (in/out transactions)',
    icon: '📦',
    tables: 4,
    category: 'Business'
  },
  {
    id: 'hr-system',
    name: 'HR Management',
    description: 'Employees, departments, salaries, leave requests',
    prompt: 'Create an HR system with employees (name, email, hire date), departments, salaries, leave requests (type, dates, status), and performance reviews',
    icon: '👔',
    tables: 5,
    category: 'Business'
  },

  // Content & Media
  {
    id: 'blog',
    name: 'Blog Platform',
    description: 'Posts, authors, categories, and comments',
    prompt: 'Create a blog platform with posts (title, content, published date), authors (name, email, bio), categories for organizing posts, and comments (author name, content) on posts',
    icon: '📝',
    tables: 4,
    category: 'Content'
  },
  {
    id: 'cms',
    name: 'Content Management',
    description: 'Pages, articles, media, and users',
    prompt: 'Create a CMS with pages (title, content, slug), articles (title, content, author, publish date), media files (name, type, size, URL), and user roles',
    icon: '📄',
    tables: 4,
    category: 'Content'
  },
  {
    id: 'social-media',
    name: 'Social Network',
    description: 'Users, posts, comments, likes, followers',
    prompt: 'Create a social network with users (username, bio, avatar), posts (content, image, timestamp), comments on posts, likes, and follower relationships',
    icon: '👥',
    tables: 5,
    category: 'Content'
  },

  // Education & Learning
  {
    id: 'learning-platform',
    name: 'Learning Platform',
    description: 'Courses, lessons, students, enrollments',
    prompt: 'Create a learning platform with courses (title, description, instructor), lessons (content, video URL, duration), students, enrollments, and progress tracking',
    icon: '🎓',
    tables: 5,
    category: 'Education'
  },
  {
    id: 'school-management',
    name: 'School Management',
    description: 'Students, teachers, classes, grades',
    prompt: 'Create a school management system with students (name, grade, enrollment date), teachers (name, subjects), classes (name, teacher, schedule), and grades',
    icon: '🏫',
    tables: 4,
    category: 'Education'
  },

  // Events & Booking
  {
    id: 'event-booking',
    name: 'Event Booking',
    description: 'Events, venues, bookings, attendees',
    prompt: 'Create an event booking system with events (name, date, location, capacity), venues (name, address, capacity), bookings (attendee info, tickets), and attendees',
    icon: '🎟️',
    tables: 4,
    category: 'Events'
  },
  {
    id: 'restaurant',
    name: 'Restaurant Management',
    description: 'Menu items, orders, tables, reservations',
    prompt: 'Create a restaurant management system with menu items (name, price, category), orders (table number, items, total), tables (number, capacity), and reservations',
    icon: '🍽️',
    tables: 4,
    category: 'Events'
  },

  // Project Management
  {
    id: 'project-management',
    name: 'Project Management',
    description: 'Projects, tasks, teams, assignments',
    prompt: 'Create a project management system with projects (name, description, deadline), tasks (title, description, status, priority), team members, and task assignments',
    icon: '📊',
    tables: 4,
    category: 'Productivity'
  },
  {
    id: 'task-management',
    name: 'Task Management',
    description: 'Tasks, projects, users, time tracking',
    prompt: 'Create a task management system with tasks (title, description, due date, priority), projects to organize tasks, users, and time tracking entries',
    icon: '✅',
    tables: 4,
    category: 'Productivity'
  },

  // Finance & Analytics
  {
    id: 'expense-tracker',
    name: 'Expense Tracker',
    description: 'Expenses, categories, budgets, reports',
    prompt: 'Create an expense tracker with expenses (amount, description, date, category), categories, budgets (monthly limits), and expense reports',
    icon: '💰',
    tables: 4,
    category: 'Finance'
  },
  {
    id: 'analytics',
    name: 'Analytics Dashboard',
    description: 'Events, metrics, users, reports',
    prompt: 'Create an analytics system with events (name, user, timestamp, properties), metrics (name, value, date), users, and custom reports',
    icon: '📈',
    tables: 4,
    category: 'Finance'
  }
]

interface AISchemaTemplatesProps {
  onSelectTemplate: (prompt: string) => void
  selectedCategory?: string
}

export function AISchemaTemplates({ onSelectTemplate, selectedCategory }: AISchemaTemplatesProps) {
  const categories = Array.from(new Set(templates.map(t => t.category)))

  const filteredTemplates = selectedCategory
    ? templates.filter(t => t.category === selectedCategory)
    : templates

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={!selectedCategory ? "default" : "outline"}
          size="sm"
          onClick={() => onSelectTemplate('')} // This would be handled by parent
        >
          All ({templates.length})
        </Button>
        {categories.map(category => {
          const count = templates.filter(t => t.category === category).length
          return (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectTemplate('')} // This would be handled by parent
            >
              {category} ({count})
            </Button>
          )
        })}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onSelectTemplate(template.prompt)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{template.icon}</span>
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {template.category}
                    </Badge>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {template.tables} tables
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm mb-3">
                {template.description}
              </CardDescription>
              <Button
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectTemplate(template.prompt)
                }}
              >
                Use Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No templates found
            </h3>
            <p className="text-gray-600">
              Try selecting a different category or check back later for more templates.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Export templates for use in other components
export { templates }
export type { Template }