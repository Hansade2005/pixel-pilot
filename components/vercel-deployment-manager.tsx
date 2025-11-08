'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  Rocket, 
  Globe, 
  Settings, 
  History, 
  Terminal, 
  Plus, 
  Trash2, 
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  Upload,
  ShoppingCart,
  CreditCard,
  FolderOpen,
  GitBranch,
  Lightbulb,
  FileText,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { storageManager } from '@/lib/storage-manager';
import { createClient } from '@/lib/supabase/client';

interface VercelProject {
  projectId: string;
  projectName: string;
  url: string;
  status: string;
  framework?: string;
  teamId?: string; // Vercel team ID (required for some API operations)
  lastDeployed?: number;
}

interface Deployment {
  id: string;
  uid: string;
  url: string;
  status: string;
  state: string;
  readyState: string;
  created: number;
  createdAt: number;
  target: string;
  aliasAssigned?: number; // Timestamp when deployment was assigned to production alias
  isRollbackCandidate?: boolean;
  commit?: {
    sha: string;
    message: string;
    author: string;
  };
}

interface EnvVariable {
  id: string;
  key: string;
  type: string;
  target: string[];
  hasValue: boolean;
  createdAt: number;
}

interface Domain {
  name: string;
  verified: boolean;
  createdAt: number;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
  }>;
}

interface Workspace {
  id: string;
  name: string;
  githubRepoUrl?: string;
  vercelProjectId?: string;
  vercelDeploymentUrl?: string;
}

interface GitHubRepo {
  id: string;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
}

