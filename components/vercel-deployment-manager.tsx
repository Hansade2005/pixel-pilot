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
  const [framework, setFramework] = useState('');
  const [showTokens, setShowTokens] = useState(false);
  const [localVercelToken, setLocalVercelToken] = useState(vercelToken || '');
  const [localGithubToken, setLocalGithubToken] = useState(githubToken || '');

  // Load workspaces and check for existing deployment
  useEffect(() => {
    loadWorkspaces();
  }, [workspaceId]);

  // Load GitHub repos when token is available
  useEffect(() => {
    if (localGithubToken) {
      loadGithubRepos();
    }
  }, [localGithubToken]);

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
      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
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
          framework: framework || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      setProject({
        projectId: data.projectId,
        projectName: data.projectName,
        url: data.url,
        status: data.status,
        framework: data.framework,
        lastDeployed: Date.now(),
      });

      setCurrentDeploymentId(data.deploymentId);
      
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
          withLatestCommit: true,
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
          loadLogs(deploymentId);
          return true;
        } else if (data.status === 'ERROR') {
          setError(`Deployment failed: ${data.errorMessage || 'Unknown error'}`);
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

    eventSource.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);
        setLogs(prev => [...prev, `[${log.type}] ${log.message}`]);
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
        setLogs(data.logs.map((log: any) => `[${log.type}] ${log.message}`));
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
      }
    } catch (err) {
      console.error('Failed to load deployments:', err);
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
          />
        </TabsContent>

        {/* Domains Tab */}
        <TabsContent value="domains">
          <DomainsTab
            domains={domains}
            projectId={project?.projectId || ''}
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
              value={selectedWorkspace?.id || ''} 
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
                  {githubRepos.map((repo: any) => (
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
              <SelectItem value="">Auto-detect</SelectItem>
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
function DeploymentsTab({ deployments, loading, onRefresh, projectUrl }: any) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Deployment History</CardTitle>
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
              <div key={deployment.id} className="border rounded-lg p-4 space-y-2">
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
                
                <Button size="sm" variant="link" asChild className="p-0 h-auto">
                  <a href={deployment.url} target="_blank" rel="noopener noreferrer">
                    {deployment.url} <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
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
function DomainsTab({ domains, projectId, vercelToken, onRefresh }: any) {
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
          domain: newDomain,
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
function BuyDomainDialog({ projectId, vercelToken, onSuccess }: any) {
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
          domain,
          vercelToken,
          firstName,
          lastName,
          email,
          phone,
          address,
          city,
          state,
          postalCode,
          country,
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
