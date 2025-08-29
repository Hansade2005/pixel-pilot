# Project Management Page

The Project Management page provides a comprehensive interface for managing your Vercel projects, Netlify sites, deployments, and environment variables.

## Features

### 1. Overview Tab
- **Project Cards**: View all your projects with their deployment status
- **Platform Indicators**: See which platform each project is deployed on (Vercel/Netlify)
- **Quick Access**: Direct links to visit your live sites
- **Status Overview**: View the latest deployment status for each project

### 2. Deployments Tab
- **Trigger New Deployments**: Deploy specific commits or branches
- **Git Integration**: Use commit SHA or branch names for targeted deployments
- **Environment Selection**: Choose production, preview, or development environments
- **Rollback Capability**: Rollback failed or problematic deployments
- **Deployment History**: View all deployments with their status and details

### 3. Environment Variables Tab
- **Add Variables**: Create new environment variables for your projects
- **Secure Storage**: Mark variables as secrets for sensitive data
- **Environment Scoping**: Set variables for specific environments (production/preview/development)
- **Platform Sync**: Automatically sync variables with Vercel and Netlify
- **Easy Management**: Update or delete variables as needed

### 4. GitHub Tab
- **Repository Overview**: View all your connected GitHub repositories
- **Commit Information**: See the latest commits and their messages
- **Branch Management**: View default branches and repository details
- **Direct Access**: Quick links to your GitHub repositories

## How to Access

### From Workspace
1. **Sidebar Button**: Click the "Manage Projects" button in the left sidebar
2. **Status Bar**: Use the "Manage" button in the bottom status bar
3. **User Menu**: Access via the user dropdown menu → "Project Management"

### Direct URL
Navigate to `/workspace/management` in your browser

## Usage Examples

### Triggering a Deployment
1. Go to the **Deployments** tab
2. Enter either:
   - **Commit SHA**: Specific commit hash (e.g., `abc123...`)
   - **Branch Name**: Branch to deploy (e.g., `main`, `develop`)
3. Select the target environment
4. Click "Deploy [Project Name]"

### Adding Environment Variables
1. Go to the **Environment** tab
2. Fill in the form:
   - **Key**: Variable name (e.g., `API_KEY`)
   - **Value**: Variable value
   - **Environment**: Target environment
   - **Secret**: Check if it's sensitive data
3. Click "Add to [Project Name]"

### Rolling Back a Deployment
1. Go to the **Deployments** tab
2. Find the deployment you want to rollback
3. Click the "Rollback" button (only available for successful deployments)

## Data Storage

The management page uses **IndexedDB** for local data storage, making it completely offline-capable and reducing external dependencies.

### Storage Structure
- **Projects**: Project information, deployment URLs, and metadata
- **Deployments**: Deployment history, status, and commit information
- **Environment Variables**: Secure storage of configuration variables

### Data Management Features
- **Export Data**: Download all data as JSON for backup
- **Clear All Data**: Reset the management system
- **Sample Data**: Automatic creation of sample projects for testing

## Security Features

- **Local Storage**: All data is stored locally in the browser's IndexedDB
- **No External Dependencies**: Completely offline-capable management system
- **Data Privacy**: Your deployment data never leaves your browser
- **Environment Isolation**: Variables are scoped to specific environments

## Platform Support

### Vercel
- Deployment triggering via GitHub integration
- Environment variable management
- Rollback functionality
- Status monitoring

### Netlify
- Site deployment management
- Environment variable configuration
- Deployment rollback
- Site status tracking

### GitHub
- Repository listing and management
- Commit information display
- Branch management
- Integration with deployment workflows

## Troubleshooting

### Common Issues

1. **Data Not Loading**
   - Refresh the page to reload from IndexedDB
   - Check browser console for IndexedDB errors
   - Ensure IndexedDB is enabled in your browser

2. **Sample Data Not Appearing**
   - Wait for the page to fully load
   - Check if IndexedDB is properly initialized
   - Try refreshing the page

3. **Export/Import Issues**
   - Ensure you have sufficient disk space
   - Check browser permissions for file downloads
   - Verify JSON file format for imports

### Getting Help

- Check the browser console for IndexedDB error messages
- Verify IndexedDB is enabled in your browser settings
- Try clearing browser data and refreshing
- Check browser compatibility (Chrome, Firefox, Safari, Edge)

## Future Enhancements

- **Real-time Updates**: Live deployment status updates
- **Advanced Filtering**: Filter projects by platform, status, or date
- **Bulk Operations**: Manage multiple projects simultaneously
- **Analytics**: Deployment performance metrics
- **Data Synchronization**: Cloud backup and sync capabilities
- **Import Functionality**: Import data from JSON files
- **Offline Mode**: Enhanced offline capabilities
