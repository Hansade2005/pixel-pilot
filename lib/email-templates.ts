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

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Load email templates from JSON file
 */
function loadEmailTemplatesFromFile(): EmailTemplatesData {
  if (templatesCache !== null) {
    return templatesCache;
  }

  try {
    const templatesPath = join(process.cwd(), 'data', 'email-templates.json');
    const templatesData = readFileSync(templatesPath, 'utf-8');
    templatesCache = JSON.parse(templatesData) as EmailTemplatesData;
    return templatesCache;
  } catch (error) {
    console.error('Error loading email templates from file:', error);
    // Return empty data structure as fallback
    return {
      templates: [],
      categories: []
    };
  }
}

/**
 * Load email templates from API (fallback)
 */
export async function loadEmailTemplates(): Promise<EmailTemplatesData> {
  // Try to load from file first (works in server-side contexts)
  if (typeof window === 'undefined') {
    return loadEmailTemplatesFromFile();
  }

  // In browser, try API call
  if (templatesCache !== null) {
    return templatesCache;
  }

  try {
    const response = await fetch('/api/email/templates');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to load templates');
    }
    templatesCache = data.data as EmailTemplatesData;
    return templatesCache;
  } catch (error) {
    console.error('Error loading email templates from API:', error);
    // Return empty data structure as fallback
    return {
      templates: [],
      categories: []
    };
  }
}

/**
 * Get templates by category
 */
export async function getTemplatesByCategory(categoryId: string): Promise<EmailTemplate[]> {
  const data = await loadEmailTemplates();
  return data.templates.filter(template => template.category === categoryId);
}

/**
 * Get template by ID
 */
export async function getTemplateById(templateId: string): Promise<EmailTemplate | null> {
  const data = await loadEmailTemplates();
  return data.templates.find(template => template.id === templateId) || null;
}

/**
 * Get all categories
 */
export async function getEmailCategories(): Promise<EmailCategory[]> {
  const data = await loadEmailTemplates();
  return data.categories;
}

/**
 * Get all templates
 */
export async function getAllTemplates(): Promise<EmailTemplate[]> {
  const data = await loadEmailTemplates();
  return data.templates;
}

/**
 * Search templates by query
 */
export async function searchTemplates(query: string): Promise<EmailTemplate[]> {
  const data = await loadEmailTemplates();
  const lowercaseQuery = query.toLowerCase();

  return data.templates.filter(template =>
    template.name.toLowerCase().includes(lowercaseQuery) ||
    template.description.toLowerCase().includes(lowercaseQuery) ||
    template.subject.toLowerCase().includes(lowercaseQuery) ||
    template.category.toLowerCase().includes(lowercaseQuery)
  );
}

/**
 * Validate template variables in content
 */
export function validateTemplateVariables(template: EmailTemplate): {
  isValid: boolean;
  missingVariables: string[];
  extraVariables: string[];
} {
  const contentVariables = template.content.match(/\{\{(\w+)\}\}/g)?.map(match =>
    match.replace(/\{\{|\}\}/g, '')
  ) || [];

  const subjectVariables = template.subject.match(/\{\{(\w+)\}\}/g)?.map(match =>
    match.replace(/\{\{|\}\}/g, '')
  ) || [];

  const allContentVariables = [...new Set([...contentVariables, ...subjectVariables])];

  const missingVariables = template.variables.filter(variable =>
    !allContentVariables.includes(variable)
  );

  const extraVariables = allContentVariables.filter(variable =>
    !template.variables.includes(variable)
  );

  return {
    isValid: missingVariables.length === 0 && extraVariables.length === 0,
    missingVariables,
    extraVariables
  };
}