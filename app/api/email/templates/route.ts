import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  content: string;
  variables: string[];
  category: string;
  description: string;
}

export interface EmailCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface EmailTemplatesData {
  templates: EmailTemplate[];
  categories: EmailCategory[];
}

let templatesCache: EmailTemplatesData | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load email templates from JSON file with Vercel-like caching strategy
 * - Server-side only (never called from client)
 * - Cached for performance
 * - Automatic cache invalidation
 * - Type-safe data loading
 */
function loadEmailTemplates(): EmailTemplatesData {
  // Check if cache is still valid
  if (templatesCache && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return templatesCache;
  }

  try {
    const templatesPath = join(process.cwd(), 'data', 'email-templates.json');

    // Validate file exists before reading
    if (!existsSync(templatesPath)) {
      console.error('Email templates file not found:', templatesPath);
      return getFallbackData();
    }

    const templatesData = readFileSync(templatesPath, 'utf-8');

    // Validate JSON structure
    const parsed = JSON.parse(templatesData) as EmailTemplatesData;

    // Basic validation
    if (!parsed.templates || !Array.isArray(parsed.templates)) {
      console.error('Invalid templates data structure');
      return getFallbackData();
    }

    if (!parsed.categories || !Array.isArray(parsed.categories)) {
      console.error('Invalid categories data structure');
      return getFallbackData();
    }

    // Update cache
    templatesCache = parsed;
    cacheTimestamp = Date.now();

    console.log(`Loaded ${parsed.templates.length} templates and ${parsed.categories.length} categories`);

    return parsed;

  } catch (error) {
    console.error('Error loading email templates:', error);
    return getFallbackData();
  }
}

/**
 * Get fallback data when loading fails
 * Provides minimal working data structure
 */
function getFallbackData(): EmailTemplatesData {
  return {
    templates: [],
    categories: []
  };
}

/**
 * Get all email templates
 */
export function getAllTemplates(): EmailTemplate[] {
  return loadEmailTemplates().templates;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): EmailTemplate[] {
  return loadEmailTemplates().templates.filter(template => template.category === category);
}

/**
 * Get all email categories
 */
export function getEmailCategories(): EmailCategory[] {
  return loadEmailTemplates().categories;
}

/**
 * Search templates by query
 */
export function searchTemplates(query: string): EmailTemplate[] {
  const templates = loadEmailTemplates().templates;
  const lowerQuery = query.toLowerCase();

  return templates.filter(template =>
    template.name.toLowerCase().includes(lowerQuery) ||
    template.description.toLowerCase().includes(lowerQuery) ||
    template.subject.toLowerCase().includes(lowerQuery) ||
    template.content.toLowerCase().includes(lowerQuery) ||
    template.variables.some(variable => variable.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): EmailTemplate | undefined {
  return loadEmailTemplates().templates.find(template => template.id === id);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const templatesData = loadEmailTemplates();

    switch (action) {
      case 'categories':
        return NextResponse.json({
          success: true,
          data: templatesData.categories
        });

      case 'search':
        const query = searchParams.get('q') || '';
        const searchResults = searchTemplates(query);
        return NextResponse.json({
          success: true,
          data: searchResults
        });

      case 'by-category':
        const category = searchParams.get('category') || '';
        const categoryResults = getTemplatesByCategory(category);
        return NextResponse.json({
          success: true,
          data: categoryResults
        });

      case 'template':
        const templateId = searchParams.get('id');
        if (!templateId) {
          return NextResponse.json(
            { success: false, error: 'Template ID is required' },
            { status: 400 }
          );
        }
        const template = getTemplateById(templateId);
        if (!template) {
          return NextResponse.json(
            { success: false, error: 'Template not found' },
            { status: 404 }
          );
        }
        return NextResponse.json({
          success: true,
          data: template
        });

      default:
        return NextResponse.json({
          success: true,
          data: templatesData
        });
    }
  } catch (error) {
    console.error('Error in email templates API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load email templates' },
      { status: 500 }
    );
  }
}