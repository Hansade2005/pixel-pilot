# Custom Domain Hosting Platform Plan

## Overview
Build a comprehensive hosting platform that allows users to publish their projects and connect custom domains. The platform will leverage Vercel's infrastructure for domain management and SSL certificates while providing a seamless user experience for domain connection.

## Project Context
- **Vercel Project ID**: `prj_JFqriEOhgPe8TVrwSk5kjhgTdS9g`
- **Current Hosting**: Sites stored in Supabase Storage, served via Next.js API routes
- **Domain Support**: Already supports subdomains (siteId.pipilot.dev) and custom domains via database lookup
- **Vercel Integration**: REST API and SDK support for domain management
- **SSL Certificates**: Automatic certificate generation via Vercel

## Core Features

### 1. User Domain Management Interface
**Location**: `/sites/domains` or `/dashboard/domains`

#### Components Needed:
- **DomainInputForm**: Form for entering custom domain
- **DomainList**: Display user's connected domains with status
- **DNSInstructions**: Step-by-step DNS configuration guide
- **VerificationStatus**: Real-time verification checking
- **DomainActions**: Edit, delete, reverify domains

#### User Flow:
1. User navigates to domain management
2. Enters custom domain (e.g., `mywebsite.com`)
3. System adds domain to Vercel project via API
4. Displays DNS records needed for verification
5. User adds DNS records at their provider
6. System polls for verification status
7. Once verified, domain is connected and site is accessible

### 2. Backend API Integration

#### Existing APIs:
- `POST /api/vercel/projects/{projectId}/domains` - Add domain to Vercel (current implementation)
- `GET /api/vercel/projects/{projectId}/domains` - List project domains

#### Recommended Vercel SDK Integration:
```typescript
import { VercelCore as Vercel } from '@vercel/sdk/core.js';
import { projectsAddProjectDomain } from '@vercel/sdk/funcs/projectsAddProjectDomain.js';
import { projectsVerifyProjectDomain } from '@vercel/sdk/funcs/projectsVerifyProjectDomain.js';

const vercel = new Vercel({
  bearerToken: process.env.VERCEL_TOKEN,
});

// Add domain to project
await projectsAddProjectDomain(vercel, {
  idOrName: 'prj_JFqriEOhgPe8TVrwSk5kjhgTdS9g',
  requestBody: {
    name: 'customdomain.com',
  },
});

// Verify domain ownership
const verifyResponse = await projectsVerifyProjectDomain(vercel, {
  idOrName: 'prj_JFqriEOhgPe8TVrwSk5kjhgTdS9g',
  domain: 'customdomain.com',
});
```

#### New APIs Needed:
- `POST /api/sites/{siteId}/domains` - Add custom domain to site
- `GET /api/sites/{siteId}/domains` - List domains for site
- `DELETE /api/sites/{siteId}/domains/{domainId}` - Remove domain
- `POST /api/sites/{siteId}/domains/{domainId}/verify` - Manual verification check
- `POST /api/sites/{siteId}/domains/{domainId}/redirect` - Configure redirects (www ↔ apex)

#### Database Operations:
- Insert into `custom_domains` table when domain is added
- Update `verified` status when DNS verification completes
- Enforce domain ownership and site association

## DNS Configuration Strategy

#### Preferred Method: CNAME + A Records (Multi-tenant SaaS)
For apex domains (root domain like `example.com`):
```
Type: A
Name: @
Value: 216.198.79.1
```

For subdomains (`www.example.com`):
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

#### Alternative Method: Vercel Nameservers (Wildcard Support)
For wildcard domains (*.acme.com):
1. Point domain to Vercel's nameservers: `ns1.vercel-dns.com` and `ns2.vercel-dns.com`
2. Add apex domain (acme.com) to Vercel project
3. Add wildcard domain: `*.acme.com`

