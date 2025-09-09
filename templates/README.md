# Pixel Pilot Email Templates

A collection of professional, responsive email templates for Pixel Pilot's AI-powered app development platform. These templates are designed to work across all major email clients and feature Pixel Pilot's branding with a modern, clean design.

## 📧 Available Templates

### 1. Professional Email Template (`professional-email-template.html`)
A versatile base template that can be customized for various email types. Perfect for transactional emails, announcements, and marketing communications.

### 2. Welcome Email (`welcome-email.html`)
A comprehensive welcome email template for new users, featuring:
- Personalized greeting
- Account setup guide
- Feature highlights
- Quick start instructions
- Call-to-action buttons

### 3. Feature Announcement (`feature-announcement-email.html`)
Designed for announcing new features or product updates, including:
- Feature showcase with icons
- Step-by-step usage guide
- Benefits highlighting
- Documentation links

### 4. Newsletter (`newsletter-email.html`)
A monthly newsletter template featuring:
- Multiple feature highlights
- Community spotlight
- Pro tips section
- Upcoming events
- Social proof elements

## 🎨 Design Features

### Branding
- **Logo**: Pixel Pilot logo with gradient background
- **Colors**: Blue (#3b82f6) to Purple (#8b5cf6) to Cyan (#06b6d4) gradient
- **Typography**: System fonts for better email client compatibility
- **Icons**: Emojis and simple graphics for visual interest

### Responsive Design
- **Mobile-first**: Optimized for mobile devices
- **Email client compatibility**: Works in Outlook, Gmail, Apple Mail, etc.
- **Dark mode support**: Adapts to user's color scheme preference
- **Inline CSS**: For better email client rendering

### Technical Features
- **Table-based layout**: For maximum email client compatibility
- **MSO conditionals**: Special handling for Microsoft Outlook
- **Accessibility**: Proper alt text, semantic markup, and contrast ratios
- **Performance**: Optimized images and minimal external dependencies

## 🔧 Customization Guide

### Placeholders to Replace

#### Global Placeholders (used across all templates)
```
{{LOGO_URL}} - URL to Pixel Pilot logo (e.g., https://your-domain.com/logo.svg)
{{USER_NAME}} - Recipient's name
{{USER_EMAIL}} - Recipient's email address
{{CURRENT_YEAR}} - Current year (e.g., 2024)
{{WEBSITE_URL}} - Main website URL
{{BLOG_URL}} - Blog URL
{{SUPPORT_URL}} - Support page URL
{{UNSUBSCRIBE_URL}} - Unsubscribe page URL
```

#### Welcome Email Specific
```
{{GREETING}} - Personalized greeting
{{SUBTITLE}} - Subtitle under greeting
{{HERO_TITLE}} - Main hero section title
{{HERO_CONTENT}} - Hero section content
{{MAIN_CONTENT}} - Main body content
{{FEATURES_TITLE}} - Features section title
{{FEATURE_1_TITLE}} - First feature title
{{FEATURE_1_DESCRIPTION}} - First feature description
{{FEATURE_2_TITLE}} - Second feature title
{{FEATURE_2_DESCRIPTION}} - Second feature description
{{FEATURE_3_TITLE}} - Third feature title
{{FEATURE_3_DESCRIPTION}} - Third feature description
{{CTA_TEXT}} - Call-to-action button text
{{CTA_SUBTEXT}} - Text under CTA button
{{ADDITIONAL_TITLE}} - Additional section title
{{ADDITIONAL_CONTENT}} - Additional section content
```

#### Feature Announcement Specific
```
{{FEATURE_NAME}} - Name of the new feature
{{FEATURE_HEADLINE}} - Feature headline
{{FEATURE_DESCRIPTION}} - Feature description
{{FEATURE_DETAILS_INTRO}} - Introduction to feature details
{{BENEFIT_1_TITLE}} - First benefit title
{{BENEFIT_1_DESCRIPTION}} - First benefit description
{{BENEFIT_2_TITLE}} - Second benefit title
{{BENEFIT_2_DESCRIPTION}} - Second benefit description
{{BENEFIT_3_TITLE}} - Third benefit title
{{BENEFIT_3_DESCRIPTION}} - Third benefit description
{{BENEFIT_4_TITLE}} - Fourth benefit title
{{BENEFIT_4_DESCRIPTION}} - Fourth benefit description
{{FEATURE_IMPACT}} - Feature impact statement
{{STEP_1_TITLE}} - First usage step title
{{STEP_1_DESCRIPTION}} - First usage step description
{{STEP_2_TITLE}} - Second usage step title
{{STEP_2_DESCRIPTION}} - Second usage step description
{{STEP_3_TITLE}} - Third usage step title
{{STEP_3_DESCRIPTION}} - Third usage step description
{{TRY_FEATURE_URL}} - URL to try the feature
{{FEATURE_DOCS_URL}} - URL to feature documentation
{{ROADMAP_CONTENT}} - Upcoming features content
```

#### Newsletter Specific
```
{{MONTH_YEAR}} - Current month and year (e.g., December 2024)
{{MONTHLY_THEME}} - Newsletter theme for the month
{{THEME_DESCRIPTION}} - Description of the monthly theme
{{NEWSLETTER_INTRO}} - Newsletter introduction
{{FEATURE_1_ICON}} - Icon for first feature (emoji)
{{FEATURE_1_TITLE}} - First feature title
{{FEATURE_1_DESCRIPTION}} - First feature description
{{FEATURE_1_LINK}} - Link to first feature
{{FEATURE_2_ICON}} - Icon for second feature
{{FEATURE_2_TITLE}} - Second feature title
{{FEATURE_2_DESCRIPTION}} - Second feature description
{{FEATURE_2_LINK}} - Link to second feature
{{FEATURE_3_ICON}} - Icon for third feature
{{FEATURE_3_TITLE}} - Third feature title
{{FEATURE_3_DESCRIPTION}} - Third feature description
{{FEATURE_3_LINK}} - Link to third feature
{{SPOTLIGHT_PROJECT_TITLE}} - Community spotlight project title
{{SPOTLIGHT_PROJECT_DESCRIPTION}} - Spotlight project description
{{SPOTLIGHT_CREATOR}} - Spotlight project creator name
{{SHOWCASE_LINK}} - Link to submit projects for showcase
{{TIP_TITLE}} - Pro tip title
{{TIP_CONTENT}} - Pro tip content
{{CTA_TEXT}} - Call-to-action button text
{{CTA_SUBTEXT}} - Text under CTA button
{{UPCOMING_1}} - First upcoming item
{{UPCOMING_2}} - Second upcoming item
{{UPCOMING_3}} - Third upcoming item
```

## 🚀 Usage Instructions

### 1. Choose a Template
Select the appropriate template based on your email type:
- Welcome emails → `welcome-email.html`
- Feature announcements → `feature-announcement-email.html`
- Monthly newsletters → `newsletter-email.html`
- General communications → `professional-email-template.html`

### 2. Customize Content
Replace all placeholders with your specific content:
```bash
# Example for welcome email
sed -i 's/{{USER_NAME}}/John Doe/g' welcome-email.html
sed -i 's/{{GREETING}}/Welcome to Pixel Pilot!/g' welcome-email.html
```

### 3. Update URLs
Replace placeholder URLs with your actual URLs:
```bash
# Update logo and main URLs
sed -i 's|https://your-domain.com/logo.svg|https://pixelpilot.dev/logo.svg|g' *.html
sed -i 's|https://pixelpilot.dev|https://your-actual-domain.com|g' *.html
```

### 4. Test Email
Before sending, test your email in:
- **Email clients**: Gmail, Outlook, Apple Mail
- **Mobile devices**: iOS Mail, Android Gmail
- **Webmail**: Yahoo, Hotmail
- **Email testing tools**: Litmus, Email on Acid

## 📱 Email Client Compatibility

### Supported Clients
- ✅ Gmail (Web & Mobile)
- ✅ Outlook (Web, Desktop, Mobile)
- ✅ Apple Mail (macOS & iOS)
- ✅ Yahoo Mail
- ✅ Thunderbird
- ✅ Windows Mail

### Features Tested
- Responsive design
- Dark mode support
- Image rendering
- Link functionality
- Button styling
- Font fallbacks

## 🎯 Best Practices

### Content Guidelines
1. **Keep it concise**: Aim for 200-400 words
2. **Strong subject lines**: Personalize and create urgency
3. **Clear CTAs**: Use action-oriented button text
4. **Mobile-first**: Test on mobile devices first
5. **Brand consistency**: Maintain Pixel Pilot's voice and tone

### Technical Best Practices
1. **Inline CSS**: Use inline styles for email compatibility
2. **Table layouts**: Use tables for layout structure
3. **Alt text**: Include descriptive alt text for images
4. **Fallback fonts**: Use web-safe font stacks
5. **Test rendering**: Test in multiple email clients

### Compliance
- **CAN-SPAM**: Include physical mailing address
- **GDPR**: Clear unsubscribe links and data usage
- **Accessibility**: Proper contrast ratios and semantic markup

## 🔧 Development Notes

### File Structure
```
templates/
├── professional-email-template.html  # Base template
├── welcome-email.html               # Welcome email
├── feature-announcement-email.html  # Feature announcements
├── newsletter-email.html            # Monthly newsletter
└── README.md                        # This documentation
```

### CSS Classes Used
- `.mobile-wrapper`: Responsive container
- `.mobile-padding`: Mobile-specific padding
- `.mobile-text-center`: Mobile text alignment
- `.dark-mode-bg/text/border`: Dark mode support

### Customization Tips
1. **Colors**: Update gradient values in header section
2. **Fonts**: Modify font-family in body styles
3. **Spacing**: Adjust padding values for different layouts
4. **Icons**: Replace emoji icons with custom images if needed

## 📞 Support

For questions about these templates:
- **Email**: hello@pixelpilot.dev
- **Documentation**: Check the main project README
- **Issues**: Create an issue in the project repository

---

**Pixel Pilot** - Build amazing apps with AI-powered development.
