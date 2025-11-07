'use client';

import { useState, useEffect } from 'react';
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
  Activity,
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
  url: string;
  status: string;
  createdAt: number;
  target: string;
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
          url: d.url,
          status: d.status,
          createdAt: d.createdAt,
          target: d.target,
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
      const response = await fetch(
        `/api/vercel/projects/${project.projectId}/deployments?token=${localVercelToken}&limit=20`
      );
      const data = await response.json();
      
      if (data.deployments) {
        setDeployments(data.deployments);
        
        // Save to storage
        await storageManager.init();
        const existingProject = await storageManager.getVercelProject(workspaceId);
        if (existingProject) {
          // Save each deployment
          for (const deployment of data.deployments) {
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

  // Refresh project details from Vercel API
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
      
      // Refresh deployments to show updated production status
      await loadDeployments();
      
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
          />
        </TabsContent>

        {/* Domains Tab */}
        <TabsContent value="domains">
          <DomainsTab
            domains={domains}
            projectId={project?.projectId || ''}
            teamId={project?.teamId}
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
          <LogsTab logs={logs} deploymentId={currentDeploymentId} />
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
function DeploymentsTab({ deployments, loading, onRefresh, projectUrl, onPromote }: any) {
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const viewDeploymentDetails = (deploymentId: string) => {
    setSelectedDeploymentId(deploymentId);
    setShowDetailsDialog(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Deployment History</CardTitle>
              <CardDescription className="mt-1">
                Click "Promote" to instantly make any READY deployment live in production
              </CardDescription>
            </div>
            <Button onClick={onRefresh} size="sm" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
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
                    {deployment.status === 'READY' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : deployment.status === 'ERROR' ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                    <Badge variant="outline">{deployment.target}</Badge>
                    {deployment.target === 'production' && deployment.status === 'READY' && (
                      <Badge className="bg-green-500">LIVE</Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(deployment.createdAt).toLocaleString()}
                  </span>
                </div>
                
                {deployment.commit && (
                  <div className="text-sm">
                    <p className="font-mono text-xs">{deployment.commit.sha.substring(0, 7)}</p>
                    <p className="text-muted-foreground">{deployment.commit.message}</p>
                    <p className="text-xs">by {deployment.commit.author}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => viewDeploymentDetails(deployment.id)}>
                    <Eye className="w-3 h-3 mr-1" />
                    View Details
                  </Button>
                  
                  <Button size="sm" variant="link" asChild className="p-0 h-auto">
                    <a href={deployment.url} target="_blank" rel="noopener noreferrer">
                      {deployment.url} <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Button>
                  
                  {/* Promote button for READY deployments that aren't already in production */}
                  {deployment.status === 'READY' && deployment.target !== 'production' && (
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => {
                        if (confirm(`Promote this deployment to production?\n\nThis will instantly update all production domains to point to this deployment without rebuilding.`)) {
                          onPromote(deployment.id);
                        }
                      }}
                      disabled={loading}
                      className="ml-auto"
                    >
                      <Rocket className="w-3 h-3 mr-1" />
                      Promote to Production
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

    {/* Deployment Details Dialog */}
    {selectedDeploymentId && (
      <DeploymentDetailsDialog
        deploymentId={selectedDeploymentId}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
      />
    )}
    </>
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

  // Contact info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');

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

      setAvailability(data.domains[0]);
      
      if (data.domains[0].available) {
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
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/vercel/domains/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domains: [{
            domainName: domain,
            autoRenew: true,
            years: 1,
            expectedPrice: availability?.price,
          }],
          vercelToken,
          teamId: teamId, // Required by the API
          contactInformation: {
            firstName,
            lastName,
            email,
            phone,
            address1: address,
            city,
            state,
            zip: postalCode,
            country,
          },
        }),
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
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="DE">Germany</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
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
              disabled={loading || !firstName || !lastName || !email} 
              className="flex-1"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Purchase ${availability?.price}
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
              <Button size="sm" variant="ghost">
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

// Deployment Details Dialog Component
function DeploymentDetailsDialog({ deploymentId, open, onOpenChange }: any) {
  const [logs, setLogs] = useState<string[]>([]);
  const [runtimeLogs, setRuntimeLogs] = useState<any[]>([]);
  const [deploymentInfo, setDeploymentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingRuntimeLogs, setLoadingRuntimeLogs] = useState(false);
  const [activeTab, setActiveTab] = useState('logs');

  // Get Vercel token and project ID from localStorage
  const getVercelToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vercel_token') || '';
    }
    return '';
  };

  const getProjectId = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vercel_project_id') || '';
    }
    return '';
  };

  const vercelToken = getVercelToken();
  const projectId = getProjectId();

  // Load deployment details when dialog opens
  useEffect(() => {
    if (open && deploymentId) {
      loadDeploymentDetails();
      loadDeploymentLogs();
    }
  }, [open, deploymentId]);

  const loadDeploymentDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/vercel/deployments/${deploymentId}/status?token=${vercelToken}`
      );
      const data = await response.json();
      
      if (response.ok) {
        setDeploymentInfo(data);
      }
    } catch (err) {
      console.error('Failed to load deployment details:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDeploymentLogs = async () => {
    try {
      const response = await fetch(
        `/api/vercel/deployments/${deploymentId}/logs?token=${vercelToken}&limit=100`
      );
      const data = await response.json();
      
      if (data.logs) {
        const logMessages = data.logs.map((log: any) => 
          `[${log.type || 'info'}] ${log.message || log.text || JSON.stringify(log)}`
        );
        setLogs(logMessages);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
      setLogs(['Error loading logs. Please try again.']);
    }
  };

  const loadRuntimeLogs = async () => {
    if (!projectId || projectId === 'undefined') {
      setRuntimeLogs([{ level: 'error', message: 'Project ID not found. Please ensure a project is connected.', timestamp: Date.now() }]);
      return;
    }

    setLoadingRuntimeLogs(true);
    try {
      const response = await fetch(
        `/api/vercel/projects/${projectId}/deployments/${deploymentId}/runtime-logs?token=${vercelToken}`
      );
      const data = await response.json();
      
      if (response.ok && data.logs) {
        setRuntimeLogs(data.logs);
      } else {
        setRuntimeLogs([{ level: 'error', message: data.error || 'Failed to load runtime logs', timestamp: Date.now() }]);
      }
    } catch (err) {
      console.error('Failed to load runtime logs:', err);
      setRuntimeLogs([{ level: 'error', message: 'Error loading runtime logs. Please try again.', timestamp: Date.now() }]);
    } finally {
      setLoadingRuntimeLogs(false);
    }
  };

  const refreshLogs = () => {
    loadDeploymentLogs();
  };

  const refreshRuntimeLogs = () => {
    loadRuntimeLogs();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Deployment Details</DialogTitle>
          <DialogDescription>
            {deploymentId}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="logs">
              <Terminal className="w-4 h-4 mr-2" />
              Build Logs
            </TabsTrigger>
            <TabsTrigger value="runtime" onClick={() => {
              if (runtimeLogs.length === 0 && !loadingRuntimeLogs) {
                loadRuntimeLogs();
              }
            }}>
              <Activity className="w-4 h-4 mr-2" />
              Runtime Logs
            </TabsTrigger>
            <TabsTrigger value="details">
              <Lightbulb className="w-4 h-4 mr-2" />
              Details
            </TabsTrigger>
          </TabsList>

          {/* Logs Tab */}
          <TabsContent value="logs" className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">
                {logs.length} log entries
              </p>
              <Button onClick={refreshLogs} size="sm" variant="outline">
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </Button>
            </div>
            <ScrollArea className="h-[500px] w-full border rounded-lg">
              <div className="bg-black text-green-400 p-4 font-mono text-xs space-y-1">
                {logs.length > 0 ? (
                  logs.map((log: string, i: number) => (
                    <div key={i} className="whitespace-pre-wrap break-all">{log}</div>
                  ))
                ) : (
                  <div className="text-gray-500">
                    {loading ? 'Loading logs...' : 'No logs available for this deployment.'}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Runtime Logs Tab */}
          <TabsContent value="runtime" className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">
                {runtimeLogs.length} runtime log entries
              </p>
              <Button onClick={refreshRuntimeLogs} size="sm" variant="outline" disabled={loadingRuntimeLogs}>
                <RefreshCw className={`w-3 h-3 mr-1 ${loadingRuntimeLogs ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <ScrollArea className="h-[500px] w-full border rounded-lg">
              <div className="bg-slate-950 p-4 space-y-2">
                {loadingRuntimeLogs ? (
                  <div className="flex items-center justify-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Loading runtime logs...
                  </div>
                ) : runtimeLogs.length > 0 ? (
                  runtimeLogs.map((log: any, i: number) => {
                    // Determine color based on log level
                    const levelColors = {
                      error: 'text-red-400 bg-red-950/30 border-red-800',
                      warning: 'text-yellow-400 bg-yellow-950/30 border-yellow-800',
                      info: 'text-blue-400 bg-blue-950/30 border-blue-800',
                    };
                    const colorClass = levelColors[log.level as keyof typeof levelColors] || levelColors.info;

                    // Format status code color
                    let statusColor = 'text-slate-400';
                    if (log.responseStatusCode) {
                      const code = log.responseStatusCode;
                      if (code >= 500) statusColor = 'text-red-400';
                      else if (code >= 400) statusColor = 'text-yellow-400';
                      else if (code >= 200 && code < 300) statusColor = 'text-green-400';
                    }

                    return (
                      <div key={i} className={`border rounded p-3 ${colorClass} font-mono text-xs`}>
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="uppercase text-[10px]">
                              {log.level}
                            </Badge>
                            {log.source && (
                              <Badge variant="secondary" className="text-[10px]">
                                {log.source}
                              </Badge>
                            )}
                          </div>
                          {log.timestamp && (
                            <span className="text-[10px] text-slate-500">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          )}
                        </div>
                        
                        {/* Request Info */}
                        {(log.requestMethod || log.requestPath) && (
                          <div className="mb-2 flex items-center gap-2 text-slate-300">
                            {log.requestMethod && (
                              <Badge variant="outline" className="text-[10px] font-bold">
                                {log.requestMethod}
                              </Badge>
                            )}
                            {log.requestPath && (
                              <code className="text-[11px]">{log.requestPath}</code>
                            )}
                            {log.responseStatusCode && (
                              <Badge variant="outline" className={`text-[10px] ${statusColor}`}>
                                {log.responseStatusCode}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Domain */}
                        {log.domain && (
                          <div className="mb-2 text-[10px] text-slate-400">
                            Domain: <code>{log.domain}</code>
                          </div>
                        )}

                        {/* Log Message */}
                        <div className="whitespace-pre-wrap break-all">
                          {log.message || JSON.stringify(log, null, 2)}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-slate-500 text-center py-12">
                    No runtime logs available for this deployment yet.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[500px] w-full">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : deploymentInfo ? (
                <div className="space-y-4">
                  {/* Status Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">State:</span>
                        <Badge variant={deploymentInfo.status === 'READY' ? 'default' : 'secondary'}>
                          {deploymentInfo.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Target:</span>
                        <Badge variant="outline">{deploymentInfo.target || 'preview'}</Badge>
                      </div>
                      {deploymentInfo.url && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">URL:</span>
                          <Button size="sm" variant="link" asChild className="p-0 h-auto">
                            <a href={deploymentInfo.url} target="_blank" rel="noopener noreferrer">
                              {deploymentInfo.url} <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Timing Section */}
                  {(deploymentInfo.createdAt || deploymentInfo.buildingAt || deploymentInfo.readyAt) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Timeline</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {deploymentInfo.createdAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Created:</span>
                            <span className="text-sm">{new Date(deploymentInfo.createdAt).toLocaleString()}</span>
                          </div>
                        )}
                        {deploymentInfo.buildingAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Building Started:</span>
                            <span className="text-sm">{new Date(deploymentInfo.buildingAt).toLocaleString()}</span>
                          </div>
                        )}
                        {deploymentInfo.readyAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Ready:</span>
                            <span className="text-sm">{new Date(deploymentInfo.readyAt).toLocaleString()}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Commit Info */}
                  {deploymentInfo.commit && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Git Commit</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">SHA:</span>
                          <code className="text-sm font-mono">{deploymentInfo.commit.sha?.substring(0, 7)}</code>
                        </div>
                        {deploymentInfo.commit.message && (
                          <div>
                            <span className="text-sm text-muted-foreground">Message:</span>
                            <p className="text-sm mt-1">{deploymentInfo.commit.message}</p>
                          </div>
                        )}
                        {deploymentInfo.commit.author && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Author:</span>
                            <span className="text-sm">{deploymentInfo.commit.author}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Error Info */}
                  {deploymentInfo.errorMessage && (
                    <Card className="border-red-500">
                      <CardHeader>
                        <CardTitle className="text-sm text-red-500">Error</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-red-600">{deploymentInfo.errorMessage}</p>
                        {deploymentInfo.errorCode && (
                          <p className="text-xs text-muted-foreground mt-2">Code: {deploymentInfo.errorCode}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  No deployment details available
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Logs Tab Component
function LogsTab({ logs, deploymentId }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Build Logs</CardTitle>
        {deploymentId && (
          <CardDescription>Deployment: {deploymentId}</CardDescription>
        )}
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
