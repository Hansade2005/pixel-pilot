# PiPilot Deployment Setup

## Overview
PiPilot allows you to deploy your projects directly to Cloudflare Pages with a custom subdomain on `.pages.dev`.

## Configuration Required

### 1. Cloudflare API Credentials
To enable PiPilot deployment, you need to configure Cloudflare API credentials:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Create a new API token with the following permissions:
   - **Zone:Zone:Read** (for your domain)
   - **Zone:Page Rules:Edit** (for Pages)
   - **Account:Cloudflare Pages:Edit** (for Pages deployment)
3. Get your Account ID from the right sidebar of any Cloudflare zone dashboard

### 2. Environment Variables
Add the following to your `.env.local` file:

```bash
# Cloudflare API for PiPilot deployment
CF_ACCOUNT_ID="your_cloudflare_account_id"
CF_API_TOKEN="your_cloudflare_api_token"
```

## How PiPilot Works

1. **Build Process**: Your project is built using npm/yarn in an E2B sandbox
2. **Compression**: The built files are compressed into a ZIP archive
3. **Project Creation**: If needed, a new Cloudflare Pages project is created
4. **Deployment**: The ZIP is uploaded to Cloudflare Pages via their API
5. **URL Generation**: You get a live URL at `project-name.pages.dev`

## Error Handling

The system provides specific error messages for common issues:

- **Configuration Error**: Missing Cloudflare credentials
- **Authentication Error**: Invalid API token
- **Permission Error**: API token lacks required permissions
- **Project Conflict**: Project name already exists

## Troubleshooting

### "Configuration Error"
- Ensure `CF_ACCOUNT_ID` and `CF_API_TOKEN` are set in your environment
- Copy the example from `.env.example` to `.env.local`

### "Authentication Failed"
- Verify your API token is correct and hasn't expired
- Check that the token has the required permissions

### "Access Denied"
- Ensure your API token has Pages deployment permissions
- Verify the Account ID belongs to your Cloudflare account

## Security Notes

- API credentials are read from environment variables only
- Never commit real credentials to source control
- Use `.env.local` for local development
- Set environment variables in your deployment platform