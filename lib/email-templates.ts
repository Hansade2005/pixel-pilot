import fs from 'fs';
import path from 'path';

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

/**
 * Load email templates from JSON file
 */
export function loadEmailTemplates(): EmailTemplatesData {
  if (templatesCache) {
    return templatesCache;
  }

  try {
    const templatesPath = path.join(process.cwd(), 'data', 'email-templates.json');
    const templatesData = fs.readFileSync(templatesPath, 'utf-8');
    templatesCache = JSON.parse(templatesData) as EmailTemplatesData;
    return templatesCache;
  } catch (error) {
    console.error('Error loading email templates:', error);
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
export function getTemplatesByCategory(categoryId: string): EmailTemplate[] {
  const data = loadEmailTemplates();
  return data.templates.filter(template => template.category === categoryId);
}

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): EmailTemplate | null {
  const data = loadEmailTemplates();
  return data.templates.find(template => template.id === templateId) || null;
}

/**
 * Get all categories
 */
export function getEmailCategories(): EmailCategory[] {
  const data = loadEmailTemplates();
  return data.categories;
}

/**
 * Get all templates
 */
export function getAllTemplates(): EmailTemplate[] {
  const data = loadEmailTemplates();
  return data.templates;
}

/**
 * Search templates by query
 */
export function searchTemplates(query: string): EmailTemplate[] {
  const data = loadEmailTemplates();
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