**Benefits of Nameserver Method:**
- Automatic SSL certificates for all subdomains
- No manual DNS record management per subdomain
- Better for high-volume multi-tenant applications

**Trade-offs:**
- Users must change nameservers (more complex)
- Less control over DNS (MX records, etc.)
- All DNS management goes through Vercel

#### Why Current Method (A + CNAME) is Preferred:
- **Multi-tenant friendly**: Users keep their DNS control
- **Easy onboarding**: Single CNAME record
- **No DNS takeover**: Less liability
- **Email preservation**: Doesn't break existing MX records
- **Scalable**: Works for thousands of tenants

#### Implementation:
- Detect if domain is apex or subdomain
- Provide appropriate DNS records
- Show clear instructions with copy-to-clipboard
- Validate DNS propagation

### 4. Domain Verification Process

#### Automated Verification:
- Poll Vercel API for verification status using `projectsVerifyProjectDomain`
- Update database when verified
- Send notifications to user

#### Manual Verification:
- Allow users to trigger verification checks
- Handle edge cases (DNS propagation delays)

#### TXT Record Verification:
For domains already in use on Vercel, users must add a TXT record:
```
Type: TXT
Name: _vercel
Value: vc-domain-verify={domain}.{verification-token}
```

#### Error Handling:
- Invalid domain format
- Domain already in use
- DNS misconfiguration
- Verification timeouts

### 5. Redirects and Domain Management

#### Apex vs WWW Redirects:
- Add both `domain.com` and `www.domain.com` to Vercel project
- Configure redirect: `www.domain.com` → `domain.com` (or vice versa)
- Prevents duplicate content issues

#### Subdomain to Custom Domain Redirects:
- If offering both `tenant.acme.com` and `customsite.com`
- Redirect subdomain to custom domain to avoid SEO duplicate content
- Or set canonical URLs in HTML `<head>`

#### Implementation:
- API endpoints for configuring redirects
- Automatic redirect setup for common patterns
- User choice between www and apex preferences

### 5. Security & Access Control

#### Authentication:
- Users can only manage domains for their own sites
- RLS policies on `custom_domains` table
- Vercel token management (server-side only)

#### Validation:
- Domain ownership verification
- Rate limiting on domain additions
- Prevent subdomain takeover attacks

### 6. User Experience Enhancements

#### Progressive Disclosure:
- Simple domain input initially
- Expand to show DNS instructions after submission
- Status indicators (pending, verifying, verified, failed)

#### Real-time Updates:
- WebSocket or polling for verification status
- Email notifications for verification completion

#### Error Recovery:
- Clear error messages with actionable steps
- Retry mechanisms for failed verifications
- Support contact for complex issues

### 7. Technical Implementation Plan

#### Vercel SDK Integration
- Replace REST API calls with official Vercel SDK
- Use `@vercel/sdk` for domain management operations
- Implement proper error handling for SDK responses
- Add retry logic for API rate limits

#### Wildcard Domain Support
- Option for tenants to use Vercel nameservers
- Automatic SSL for all subdomains (*.tenant.com)
- Simplified onboarding for high-volume use cases
- Fallback to A/CNAME method for standard users

#### Phase 1: Core Domain Addition
1. Create domain management UI components
2. Implement domain addition API with Vercel SDK
3. Add DNS instruction display (A/CNAME vs Nameserver methods)
4. Basic verification status tracking

#### Phase 2: Advanced Features
1. Automated verification polling
2. Bulk domain management
3. Domain analytics/metrics
4. SSL certificate status monitoring
5. Redirect configuration (www ↔ apex)
6. Wildcard domain support for high-volume tenants

#### Phase 3: Enterprise Features
1. Domain aliases/redirects
2. Custom SSL certificates
3. Domain transfer assistance
4. Advanced DNS management
5. Multi-domain support per site

### 8. Database Schema Extensions