export function VercelDeploymentManager({ 
  workspaceId, 
  vercelToken, 
  githubToken 
}: { 
  workspaceId: string; 
  vercelToken?: string; 
  githubToken?: string; 
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [project, setProject] = useState<VercelProject | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [envVars, setEnvVars] = useState<EnvVariable[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDeploymentId, setCurrentDeploymentId] = useState<string | null>(null);
  
  // Workspace and repo selection
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedGithubRepo, setSelectedGithubRepo] = useState<string>('');
  
  // Form states
  const [projectName, setProjectName] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [framework, setFramework] = useState('auto-detect');
  const [showTokens, setShowTokens] = useState(false);
  const [localVercelToken, setLocalVercelToken] = useState(vercelToken || '');
  const [localGithubToken, setLocalGithubToken] = useState(githubToken || '');
  const [teamSlug, setTeamSlug] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);

  // Load workspaces and check for existing deployment
  useEffect(() => {
    loadWorkspaces();
    loadExistingVercelProject();
  }, [workspaceId]);

  // Load GitHub repos when token is available
  useEffect(() => {
    if (localGithubToken) {
      loadGithubRepos();
    }
  }, [localGithubToken]);

  // Fetch team slug when Vercel token is available
  useEffect(() => {
    if (localVercelToken) {
      fetchTeamSlug();
    }
  }, [localVercelToken]);

  // Refresh project details from Vercel API when project is loaded
  useEffect(() => {
    if (project?.projectId && localVercelToken) {
      refreshProjectDetails();
    }
  }, [project?.projectId, localVercelToken]);

  // Load existing Vercel project from storage
  const loadExistingVercelProject = async () => {
    try {
      await storageManager.init();
      const existingProject = await storageManager.getVercelProject(workspaceId);
      
      if (existingProject) {
        setProject({
          projectId: existingProject.projectId,
          projectName: existingProject.projectName,
          url: existingProject.url,
          status: existingProject.status,
          framework: existingProject.framework,
          lastDeployed: existingProject.lastDeployed,
        });
        
        // Load associated data
        const deployments = await storageManager.getVercelDeploymentsByWorkspace(workspaceId);
        setDeployments(deployments.map(d => ({
          id: d.deploymentId,
          uid: d.deploymentId, // Use deploymentId as fallback for uid
          url: d.url,
          status: d.status,
          state: d.status,
          readyState: d.status,
          created: d.createdAt,
          createdAt: d.createdAt,
          target: d.target,
          aliasAssigned: undefined, // Will be filled by API refresh
          isRollbackCandidate: undefined,
          commit: d.commit,
        })));
        
        // Load env vars if we have projectId
        if (existingProject.projectId) {
          const envVars = await storageManager.getVercelEnvVariables(existingProject.projectId);
          setEnvVars(envVars.map(e => ({
            id: e.envId,
            key: e.key,
            type: e.type,
            target: e.target,
            hasValue: e.hasValue,
            createdAt: e.createdAt,
          })));
          
          const domains = await storageManager.getVercelDomains(existingProject.projectId);
          setDomains(domains.map(d => ({
            name: d.name,
            verified: d.verified,
            createdAt: d.createdAt,
            verification: d.verification,
          })));
        }
      }
    } catch (err) {
      console.error('Failed to load existing Vercel project:', err);
    }
  };

  // Load workspaces
  const loadWorkspaces = async () => {
    try {
      await storageManager.init();
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const workspacesData = await storageManager.getWorkspaces(user.id);
        setWorkspaces(workspacesData);
        
        // Find and select the current workspace
        const currentWorkspace = workspacesData.find((w: Workspace) => w.id === workspaceId);
        if (currentWorkspace) {
          setSelectedWorkspace(currentWorkspace);
          
          // If workspace has existing Vercel project, load it
          if (currentWorkspace.vercelProjectId) {
            setProject({
              projectId: currentWorkspace.vercelProjectId,
              projectName: currentWorkspace.name,
              url: currentWorkspace.vercelDeploymentUrl || '',
              status: 'deployed',
              lastDeployed: Date.now(),
            });
          }
          
          // Pre-fill GitHub repo if available
          if (currentWorkspace.githubRepoUrl) {
            const repoPath = currentWorkspace.githubRepoUrl.split('github.com/')[1];
            if (repoPath) {
              setGithubRepo(repoPath);
              setSelectedGithubRepo(repoPath);
            }
          }
          
          // Auto-generate project name from workspace name
          if (!projectName) {
            const autoName = currentWorkspace.name.toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, '');
            setProjectName(autoName);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    }
  };

  // Load GitHub repositories
  const loadGithubRepos = async () => {
    if (!localGithubToken) return;
    
    setLoadingRepos(true);
    try {
      // Use internal API route to avoid CORS/401 issues when calling GitHub directly from browser
      const response = await fetch('/api/github/repos', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localGithubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (response.ok) {
        const repos = await response.json();
        setGithubRepos(repos);
      }
    } catch (err) {
      console.error('Failed to load GitHub repos:', err);
    } finally {
      setLoadingRepos(false);
    }
  };

  // Fetch team slug and ID from Vercel API
  const fetchTeamSlug = async () => {
    if (!localVercelToken) return;
    
    try {
      const response = await fetch('https://api.vercel.com/v2/teams', {
        headers: {
          'Authorization': `Bearer ${localVercelToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.teams && data.teams.length > 0) {
          // Use the first team's slug and ID
          const firstTeam = data.teams[0];
          setTeamSlug(firstTeam.slug);
          setTeamId(firstTeam.id);
          console.log('Team info:', { 
            slug: firstTeam.slug, 
            id: firstTeam.id,
            name: firstTeam.name 
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch team info:', err);
    }
  };

  // Create new project
  const createProject = async () => {
    if (!projectName || !githubRepo) {
      setError('Project name and GitHub repository are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/vercel/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          githubRepo,
          githubToken: localGithubToken,
          token: localVercelToken,
          workspaceId,
          framework: framework === 'auto-detect' ? undefined : framework,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      const newProject = {
        projectId: data.projectId,
        projectName: data.projectName,
        url: data.url,
        status: data.status,
        framework: data.framework,
        lastDeployed: Date.now(),
      };

      setProject(newProject);
      setCurrentDeploymentId(data.deploymentId);
      
      // Save to IndexedDB
      await storageManager.init();
      await storageManager.createVercelProject({
        workspaceId,
        projectId: data.projectId,
        projectName: data.projectName,
        url: data.url,
        status: data.status,
        framework: data.framework,
        githubRepo,
        lastDeployed: Date.now(),
      });
      
      // Also update the workspace with Vercel info
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const workspacesData = await storageManager.getWorkspaces(user.id);
        const currentWorkspace = workspacesData.find((w: Workspace) => w.id === workspaceId);
        if (currentWorkspace) {
          await storageManager.updateWorkspace(workspaceId, {
            vercelProjectId: data.projectId,
            vercelDeploymentUrl: data.url,
            deploymentStatus: 'in_progress',
          });
        }
      }
      
      // Start monitoring deployment
      if (data.deploymentId) {
        monitorDeployment(data.deploymentId);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Trigger redeployment
  const triggerDeploy = async () => {
    if (!project?.projectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/vercel/deployments/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.projectId,
          vercelToken: localVercelToken,
          workspaceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger deployment');
      }

      setCurrentDeploymentId(data.deploymentId);
      monitorDeployment(data.deploymentId);
      loadDeployments();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Monitor deployment status
  const monitorDeployment = async (deploymentId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await fetch(
          `/api/vercel/deployments/${deploymentId}/status?token=${localVercelToken}`
        );

        const data = await response.json();

        if (data.status === 'READY') {
          setProject(prev => prev ? { ...prev, status: 'deployed', lastDeployed: Date.now() } : null);
          
          // Update in storage
          await storageManager.init();
          const existingProject = await storageManager.getVercelProject(workspaceId);
          if (existingProject) {
            await storageManager.updateVercelProject(existingProject.id, {
              status: 'deployed',
              lastDeployed: Date.now(),
            });
          }
          
          loadLogs(deploymentId);
          return true;
        } else if (data.status === 'ERROR') {
          setError(`Deployment failed: ${data.errorMessage || 'Unknown error'}`);
          
          // Update in storage
          await storageManager.init();
          const existingProject = await storageManager.getVercelProject(workspaceId);
          if (existingProject) {
            await storageManager.updateVercelProject(existingProject.id, {
              status: 'error',
            });
          }
          
          return true;
        }

        return false;
      } catch (err) {
        console.error('Status check error:', err);
        return false;
      }
    };

    const interval = setInterval(async () => {
      attempts++;
      const isDone = await checkStatus();
      
      if (isDone || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 5000);

    // Also stream logs
    streamLogs(deploymentId);
  };

  // Stream deployment logs
  const streamLogs = (deploymentId: string) => {
    const eventSource = new EventSource(
      `/api/vercel/deployments/${deploymentId}/logs?token=${localVercelToken}&stream=true&follow=true`
    );

    eventSource.onmessage = async (event) => {
      try {
        const log = JSON.parse(event.data);
        const logMessage = `[${log.type}] ${log.message}`;
        setLogs(prev => [...prev, logMessage]);
        
        // Save log to storage
        try {
          await storageManager.init();
          await storageManager.createVercelLog({
            deploymentId,
            workspaceId,
            message: log.message,
            type: log.type,
            timestamp: Date.now(),
          });
        } catch (err) {
          // Ignore storage errors for logs
        }
      } catch (err) {
        console.error('Log parse error:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    // Close after 5 minutes
    setTimeout(() => eventSource.close(), 300000);
  };

  // Load logs
  const loadLogs = async (deploymentId: string) => {
    try {
      const response = await fetch(
        `/api/vercel/deployments/${deploymentId}/logs?token=${localVercelToken}&limit=100`
      );
      const data = await response.json();
      
      if (data.logs) {
        const logMessages = data.logs.map((log: any) => `[${log.type}] ${log.message}`);
        setLogs(logMessages);
        
        // Save to storage
        await storageManager.init();
        for (const log of data.logs) {
          try {
            await storageManager.createVercelLog({
              deploymentId,
              workspaceId,
              message: log.message,
              type: log.type,
              timestamp: log.timestamp || Date.now(),
            });
          } catch (err) {
            // Ignore duplicates
          }
        }
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  // Load deployments
  const loadDeployments = async () => {
    if (!project?.projectId) return;

    try {
      // First, fetch aliases to determine which deployment is in production
      const aliasesResponse = await fetch(
        `/api/vercel/projects/${project.projectId}/aliases?token=${localVercelToken}${teamId ? `&teamId=${teamId}` : ''}`
      );
      const aliasesData = aliasesResponse.ok ? await aliasesResponse.json() : { aliases: [] };

      // Create a map of deploymentId -> alias info for production aliases
      const productionAliases = new Map();
      if (aliasesData.aliases) {
        for (const alias of aliasesData.aliases) {
          // Check if this is a production alias (project name + .vercel.app or custom domain)
          if (alias.alias && (alias.alias.includes('.vercel.app') || !alias.alias.includes('vercel.app'))) {
            productionAliases.set(alias.deploymentId, {
              alias: alias.alias,
              created: alias.created
            });
          }
        }
      }

      // Now fetch deployments
      const response = await fetch(
        `/api/vercel/projects/${project.projectId}/deployments?token=${localVercelToken}&limit=20`
      );
      const data = await response.json();

      if (data.deployments) {
        // Enhance deployments with alias information
        const enhancedDeployments = data.deployments.map((deployment: any) => {
          const aliasInfo = productionAliases.get(deployment.id);
          const hasAliasAssigned = !!aliasInfo;
          const aliasAssignedTime = aliasInfo ? new Date(aliasInfo.created).getTime() : undefined;

          return {
            ...deployment,
            aliasAssigned: hasAliasAssigned ? aliasAssignedTime : undefined
          };
        });

        setDeployments(enhancedDeployments);

        // Save to storage
        await storageManager.init();
        const existingProject = await storageManager.getVercelProject(workspaceId);
        if (existingProject) {
          // Save each deployment
          for (const deployment of enhancedDeployments) {
            try {
              await storageManager.createVercelDeployment({
                projectId: existingProject.id,
                workspaceId,
                deploymentId: deployment.id,
                url: deployment.url,
                status: deployment.status,
                target: deployment.target,
                commit: deployment.commit,
                createdAt: deployment.createdAt,
              });
            } catch (err) {
              // Might already exist, that's okay
              console.log('Deployment already saved:', deployment.id);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load deployments:', err);
    }
  };

  // Refresh deployments from API while preserving local badge state
  const refreshDeploymentsPreservingBadges = async () => {
    if (!project?.projectId) return;

    try {
      // First, fetch aliases to determine which deployment is in production
      const aliasesResponse = await fetch(
        `/api/vercel/projects/${project.projectId}/aliases?token=${localVercelToken}${teamId ? `&teamId=${teamId}` : ''}`
      );
      const aliasesData = aliasesResponse.ok ? await aliasesResponse.json() : { aliases: [] };

      // Create a map of deploymentId -> alias info for production aliases
      const productionAliases = new Map();
      if (aliasesData.aliases) {
        for (const alias of aliasesData.aliases) {
          // Check if this is a production alias (project name + .vercel.app or custom domain)
          if (alias.alias && (alias.alias.includes('.vercel.app') || !alias.alias.includes('vercel.app'))) {
            productionAliases.set(alias.deploymentId, {
              alias: alias.alias,
              created: alias.created
            });
          }
        }
      }

      // Now fetch deployments
      const response = await fetch(
        `/api/vercel/projects/${project.projectId}/deployments?token=${localVercelToken}&limit=20`
      );
      const data = await response.json();

      if (data.deployments) {
        // Get current local state for badge preservation
        const currentLocalDeployments = deployments;

        // Merge API data with preserved local badge state and alias information
        const mergedDeployments = data.deployments.map((apiDeployment: any) => {
          const localDeployment = currentLocalDeployments.find(d => d.id === apiDeployment.id);
          const aliasInfo = productionAliases.get(apiDeployment.id);

          // Determine if this deployment has an alias assigned
          const hasAliasAssigned = !!aliasInfo;
          const aliasAssignedTime = aliasInfo ? new Date(aliasInfo.created).getTime() : undefined;

          return {
            ...apiDeployment,           // Fresh API data for all standard fields
            aliasAssigned: hasAliasAssigned ? aliasAssignedTime : undefined,  // Use API-derived alias info
            isRollbackCandidate: localDeployment?.isRollbackCandidate         // Preserve rollback state
          };
        });

        setDeployments(mergedDeployments);
      }
    } catch (err) {
      console.error('Failed to refresh deployments:', err);
      // Fallback to regular load if there's an error
      await loadDeployments();
    }
  };  // Refresh project details from Vercel API
  const refreshProjectDetails = async () => {
    if (!project?.projectId || !localVercelToken) return;

    try {
      const response = await fetch(
        `/api/vercel/projects/${project.projectId}?token=${localVercelToken}`
      );
      const data = await response.json();

      if (response.ok && data) {
        // Update project with fresh data from Vercel
        const updatedProject = {
          ...project,
          framework: data.framework || project.framework,
          url: data.targets?.production?.url || `https://${project.projectName}.vercel.app`,
        };

        setProject(updatedProject);

        // Save updated data to storage
        await storageManager.init();
        const existingProject = await storageManager.getVercelProject(workspaceId);
        if (existingProject) {
          await storageManager.updateVercelProject(existingProject.id, {
            framework: updatedProject.framework,
            url: updatedProject.url,
          });
        }
      }
    } catch (err) {
      console.error('Failed to refresh project details:', err);
    }
  };

  // Promote deployment to production
  const promoteDeployment = async (deploymentId: string) => {
    if (!project?.projectId) return;

    setLoading(true);
    setError(null);

    // Find the deployment being promoted to get its current target
    const deployment = deployments.find(d => d.id === deploymentId);
    const fromTarget = deployment?.target || 'preview';

    try {
      const response = await fetch(`/api/vercel/projects/${project.projectId}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deploymentId,
          vercelToken: localVercelToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to promote deployment');
      }

      setError(null);
      // Show success message
      alert(data.message || 'Deployment promoted successfully!');

      // CRITICAL: Update deployments immediately with proper badge swapping
      // This ensures the UI reflects the change before the API refresh
      const currentTime = Date.now();
      const currentProductionId = deployments.find(d => d.aliasAssigned && d.readyState === 'READY')?.id ||
                                  deployments.find(d => d.target === 'production' && (d.readyState === 'READY' || d.status === 'READY'))?.id;

      setDeployments(prevDeployments =>
        prevDeployments.map(d => {
          if (d.id === deploymentId) {
            // This becomes the new CURRENT deployment
            return { ...d, target: 'production', isRollbackCandidate: false };
          } else if (d.id === currentProductionId) {
            // Previous CURRENT becomes a rollback candidate
            return { ...d, isRollbackCandidate: true };
          }
          return d;
        })
      );
      
      // Save promotion record to storage
      await storageManager.init();
      const existingProject = await storageManager.getVercelProject(workspaceId);
      if (existingProject) {
        try {
          await storageManager.createVercelPromotion({
            projectId: existingProject.id,
            workspaceId,
            deploymentId,
            fromTarget,
            toTarget: 'production',
            promotedAt: Date.now(),
            status: data.status === 'processing' ? 'processing' : 'success',
            vercelResponse: data,
          });
        } catch (err) {
          console.log('Promotion record already saved or error:', err);
        }
        
        // Update project status
        await storageManager.updateVercelProject(existingProject.id, {
          status: 'READY',
          lastDeployed: Date.now(),
        });
      }
      
      // Refresh deployments from API to get the complete updated state
      // But preserve our local badge swapping logic
      await refreshDeploymentsPreservingBadges();
      
      // Update local project state
      setProject(prev => prev ? { ...prev, status: 'READY', lastDeployed: Date.now() } : null);
      
    } catch (err: any) {
      console.error('Promotion error:', err);
      setError(err.message || 'Failed to promote deployment');
      
      // Save failed promotion record
      await storageManager.init();
      const existingProject = await storageManager.getVercelProject(workspaceId);
      if (existingProject) {
        try {
          await storageManager.createVercelPromotion({
            projectId: existingProject.id,
            workspaceId,
            deploymentId,
            fromTarget,
            toTarget: 'production',
            promotedAt: Date.now(),
            status: 'failed',
            reason: err.message,
          });
        } catch (saveErr) {
          console.log('Failed to save error promotion record:', saveErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Load environment variables
  const loadEnvVars = async () => {
    if (!project?.projectId) return;

    try {
      const response = await fetch(
        `/api/vercel/projects/${project.projectId}/env?token=${localVercelToken}`
      );
      const data = await response.json();
      
      if (data.envs) {
        setEnvVars(data.envs);
        
        // Save to storage
        await storageManager.init();
        const existingProject = await storageManager.getVercelProject(workspaceId);
        if (existingProject) {
          for (const envVar of data.envs) {
            try {
              await storageManager.createVercelEnvVariable({
                projectId: existingProject.id,
                workspaceId,
                envId: envVar.id,
                key: envVar.key,
                type: envVar.type,
                target: envVar.target,
                hasValue: envVar.hasValue,
                createdAt: envVar.createdAt,
              });
            } catch (err) {
              console.log('Env var already saved:', envVar.id);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load env vars:', err);
    }
  };

  // Load domains
  const loadDomains = async () => {
    if (!project?.projectId) return;

    try {
      const response = await fetch(
        `/api/vercel/projects/${project.projectId}/domains?token=${localVercelToken}`
      );
      const data = await response.json();
      
      if (data.domains) {
        setDomains(data.domains);
        
        // Save to storage
        await storageManager.init();
        const existingProject = await storageManager.getVercelProject(workspaceId);
        if (existingProject) {
          for (const domain of data.domains) {
            try {
              await storageManager.createVercelDomain({
                projectId: existingProject.id,
                workspaceId,
                name: domain.name,
                verified: domain.verified,
                verification: domain.verification,
                createdAt: domain.createdAt,
              });
            } catch (err) {
              console.log('Domain already saved:', domain.name);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load domains:', err);
    }
  };

  // Load data when project changes
  useEffect(() => {
    if (project?.projectId && activeTab !== 'overview') {
      if (activeTab === 'deployments') loadDeployments();
      if (activeTab === 'environment') loadEnvVars();
      if (activeTab === 'domains') loadDomains();
    }
  }, [activeTab, project?.projectId]);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vercel Deployment Manager</h1>
          <p className="text-muted-foreground">Deploy and manage your projects on Vercel</p>
        </div>
        {project && (
          <Badge variant="outline" className="text-lg">
            {project.status === 'deployed' ? (
              <><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Deployed</>
            ) : (
              <><Clock className="w-4 h-4 mr-2 text-yellow-500" /> {project.status}</>
            )}
          </Badge>
        )}
      </div>

      {/* Tokens Configuration */}
      {(!vercelToken || !githubToken) && (
        <Alert>
          <AlertDescription>
            <div className="space-y-4">
              <p className="font-semibold">Configure your API tokens to get started:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vercel Token</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showTokens ? 'text' : 'password'}
                      value={localVercelToken}
                      onChange={(e) => setLocalVercelToken(e.target.value)}
                      placeholder="vercel_xxxxx"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setShowTokens(!showTokens)}
                    >
                      {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>GitHub Token</Label>
                  <Input
                    type={showTokens ? 'text' : 'password'}
                    value={localGithubToken}
                    onChange={(e) => setLocalGithubToken(e.target.value)}
                    placeholder="ghp_xxxxx"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Get tokens: <a href="https://vercel.com/account/tokens" target="_blank" className="underline">Vercel</a> | <a href="https://github.com/settings/tokens" target="_blank" className="underline">GitHub</a>
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <Rocket className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="deployments" disabled={!project}>
            <History className="w-4 h-4 mr-2" />
            Deployments
          </TabsTrigger>
          <TabsTrigger value="domains" disabled={!project}>
            <Globe className="w-4 h-4 mr-2" />
            Domains
          </TabsTrigger>
          <TabsTrigger value="environment" disabled={!project}>
            <Settings className="w-4 h-4 mr-2" />
            Environment
          </TabsTrigger>
          <TabsTrigger value="logs" disabled={!project}>
            <Terminal className="w-4 h-4 mr-2" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {!project ? (
            <CreateProjectForm
              projectName={projectName}
              setProjectName={setProjectName}
              githubRepo={githubRepo}
              setGithubRepo={setGithubRepo}
              selectedGithubRepo={selectedGithubRepo}
              setSelectedGithubRepo={setSelectedGithubRepo}
              framework={framework}
              setFramework={setFramework}
              loading={loading}
              loadingRepos={loadingRepos}
              githubRepos={githubRepos}
              workspaces={workspaces}
              selectedWorkspace={selectedWorkspace}
              setSelectedWorkspace={setSelectedWorkspace}
              onSubmit={createProject}
            />
          ) : (
            <ProjectOverview
              project={project}
              loading={loading}
              onRedeploy={triggerDeploy}
            />
          )}
        </TabsContent>

        {/* Deployments Tab */}
        <TabsContent value="deployments">
          <DeploymentsTab
            deployments={deployments}
            loading={loading}
            onRefresh={loadDeployments}
            projectUrl={project?.url}
            onPromote={promoteDeployment}
            projectId={project?.projectId}
            vercelToken={localVercelToken}
            teamSlug={teamSlug}
          />
        </TabsContent>

        {/* Domains Tab */}
        <TabsContent value="domains">
          <DomainsTab
            domains={domains}
            projectId={project?.projectId || ''}
            teamId={teamId || project?.teamId}
            vercelToken={localVercelToken}
            onRefresh={loadDomains}
          />
        </TabsContent>

        {/* Environment Tab */}
        <TabsContent value="environment">
          <EnvironmentTab
            envVars={envVars}
            projectId={project?.projectId || ''}
            vercelToken={localVercelToken}
            onRefresh={loadEnvVars}
          />
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <LogsTab 
            logs={logs} 
            deploymentId={currentDeploymentId}
            onRefresh={() => {
              if (currentDeploymentId) {
                loadLogs(currentDeploymentId);
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Create Project Form Component
// Create Project Form Component
function CreateProjectForm({
  projectName,
  setProjectName,
  githubRepo,
  setGithubRepo,
  selectedGithubRepo,
  setSelectedGithubRepo,
  framework,
  setFramework,
  loading,
  loadingRepos,
  githubRepos,
  workspaces,
  selectedWorkspace,
  setSelectedWorkspace,
  onSubmit,
}: any) {
  
  // Auto-generate project name when workspace changes
  const handleWorkspaceChange = (workspaceId: string) => {
    const workspace = workspaces.find((w: any) => w.id === workspaceId);
    if (workspace) {
      setSelectedWorkspace(workspace);
      
      // Auto-fill project name from workspace
      const autoName = workspace.name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      setProjectName(autoName);
      
      // Pre-fill GitHub repo if available
      if (workspace.githubRepoUrl) {
        const repoPath = workspace.githubRepoUrl.split('github.com/')[1];
        if (repoPath) {
          setGithubRepo(repoPath);
          setSelectedGithubRepo(repoPath);
        }
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Vercel Project</CardTitle>
        <CardDescription>Deploy your workspace project to Vercel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Workspace Selection */}
        {workspaces && workspaces.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="workspace">Workspace Project</Label>
            <Select 
              value={selectedWorkspace?.id} 
              onValueChange={handleWorkspaceChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a workspace project">
                  {selectedWorkspace && (
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      <span>{selectedWorkspace.name}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((workspace: any) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      <span>{workspace.name}</span>
                      {workspace.vercelProjectId && (
                        <Badge variant="secondary" className="text-xs">Deployed</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose which workspace project to deploy
            </p>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="projectName">Vercel Project Name</Label>
          <div className="flex gap-2">
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="my-awesome-app"
              className="flex-1"
            />
            {selectedWorkspace && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const autoName = selectedWorkspace.name.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '');
                  setProjectName(autoName + '-' + Date.now().toString().slice(-6));
                }}
              >
                <Lightbulb className="w-3 h-3 mr-1" />
                Auto
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Lowercase letters, numbers, and hyphens only
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="githubRepo">GitHub Repository</Label>
          {loadingRepos ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading repositories...
            </div>
          ) : githubRepos && githubRepos.length > 0 ? (
            <>
              <Select
                value={selectedGithubRepo}
                onValueChange={(value) => {
                  setSelectedGithubRepo(value);
                  setGithubRepo(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a GitHub repository">
                    {selectedGithubRepo && (
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4" />
                        <span className="truncate">{selectedGithubRepo}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {githubRepos.filter((repo: any) => repo.full_name).map((repo: any) => (
                    <SelectItem key={repo.id} value={repo.full_name}>
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4" />
                        <span className="truncate">{repo.full_name}</span>
                        {repo.private && (
                          <Badge variant="outline" className="text-xs">Private</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select from your GitHub repositories
              </p>
            </>
          ) : (
            <>
              <Input
                id="githubRepo"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="username/repository"
              />
              <p className="text-xs text-muted-foreground">
                Enter repository in format: username/repo
              </p>
            </>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="framework">Framework (Optional)</Label>
          <Select value={framework} onValueChange={setFramework}>
            <SelectTrigger>
              <SelectValue placeholder="Auto-detect" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto-detect">Auto-detect</SelectItem>
              <SelectItem value="nextjs">Next.js</SelectItem>
              <SelectItem value="react">React</SelectItem>
              <SelectItem value="vue">Vue</SelectItem>
              <SelectItem value="nuxtjs">Nuxt.js</SelectItem>
              <SelectItem value="angular">Angular</SelectItem>
              <SelectItem value="svelte">Svelte</SelectItem>
              <SelectItem value="gatsby">Gatsby</SelectItem>
              <SelectItem value="vite">Vite</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={onSubmit} 
          disabled={loading || !projectName || !githubRepo}
          className="w-full"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
          ) : (
            <><Rocket className="w-4 h-4 mr-2" /> Create & Deploy</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// Project Overview Component
function ProjectOverview({ project, loading, onRedeploy }: any) {
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText(project.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{project.projectName}</span>
            <Button onClick={onRedeploy} disabled={loading} size="sm">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deploying...</>
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" /> Redeploy</>
              )}
            </Button>
          </CardTitle>
          <CardDescription>
            Project ID: {project.projectId}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input value={project.url} readOnly />
            <Button size="icon" variant="outline" onClick={copyUrl}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button size="icon" variant="outline" asChild>
              <a href={project.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Framework</p>
              <p className="font-semibold">{project.framework || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-semibold capitalize">{project.status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Deployed</p>
              <p className="font-semibold">
                {project.lastDeployed ? new Date(project.lastDeployed).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Deployments Tab Component
function DeploymentsTab({ deployments, loading, onRefresh, projectUrl, onPromote, projectId, vercelToken, teamSlug }: any) {
  // Build logs state
  const [selectedDeploymentForBuildLogs, setSelectedDeploymentForBuildLogs] = useState<string | null>(null);
  const [buildLogs, setBuildLogs] = useState<any[]>([]);
  const [loadingBuildLogs, setLoadingBuildLogs] = useState(false);

  // Find the actual current production deployment 
  // Logic: Use aliasAssigned field to identify which deployment is actually live on production domains
  // This is more accurate than just checking target === 'production'
  // Fallback to the most recent READY production deployment if aliasAssigned is not available
  const currentProductionDeploymentId = React.useMemo(() => {
    // First try to find deployment with aliasAssigned (most recent alias assignment)
    const aliasedDeployments = deployments.filter((d: Deployment) => 
      d.aliasAssigned && (d.readyState === 'READY' || d.status === 'READY')
    );
    if (aliasedDeployments.length > 0) {
      // Sort by aliasAssigned timestamp (most recent first)
      const currentAliased = aliasedDeployments.sort((a: Deployment, b: Deployment) => 
        (b.aliasAssigned || 0) - (a.aliasAssigned || 0)
      )[0];
      return currentAliased.id;
    }
    
    // Fallback: Find first READY deployment with production target
    return deployments.find(
      (d: Deployment) => d.target === 'production' && (d.readyState === 'READY' || d.status === 'READY')
    )?.id;
  }, [deployments]);

  // Auto-refresh deployments every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh();
    }, 5000); // 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, [onRefresh]);



  const loadBuildLogs = async (deploymentId: string) => {
    setLoadingBuildLogs(true);
    try {
      const response = await fetch(
        `/api/vercel/deployments/${deploymentId}/logs?token=${vercelToken}`
      );
      const data = await response.json();
      
      if (response.ok && data.logs) {
        setBuildLogs(data.logs);
      } else {
        console.error('Failed to load build logs:', data.error);
        setBuildLogs([]);
      }
    } catch (err) {
      console.error('Error loading build logs:', err);
      setBuildLogs([]);
    } finally {
      setLoadingBuildLogs(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Deployment History</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
              Click "Promote" to instantly make any READY deployment live in production
              <Badge variant="outline" className="text-xs">
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Auto-refreshing every 5s
              </Badge>
              <div className="text-xs text-muted-foreground">
                Badges: <span className="font-mono bg-blue-500 text-white px-1 rounded">CURRENT</span> = Live on production domains | 
                <span className="font-mono bg-secondary text-secondary-foreground px-1 rounded ml-1">LIVE</span> = Accessible | 
                <span className="font-mono border border-green-600 text-green-600 px-1 rounded ml-1">ROLLBACK</span> = Can rollback
              </div>
            </CardDescription>
          </div>
          <Button onClick={onRefresh} size="sm" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {deployments.map((deployment: Deployment) => (
              <div key={deployment.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(deployment.readyState === 'READY' || deployment.status === 'READY') ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (deployment.state === 'ERROR' || deployment.status === 'ERROR') ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                    <Badge variant="outline">{deployment.target || 'preview'}</Badge>
                    {/* Only show CURRENT badge for the actual current production deployment */}
                    {deployment.id === currentProductionDeploymentId && (
                      <Badge className="bg-blue-500 text-white">CURRENT</Badge>
                    )}
                    {/* Show when deployment was previously assigned to production alias but is no longer current */}
                    {deployment.aliasAssigned && deployment.id !== currentProductionDeploymentId && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        WAS LIVE
                      </Badge>
                    )}
                    {/* Show for ready deployments that are accessible */}
                    {(deployment.readyState === 'READY' || deployment.status === 'READY') && (
                      <Badge variant="secondary">LIVE</Badge>
                    )}
                    {/* Show rollback candidate indicator for non-current deployments */}
                    {deployment.isRollbackCandidate && deployment.id !== currentProductionDeploymentId && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        ROLLBACK
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(deployment.created || deployment.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Deployment ID display */}
                <div className="text-xs text-muted-foreground font-mono">
                  ID: {deployment.id}
                </div>
                
                {deployment.commit && (
                  <div className="text-sm">
                    <p className="font-mono text-xs">{deployment.commit.sha.substring(0, 7)}</p>
                    <p className="text-muted-foreground">{deployment.commit.message}</p>
                    <p className="text-xs">by {deployment.commit.author}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="link" asChild className="p-0 h-auto">
                    <a href={deployment.url} target="_blank" rel="noopener noreferrer">
                      {deployment.url} <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Button>
                  
                  {/* View Build Logs button - available for all deployments */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedDeploymentForBuildLogs(deployment.id);
                          loadBuildLogs(deployment.id);
                        }}
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Build Logs
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>Build Logs - {deployment.id}</DialogTitle>
                        <DialogDescription>
                          Deployment build output and logs
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="h-[500px] w-full">
                        <div className="bg-black text-green-400 p-4 rounded font-mono text-xs space-y-1">
                          {loadingBuildLogs ? (
                            <div className="flex items-center gap-2 text-gray-500">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Loading build logs...
                            </div>
                          ) : buildLogs.length > 0 ? (
                            buildLogs.map((log: any, i: number) => {
                              // Handle string logs (legacy format)
                              if (typeof log === 'string') {
                                return <div key={i} className="whitespace-pre-wrap">{log}</div>;
                              }
                              
                              // Handle object logs (new format)
                              const logType = log.type || 'info';
                              const logMessage = log.message || '';
                              const logTimestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';
                              
                              return (
                                <div key={log.id || i} className="whitespace-pre-wrap">
                                  <span className={`
                                    ${logType === 'stderr' || logType === 'error' ? 'text-red-400' : ''}
                                    ${logType === 'warning' ? 'text-yellow-400' : ''}
                                    ${logType === 'command' ? 'text-blue-400' : ''}
                                    font-bold
                                  `}>
                                    [{logType.toUpperCase()}]
                                  </span>
                                  {logTimestamp && (
                                    <>
                                      {' '}
                                      <span className="text-gray-400 text-[10px]">
                                        {logTimestamp}
                                      </span>
                                    </>
                                  )}
                                  {' '}
                                  {logMessage}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-gray-500">
                              No build logs available for this deployment yet.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => loadBuildLogs(selectedDeploymentForBuildLogs!)}
                          disabled={loadingBuildLogs}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Refresh Logs
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {/* View Runtime Logs button for READY deployments */}
                  {(deployment.readyState === 'READY' || deployment.status === 'READY') && teamSlug && projectId && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      asChild
                    >
                      <a
                        href={`https://vercel.com/${teamSlug}/${projectId}/${deployment.id}/logs`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        <Terminal className="w-3 h-3" />
                        Runtime Logs
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                  )}
                  
                  {/* Promote button for READY deployments that aren't the current production deployment */}
                  {/* When promoted, the deployment will become the new CURRENT production deployment */}
                  {(deployment.readyState === 'READY' || deployment.status === 'READY') && deployment.id !== currentProductionDeploymentId && (
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => {
                        const isRollback = deployment.isRollbackCandidate;
                        const actionType = isRollback ? 'Roll back' : 'Promote';
                        const confirmMessage = isRollback 
                          ? `${actionType} to this deployment?\n\nThis will instantly roll back production to this previous deployment.\n\n• This deployment will become CURRENT\n• The current deployment will become a ROLLBACK candidate\n\nNo rebuild required.`
                          : `${actionType} this deployment to production?\n\nThis will instantly update all production domains to point to this deployment without rebuilding.\n\nThis deployment will become the new CURRENT production deployment.`;
                        
                        if (confirm(confirmMessage)) {
                          onPromote(deployment.id);
                        }
                      }}
                      disabled={loading}
                      className="ml-auto"
                    >
                      <Rocket className="w-3 h-3 mr-1" />
                      {deployment.isRollbackCandidate ? 'Roll Back' : 'Promote to Production'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {deployments.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No deployments yet</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Domains Tab Component
function DomainsTab({ domains, projectId, teamId, vercelToken, onRefresh }: any) {
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [showBuyDomain, setShowBuyDomain] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const attachDomain = async () => {
    if (!newDomain) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/vercel/projects/${projectId}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDomain, // API expects 'name', not 'domain'
          vercelToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setShowAddDomain(false);
      setNewDomain('');
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Custom Domains</CardTitle>
            <div className="flex gap-2">
              <Dialog open={showBuyDomain} onOpenChange={setShowBuyDomain}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Buy Domain
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <BuyDomainDialog 
                    projectId={projectId} 
                    teamId={teamId}
                    vercelToken={vercelToken}
                    onSuccess={() => {
                      setShowBuyDomain(false);
                      onRefresh();
                    }}
                  />
                </DialogContent>
              </Dialog>

              <Dialog open={showAddDomain} onOpenChange={setShowAddDomain}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Domain
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Domain</DialogTitle>
                    <DialogDescription>
                      Attach an existing domain to your project
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Domain Name</Label>
                      <Input
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        placeholder="example.com"
                      />
                    </div>
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <Button onClick={attachDomain} disabled={loading || !newDomain} className="w-full">
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Add Domain
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {domains.map((domain: Domain) => (
              <div key={domain.name} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span className="font-semibold">{domain.name}</span>
                    {domain.verified ? (
                      <Badge variant="default">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>

                {!domain.verified && domain.verification && (
                  <div className="bg-muted p-3 rounded text-sm space-y-2">
                    <p className="font-semibold">Verification Required:</p>
                    {domain.verification.map((v, i) => (
                      <div key={i} className="font-mono text-xs">
                        <p>Type: {v.type}</p>
                        <p>Name: {v.domain}</p>
                        <p>Value: {v.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {domains.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No domains attached</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Buy Domain Dialog Component
function BuyDomainDialog({ projectId, vercelToken, teamId, onSuccess }: any) {
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState('');
  const [availability, setAvailability] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [countryPhoneCodes, setCountryPhoneCodes] = useState<Record<string, string>>({});

  // Contact info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+1'); // Separate state for phone country code
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');
  
  // Country code mapping for Vercel API
  const countryCodeMap: Record<string, string> = {
    'Afghanistan': 'AF', 'Albania': 'AL', 'Algeria': 'DZ', 'American Samoa': 'AS',
    'Andorra': 'AD', 'Angola': 'AO', 'Anguilla': 'AI', 'Antarctica': 'AQ',
    'Antigua and Barbuda': 'AG', 'Argentina': 'AR', 'Armenia': 'AM', 'Aruba': 'AW',
    'Australia': 'AU', 'Austria': 'AT', 'Azerbaijan': 'AZ', 'Bahamas': 'BS',
    'Bahrain': 'BH', 'Bangladesh': 'BD', 'Barbados': 'BB', 'Belarus': 'BY',
    'Belgium': 'BE', 'Belize': 'BZ', 'Benin': 'BJ', 'Bermuda': 'BM',
    'Bhutan': 'BT', 'Bolivia': 'BO', 'Bosnia and Herzegovina': 'BA', 'Botswana': 'BW',
    'Brazil': 'BR', 'British Virgin Islands': 'VG', 'Brunei': 'BN', 'Bulgaria': 'BG',
    'Burkina Faso': 'BF', 'Burundi': 'BI', 'Cambodia': 'KH', 'Cameroon': 'CM',
    'Canada': 'CA', 'Cape Verde': 'CV', 'Cayman Islands': 'KY', 'Chad': 'TD',
    'Chile': 'CL', 'China': 'CN', 'Colombia': 'CO', 'Comoros': 'KM',
    'Cook Islands': 'CK', 'Costa Rica': 'CR', 'Croatia': 'HR', 'Cuba': 'CU',
    'Cyprus': 'CY', 'Czechia': 'CZ', 'Denmark': 'DK', 'Djibouti': 'DJ',
    'Dominica': 'DM', 'Dominican Republic': 'DO', 'Ecuador': 'EC', 'Egypt': 'EG',
    'El Salvador': 'SV', 'Estonia': 'EE', 'Ethiopia': 'ET', 'Fiji': 'FJ',
    'Finland': 'FI', 'France': 'FR', 'French Guiana': 'GF', 'French Polynesia': 'PF',
    'Gabon': 'GA', 'Gambia': 'GM', 'Georgia': 'GE', 'Germany': 'DE',
    'Ghana': 'GH', 'Gibraltar': 'GI', 'Greece': 'GR', 'Greenland': 'GL',
    'Grenada': 'GD', 'Guadeloupe': 'GP', 'Guam': 'GU', 'Guatemala': 'GT',
    'Guinea': 'GN', 'Guinea-Bissau': 'GW', 'Guyana': 'GY', 'Haiti': 'HT',
    'Honduras': 'HN', 'Hong Kong': 'HK', 'Hungary': 'HU', 'Iceland': 'IS',
    'India': 'IN', 'Indonesia': 'ID', 'Iran': 'IR', 'Iraq': 'IQ',
    'Ireland': 'IE', 'Israel': 'IL', 'Italy': 'IT', 'Jamaica': 'JM',
    'Japan': 'JP', 'Jordan': 'JO', 'Kazakhstan': 'KZ', 'Kenya': 'KE',
    'Kuwait': 'KW', 'Kyrgyzstan': 'KG', 'Laos': 'LA', 'Latvia': 'LV',
    'Lebanon': 'LB', 'Lesotho': 'LS', 'Liberia': 'LR', 'Libya': 'LY',
    'Liechtenstein': 'LI', 'Lithuania': 'LT', 'Luxembourg': 'LU', 'Madagascar': 'MG',
    'Malawi': 'MW', 'Malaysia': 'MY', 'Maldives': 'MV', 'Mali': 'ML',
    'Malta': 'MT', 'Marshall Islands': 'MH', 'Mauritania': 'MR', 'Mauritius': 'MU',
    'Mexico': 'MX', 'Micronesia': 'FM', 'Moldova': 'MD', 'Monaco': 'MC',
    'Mongolia': 'MN', 'Montenegro': 'ME', 'Morocco': 'MA', 'Mozambique': 'MZ',
    'Myanmar': 'MM', 'Namibia': 'NA', 'Nauru': 'NR', 'Nepal': 'NP',
    'Netherlands': 'NL', 'New Caledonia': 'NC', 'New Zealand': 'NZ', 'Nicaragua': 'NI',
    'Niger': 'NE', 'Nigeria': 'NG', 'North Korea': 'KP', 'North Macedonia': 'MK',
    'Norway': 'NO', 'Oman': 'OM', 'Pakistan': 'PK', 'Palau': 'PW',
    'Palestine': 'PS', 'Panama': 'PA', 'Papua New Guinea': 'PG', 'Paraguay': 'PY',
    'Peru': 'PE', 'Philippines': 'PH', 'Poland': 'PL', 'Portugal': 'PT',
    'Puerto Rico': 'PR', 'Qatar': 'QA', 'Romania': 'RO', 'Russia': 'RU',
    'Rwanda': 'RW', 'Saint Kitts and Nevis': 'KN', 'Saint Lucia': 'LC',
    'Saint Vincent and the Grenadines': 'VC', 'Samoa': 'WS', 'San Marino': 'SM',
    'Saudi Arabia': 'SA', 'Senegal': 'SN', 'Serbia': 'RS', 'Seychelles': 'SC',
    'Sierra Leone': 'SL', 'Singapore': 'SG', 'Slovakia': 'SK', 'Slovenia': 'SI',
    'Solomon Islands': 'SB', 'Somalia': 'SO', 'South Africa': 'ZA', 'South Korea': 'KR',
    'South Sudan': 'SS', 'Spain': 'ES', 'Sri Lanka': 'LK', 'Sudan': 'SD',
    'Suriname': 'SR', 'Sweden': 'SE', 'Switzerland': 'CH', 'Syria': 'SY',
    'Taiwan': 'TW', 'Tajikistan': 'TJ', 'Tanzania': 'TZ', 'Thailand': 'TH',
    'Timor-Leste': 'TL', 'Togo': 'TG', 'Tonga': 'TO', 'Trinidad and Tobago': 'TT',
    'Tunisia': 'TN', 'Turkey': 'TR', 'Turkmenistan': 'TM', 'Tuvalu': 'TV',
    'Uganda': 'UG', 'Ukraine': 'UA', 'United Arab Emirates': 'AE', 'United Kingdom': 'GB',
    'United States': 'US', 'Uruguay': 'UY', 'Uzbekistan': 'UZ', 'Vanuatu': 'VU',
    'Vatican City': 'VA', 'Venezuela': 'VE', 'Vietnam': 'VN', 'Yemen': 'YE',
    'Zambia': 'ZM', 'Zimbabwe': 'ZW'
  };

  // Load countries and phone codes from files
  useEffect(() => {
    const loadCountriesAndCodes = async () => {
      try {
        // Load countries list
        const countriesResponse = await fetch('/countries.txt');
        const countriesText = await countriesResponse.text();
        const countriesList = countriesText.split('\n').filter(country => country.trim() !== '');
        setCountries(countriesList);

        // Load country phone codes
        const codesResponse = await fetch('/country-codes.txt');
        const codesText = await codesResponse.text();
        const codesLines = codesText.split('\n').filter(line => line.trim() !== '');
        
        const phoneCodesMap: Record<string, string> = {};
        codesLines.forEach(line => {
          try {
            const countryData = JSON.parse(line);
            if (countryData.label && countryData.value) {
              phoneCodesMap[countryData.label] = countryData.value;
            }
          } catch (parseErr) {
            console.warn('Failed to parse country code line:', line);
          }
        });
        
        setCountryPhoneCodes(phoneCodesMap);
      } catch (err) {
        console.error('Failed to load countries or codes:', err);
        // Fallback to hardcoded data if files fail to load
        setCountries(['United States', 'Canada', 'United Kingdom', 'Germany', 'France']);
        setCountryPhoneCodes({
          'United States': '+1',
          'Canada': '+1',
          'United Kingdom': '+44',
          'Germany': '+49',
          'France': '+33'
        });
        setPhoneCountryCode('+1'); // Set default phone country code
      }
    };

    loadCountriesAndCodes();
  }, []);

  // Format phone number for Vercel API using selected country code and phone number
  const formatPhoneForVercel = (phoneNumber: string, selectedPhoneCountryCode: string): string => {
    // Remove all non-digit characters from phone number
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If phone number is empty, return empty
    if (!digits) return '';
    
    // Format: E.164 format as required by Vercel API (e.g., +14158551452)
    // Ensure the country code is included
    const cleanCountryCode = selectedPhoneCountryCode.startsWith('+') 
      ? selectedPhoneCountryCode 
      : `+${selectedPhoneCountryCode}`;
    
    return `${cleanCountryCode}${digits}`;
  };

  const checkAvailability = async () => {
    if (!domain) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/vercel/domains/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domains: [domain],
          vercelToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      console.log('Domain availability response:', data.domains[0]);
      setAvailability(data.domains[0]);
      
      if (data.domains[0].available) {
        if (!data.domains[0].price || data.domains[0].price < 0.01) {
          setError(`Price information unavailable for ${domain}. Price: ${data.domains[0].price}`);
          return;
        }
        setStep(2);
      } else {
        setError('Domain is not available');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const purchaseDomain = async () => {
    if (!teamId) {
      setError('Team ID is required for domain purchases. Please ensure you have a Vercel token configured.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const purchaseData = {
        domain: domain,
        autoRenew: true,
        years: 1,
        expectedPrice: availability?.price,
        vercelToken,
        teamId: teamId, // Required by the API
        contactInformation: {
          firstName,
          lastName,
          email,
          phone: formatPhoneForVercel(phone, phoneCountryCode),
          address1: address,
          city,
          state,
          zip: postalCode,
          country: countryCodeMap[country] || 'US', // Fallback to US if country code not found
        },
      };

      // Validate expected price
      if (!availability?.price || availability.price < 0.01) {
        setError(`Invalid price: ${availability?.price}. Expected price is required and must be >= $0.01. Please check domain availability first.`);
        return;
      }

      // Validate phone number format before sending
      const formattedPhone = formatPhoneForVercel(phone, phoneCountryCode);
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(formattedPhone)) {
        setError(`Invalid Phone Number: ${formattedPhone}. Must be in E.164 format (e.g., +14155552671)`);
        return;
      }

      // Validate country code format
      const selectedCountryCode = countryCodeMap[country] || 'US';
      const countryRegex = /^[A-Z]{2}$/;
      if (!countryRegex.test(selectedCountryCode)) {
        setError(`Invalid Country Code: ${selectedCountryCode}. Must be a 2-letter ISO code (e.g., US, GB)`);
        return;
      }

      console.log('Purchase data being sent:', {
        ...purchaseData,
        vercelToken: '***hidden***' // Hide token in logs
      });

      console.log('Domain availability data:', availability);

      const response = await fetch('/api/vercel/domains/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      // Attach to project
      await fetch(`/api/vercel/projects/${projectId}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          vercelToken,
        }),
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Buy Domain</DialogTitle>
        <DialogDescription>
          {step === 1 ? 'Check domain availability' : 'Complete purchase'}
          {teamId && (
            <span className="text-xs text-green-600 dark:text-green-400 ml-2">
              ✓ Team ID configured
            </span>
          )}
        </DialogDescription>
      </DialogHeader>

      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <Label>Domain Name</Label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
            />
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={checkAvailability} disabled={loading || !domain} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Check Availability
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Alert>
            <CreditCard className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">Domain: {domain}</p>
                <p>Price: ${availability?.price} {availability?.currency}/year</p>
              </div>
            </AlertDescription>
          </Alert>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div>
            <Label>Phone</Label>
            <div className="flex gap-2">
              <Select value={phoneCountryCode} onValueChange={setPhoneCountryCode}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(countryPhoneCodes).map(([countryName, code]) => (
                    <SelectItem key={countryName} value={code}>
                      {code} {countryName.length > 20 ? countryName.substring(0, 17) + '...' : countryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input 
                type="tel" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="Phone number"
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label>State/Province</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Postal Code</Label>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </div>
            <div>
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((countryName) => (
                    <SelectItem key={countryName} value={countryName}>
                      {countryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button 
              onClick={purchaseDomain} 
              disabled={loading || !firstName || !lastName || !email || !phone || !availability?.price || availability.price < 0.01} 
              className="flex-1"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {availability?.price ? `Purchase $${availability.price}` : 'Purchase Domain'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Environment Tab Component
function EnvironmentTab({ envVars, projectId, vercelToken, onRefresh }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newType, setNewType] = useState('plain');
  const [newTarget, setNewTarget] = useState(['production']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const deleteEnvVar = async (envId: string) => {
    if (!confirm('Are you sure you want to delete this environment variable?')) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/vercel/projects/${projectId}/env/${envId}?token=${vercelToken}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      // Remove from local storage
      await storageManager.init();
      try {
        await storageManager.deleteVercelEnvVariable(envId);
      } catch (storageErr) {
        console.log('Failed to remove from storage:', storageErr);
      }

      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addEnvVar = async () => {
    if (!newKey || !newValue) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/vercel/projects/${projectId}/env`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vercelToken,
          variables: [{
            key: newKey,
            value: newValue,
            type: newType,
            target: newTarget,
          }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setShowAdd(false);
      setNewKey('');
      setNewValue('');
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Environment Variables</CardTitle>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Variable
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Environment Variable</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Key</Label>
                  <Input
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="API_KEY"
                  />
                </div>
                <div>
                  <Label>Value</Label>
                  <Textarea
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="your-secret-value"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plain">Plain</SelectItem>
                      <SelectItem value="sensitive">Sensitive</SelectItem>
                      <SelectItem value="encrypted">Encrypted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Environment</Label>
                  <div className="space-y-2">
                    {['production', 'preview', 'development'].map((env) => (
                      <label key={env} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newTarget.includes(env)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewTarget([...newTarget, env]);
                            } else {
                              setNewTarget(newTarget.filter(t => t !== env));
                            }
                          }}
                        />
                        <span className="capitalize">{env}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button onClick={addEnvVar} disabled={loading || !newKey || !newValue} className="w-full">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Add Variable
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {envVars.map((envVar: EnvVariable) => (
            <div key={envVar.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="font-mono font-semibold">{envVar.key}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{envVar.type}</Badge>
                  {envVar.target.map((t: string) => (
                    <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => deleteEnvVar(envVar.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {envVars.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No environment variables</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Logs Tab Component
function LogsTab({ logs, deploymentId, onRefresh }: any) {
  // Auto-refresh logs every 5 seconds
  useEffect(() => {
    if (!deploymentId || !onRefresh) return;

    const interval = setInterval(() => {
      onRefresh();
    }, 5000); // 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, [deploymentId, onRefresh]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Build Logs</CardTitle>
            {deploymentId && (
              <CardDescription>
                Deployment: {deploymentId}
                <Badge variant="outline" className="ml-2 text-xs">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Auto-refreshing every 5s
                </Badge>
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] w-full">
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm space-y-1">
            {logs.length > 0 ? (
              logs.map((log: string, i: number) => (
                <div key={i}>{log}</div>
              ))
            ) : (
              <div className="text-gray-500">No logs yet. Deploy your project to see build logs.</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
