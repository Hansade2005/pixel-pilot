# Email Templates System

This document explains how to manage email templates in PiPilot's admin email system.

## Overview

Email templates are now stored in a JSON file (`data/email-templates.json`) instead of being hardcoded in the application. This makes it easy to add, modify, and manage email templates without touching the code.

## File Structure

The `email-templates.json` file contains two main sections:

### Templates Array
Each template object has the following structure:

```json
{
  "id": "unique-template-id",
  "name": "Human-readable template name",
  "type": "email-type",
  "subject": "Email subject with {{variables}}",
  "content": "Email content with {{variables}}\n\nMultiple lines supported",
  "variables": ["array", "of", "variable", "names"],
  "category": "category-id",
  "description": "Brief description of the template"
}
```

### Categories Array
Each category object has the following structure:

```json
{
  "id": "unique-category-id",
  "name": "Human-readable category name",
  "description": "Brief description of the category",
  "icon": "emoji-icon"
}
```

## Adding New Templates

### Step 1: Choose or Create a Category

Check existing categories in the `categories` array. If you need a new category, add it:

```json
{
  "id": "new-category",
  "name": "New Category",
  "description": "Description of the new category",
  "icon": "🎯"
}
```

### Step 2: Add the Template

Add your template to the `templates` array:

```json
{
  "id": "my-new-template",
  "name": "My New Template",
  "type": "notification",
  "subject": "Hello {{name}}!",
  "content": "Dear {{name}},\n\nThis is a {{type}} email about {{topic}}.\n\n{{content}}\n\nBest regards,\nThe PiPilot Team",
  "variables": ["name", "type", "topic", "content"],
  "category": "new-category",
  "description": "A template for sending personalized notifications"
}
```

### Step 3: Test the Template

Run the template test to ensure everything is working:

```bash
node test-email-templates-simple.js
```

## Template Variables

Variables in templates use the `{{variableName}}` syntax. They can be used in both subject and content.

### Common Variables

- `{{name}}` - Recipient's name
- `{{email}}` - Recipient's email
- `{{content}}` - Main email content
- `{{action_url}}` - Link for actions (reset password, verify email, etc.)
- `{{support_url}}` - Link to support/contact
- `{{unsubscribe_url}}` - Unsubscribe link (for marketing emails)

### Variable Validation

The system validates that all variables used in subject/content are declared in the `variables` array. Missing or extra variables will be flagged during validation.

## Email Types

Templates support different email types that affect how they're processed:

- `notification` - General notifications
- `marketing` - Promotional content (includes unsubscribe links)
- `newsletter` - Regular updates
- `security` - Security alerts and account protection
- `feature` - New feature announcements
- `billing` - Payment and subscription related
- `support` - Customer support responses
- `welcome` - Welcome messages for new users
- `team` - Team collaboration emails

## Categories

Templates are organized into categories for easy filtering:

- **Onboarding** 👋 - Welcome and setup emails
- **Product** 🚀 - Feature announcements and updates
- **Security** 🔒 - Security alerts and account protection
- **Billing** 💳 - Payment and subscription related
- **Marketing** 📢 - Promotional content and newsletters
- **Team** 👥 - Team collaboration and invitations
- **Support** 🆘 - Customer support communications
- **System** ⚙️ - System notifications and maintenance
- **General** 📧 - General notifications and updates

## Best Practices

### Template Design

1. **Keep it Simple**: Use clear, concise language
2. **Mobile-Friendly**: Templates should work well on mobile devices
3. **Consistent Branding**: Use consistent tone and branding
4. **Clear CTAs**: Include clear calls-to-action when needed

### Variable Usage

1. **Required Variables**: Always include essential variables like `{{name}}`
2. **Optional Variables**: Use defaults or conditionals for optional content
3. **Validation**: Test all variable combinations
4. **Documentation**: Document what each variable represents

### Content Guidelines

1. **Personalization**: Use recipient's name when possible
2. **Clear Subject Lines**: Make subject lines descriptive and actionable
3. **Proper Formatting**: Use proper line breaks and spacing
4. **Legal Compliance**: Include unsubscribe links for marketing emails

## Testing

### Automated Tests

Run the automated test suite:

```bash
node test-email-templates-simple.js
```

### Manual Testing

1. Access the admin email section
2. Navigate to the Templates tab
3. Select your category
4. Click the eye icon to preview your template
5. Click "Use Template" to test in the compose dialog

### Email Testing

Send test emails to verify:
- Variables are replaced correctly
- Links work properly
- Formatting displays correctly
- Mobile responsiveness

## Troubleshooting

### Common Issues

1. **Template Not Loading**: Check JSON syntax and file path
2. **Variables Not Working**: Ensure variables are declared in the `variables` array
3. **Category Not Showing**: Verify category ID matches in template
4. **Validation Errors**: Check for missing/extra variables

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG=email-templates node test-email-templates-simple.js
```

## Migration from PHP

### Before (PHP Templates)
```php
// Old PHP template system
$template = "Hello {name}, welcome to {site}!";
```

### After (JSON Templates)
```json
{
  "id": "welcome",
  "name": "Welcome Email",
  "subject": "Welcome to {{site}}!",
  "content": "Hello {{name}}, welcome to {{site}}!",
  "variables": ["name", "site"],
  "category": "onboarding"
}
```

### Benefits of JSON Templates

- ✅ **Version Control**: Templates are in git
- ✅ **Easy Editing**: No code changes required
- ✅ **Validation**: Automatic structure validation
- ✅ **Organization**: Categorized and searchable
- ✅ **Testing**: Automated test coverage
- ✅ **Documentation**: Self-documenting structure

## Support

For questions about email templates:

1. Check this documentation first
2. Review existing templates for examples
3. Test your changes with the test suite
4. Contact the development team for complex templates