Current `custom_domains` table:
```sql
- id (UUID, PK)
- domain (TEXT, UNIQUE)
- site_id (TEXT)
- user_id (UUID, FK)
- verified (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

Potential additions:
```sql
- verification_attempts (INTEGER)
- last_verification_check (TIMESTAMP)
- dns_records (JSONB) -- Store required DNS records
- verification_errors (JSONB) -- Store verification failures
```

### 9. Integration Points

#### With Existing Systems:
- **Site Builder**: Link domains to specific sites
- **Analytics**: Track domain performance
- **Billing**: Domain management as premium feature
- **Notifications**: Domain verification alerts

#### External Services:
- **Vercel API**: Domain management and SSL
- **DNS Providers**: Integration with major providers (GoDaddy, Namecheap, Cloudflare)
- **Email Service**: Domain verification notifications

### 10. Success Metrics

#### User Metrics:
- Domain connection success rate
- Time to verification
- User satisfaction scores

#### Technical Metrics:
- API response times
- Verification success rates
- DNS propagation monitoring

#### Business Metrics:
- Premium feature adoption
- Revenue from domain services
- Customer retention impact

## Implementation Timeline

### Week 1-2: Foundation
- Create domain management UI
- Implement basic domain addition
- Set up DNS instruction display

### Week 3-4: Verification
- Add automated verification polling
- Implement error handling
- Add user notifications

### Week 5-6: Polish & Testing
- UI/UX improvements
- Comprehensive testing
- Documentation

### Week 7-8: Launch & Monitor
- Beta testing with users
- Performance monitoring
- Feature iteration based on feedback

## Risk Mitigation

### Technical Risks:
- DNS propagation delays
- Vercel API rate limits
- Domain verification failures

### Business Risks:
- Users struggling with DNS configuration
- Support burden for domain issues
- Competition from established platforms

### Mitigation Strategies:
- Clear documentation and guided setup
- Automated DNS checking tools
- Comprehensive support resources
- Gradual feature rollout

### 10. Troubleshooting Common Issues

#### DNS Propagation Delays
- Changes can take 24-48 hours to propagate globally
- Use tools like WhatsMyDNS to check worldwide propagation
- Advise users to wait before contacting support

#### Domain Verification Issues
- **Missing TXT records**: Users forget to add verification records
- **Wrong TXT values**: Copy-paste errors in record values
- **DNS caching**: Old records still cached
- **Solution**: Clear instructions, validation, manual retry options

#### Wildcard Domain Setup
- Requires Vercel nameservers (ns1.vercel-dns.com, ns2.vercel-dns.com)
- Apex domain must be added first
- SSL certificates generated automatically for subdomains

#### SSL Certificate Issues
- Certificates not issued for unverified domains
- Wildcard certificates require nameserver delegation
- Mixed content warnings if site loads insecure resources

#### Subdomain Length Limits
- DNS labels limited to 63 characters
- Long branch names + tenant subdomains can exceed limits
- Keep naming conventions concise

#### SEO and Duplicate Content
- Same site served from multiple domains
- Use canonical tags: `<link rel="canonical" href="https://primary-domain.com">`
- Configure redirects to prevent duplicate indexing

#### Domain Spelling Errors
- Typos block verification and routing
- Implement domain validation before submission
- Show preview of domain before adding

#### Existing Domain Conflicts
- Domain already associated with another Vercel project
- Requires ownership verification via TXT records
- Clear error messages explaining next steps

## Conclusion

This comprehensive plan establishes a production-ready custom domain hosting platform that leverages Vercel's enterprise-grade infrastructure. By supporting both traditional A/CNAME DNS configuration and advanced wildcard domains with Vercel nameservers, we can cater to different tenant needs while maintaining security, scalability, and ease of use.

The platform integrates seamlessly with our existing site builder, providing users with professional domain management capabilities that enhance their published sites' credibility and SEO performance. Following Vercel's best practices for multi-tenant applications ensures reliable SSL certificates, automatic domain verification, and robust redirect handling.