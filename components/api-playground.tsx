"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Play, 
  Copy, 
  Check, 
  Key, 
  Database, 
  Table2, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface Database {
  id: number
  name: string
}

interface Table {
  id: number
  name: string
  schema: any
}

interface ApiKey {
  id: string
  key_prefix: string
  name: string
}

export function APIPlayground() {
  const [user, setUser] = useState<any>(null)
  const [databases, setDatabases] = useState<Database[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [selectedDatabase, setSelectedDatabase] = useState<string>("")
  const [selectedTable, setSelectedTable] = useState<string>("")
  const [selectedApiKey, setSelectedApiKey] = useState<string>("")
  const [selectedMethod, setSelectedMethod] = useState<string>("GET")
  const [recordId, setRecordId] = useState<string>("")
  const [requestBody, setRequestBody] = useState<string>('{\n  "data": {\n    "name": "John Doe",\n    "email": "john@example.com"\n  }\n}')
  const [response, setResponse] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [statusCode, setStatusCode] = useState<number | null>(null)
  const [responseTime, setResponseTime] = useState<number | null>(null)
  const [copied, setCopied] = useState<string>("")
  const { toast } = useToast()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (selectedDatabase) {
      loadTables()
      loadApiKeys()
    }
  }, [selectedDatabase])

  const checkUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      await loadDatabases(user.id)
    }
    setLoadingData(false)
  }

  const loadDatabases = async (userId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('databases')
      .select('id, name')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (data && data.length > 0) {
      setDatabases(data)
      setSelectedDatabase(data[0].id.toString())
    }
  }

  const loadTables = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tables')
      .select('id, name, schema')
      .eq('database_id', parseInt(selectedDatabase))
      .order('created_at', { ascending: false })

    if (data && data.length > 0) {
      setTables(data)
      setSelectedTable(data[0].id.toString())
    } else {
      setTables([])
      setSelectedTable("")
    }
  }

  const loadApiKeys = async () => {
    try {
      const response = await fetch(`/api/database/${selectedDatabase}/api-keys`)
      if (response.ok) {
        const data = await response.json()
        if (data.keys && data.keys.length > 0) {
          setApiKeys(data.keys)
          setSelectedApiKey(data.keys[0].id)
        } else {
          setApiKeys([])
          setSelectedApiKey("")
        }
      }
    } catch (error) {
      console.error("Error loading API keys:", error)
      setApiKeys([])
    }
  }

  const getEndpoint = () => {
    if (!selectedDatabase || !selectedTable) return ""
    
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://pipilot.dev'
    let endpoint = `${baseUrl}/api/v1/databases/${selectedDatabase}/tables/${selectedTable}/records`
    
    if ((selectedMethod === 'PUT' || selectedMethod === 'DELETE') && recordId) {
      endpoint += `/${recordId}`
    }
    
    return endpoint
  }

  const executeRequest = async () => {
    if (!selectedApiKey) {
      toast({
        title: "API Key Required",
        description: "Please select an API key to make requests",
        variant: "destructive"
      })
      return
    }

    if ((selectedMethod === 'PUT' || selectedMethod === 'DELETE') && !recordId) {
      toast({
        title: "Record ID Required",
        description: `${selectedMethod} requests require a record ID`,
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    setResponse("")
    setStatusCode(null)
    setResponseTime(null)

    const startTime = Date.now()

    try {
      const endpoint = getEndpoint()
      const options: RequestInit = {
        method: selectedMethod,
        headers: {
          'Authorization': `Bearer ${selectedApiKey}`,
          'Content-Type': 'application/json'
        }
      }

      if ((selectedMethod === 'POST' || selectedMethod === 'PUT') && requestBody) {
        try {
          JSON.parse(requestBody) // Validate JSON
          options.body = requestBody
        } catch (e) {
          toast({
            title: "Invalid JSON",
            description: "Request body must be valid JSON",
            variant: "destructive"
          })
          setLoading(false)
          return
        }
      }

      const response = await fetch(endpoint, options)
      const endTime = Date.now()
      setResponseTime(endTime - startTime)
      setStatusCode(response.status)
      
      const data = await response.json()
      setResponse(JSON.stringify(data, null, 2))
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `${selectedMethod} request completed successfully`
        })
      } else {
        toast({
          title: "Request Failed",
          description: `Status ${response.status}: ${data.error || 'Unknown error'}`,
          variant: "destructive"
        })
      }
    } catch (error: any) {
      const endTime = Date.now()
      setResponseTime(endTime - startTime)
      setStatusCode(0)
      setResponse(JSON.stringify({ error: error.message }, null, 2))
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const copyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code)
    setCopied(type)
    setTimeout(() => setCopied(""), 2000)
    toast({
      title: "Copied!",
      description: "Code copied to clipboard"
    })
  }

  const generateCurlCommand = () => {
    const endpoint = getEndpoint()
    let curl = `curl -X ${selectedMethod} '${endpoint}' \\\n`
    curl += `  -H 'Authorization: Bearer ${selectedApiKey || 'YOUR_API_KEY'}' \\\n`
    curl += `  -H 'Content-Type: application/json'`
    
    if ((selectedMethod === 'POST' || selectedMethod === 'PUT') && requestBody) {
      curl += ` \\\n  -d '${requestBody.replace(/\n/g, '').replace(/\s+/g, ' ')}'`
    }
    
    return curl
  }

  const generateJavaScriptCode = () => {
    const endpoint = getEndpoint()
    let code = `const response = await fetch('${endpoint}', {\n`
    code += `  method: '${selectedMethod}',\n`
    code += `  headers: {\n`
    code += `    'Authorization': 'Bearer ${selectedApiKey || 'YOUR_API_KEY'}',\n`
    code += `    'Content-Type': 'application/json'\n`
    code += `  }`
    
    if ((selectedMethod === 'POST' || selectedMethod === 'PUT') && requestBody) {
      code += `,\n  body: JSON.stringify(${requestBody})`
    }
    
    code += `\n});\n\nconst data = await response.json();\nconsole.log(data);`
    
    return code
  }

  const generatePythonCode = () => {
    const endpoint = getEndpoint()
    let code = `import requests\n\n`
    code += `response = requests.${selectedMethod.toLowerCase()}(\n`
    code += `    '${endpoint}',\n`
    code += `    headers={\n`
    code += `        'Authorization': 'Bearer ${selectedApiKey || 'YOUR_API_KEY'}',\n`
    code += `        'Content-Type': 'application/json'\n`
    code += `    }`
    
    if ((selectedMethod === 'POST' || selectedMethod === 'PUT') && requestBody) {
      code += `,\n    json=${requestBody.replace(/\n/g, '').replace(/\s+/g, ' ')}`
    }
    
    code += `\n)\n\ndata = response.json()\nprint(data)`
    
    return code
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign In Required</CardTitle>
          <CardDescription>
            Please sign in to use the API Playground
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (databases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Databases Found</CardTitle>
          <CardDescription>
            Create your first database to start testing the API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/workspace">Create Database</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (tables.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Tables Found</CardTitle>
          <CardDescription>
            Create tables in your database to test the API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href={`/workspace/${selectedDatabase}/database`}>Create Table</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (apiKeys.length === 0) {
    return (
      <Card className="border-orange-500/50 bg-orange-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <CardTitle>API Key Required</CardTitle>
          </div>
          <CardDescription>
            You need to create an API key before you can test the API endpoints
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">To create an API key:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Go to your database page</li>
              <li>Click the "API Keys" tab</li>
              <li>Click "Create API Key"</li>
              <li>Give it a name and save</li>
              <li>Come back here to test your API</li>
            </ol>
          </div>
          <Button asChild className="w-full">
            <Link href={`/workspace/${selectedDatabase}/database`}>
              Go to Database <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Side - Request Builder */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="h-5 w-5" />
              Request Builder
            </CardTitle>
            <CardDescription>
              Configure and execute API requests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Database Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database
              </Label>
              <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
                <SelectTrigger>
                  <SelectValue placeholder="Select database" />
                </SelectTrigger>
                <SelectContent>
                  {databases.map((db) => (
                    <SelectItem key={db.id} value={db.id.toString()}>
                      {db.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Table2 className="h-4 w-4" />
                Table
              </Label>
              <Select value={selectedTable} onValueChange={setSelectedTable} disabled={tables.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.id} value={table.id.toString()}>
                      {table.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* API Key Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Key
              </Label>
              <Select value={selectedApiKey} onValueChange={setSelectedApiKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select API key" />
                </SelectTrigger>
                <SelectContent>
                  {apiKeys.map((key) => (
                    <SelectItem key={key.id} value={key.id}>
                      {key.name} ({key.key_prefix}...)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Method Selection */}
            <div className="space-y-2">
              <Label>HTTP Method</Label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET - List all records</SelectItem>
                  <SelectItem value="POST">POST - Create a record</SelectItem>
                  <SelectItem value="PUT">PUT - Update a record</SelectItem>
                  <SelectItem value="DELETE">DELETE - Delete a record</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Record ID (for PUT/DELETE) */}
            {(selectedMethod === 'PUT' || selectedMethod === 'DELETE') && (
              <div className="space-y-2">
                <Label>Record ID</Label>
                <Input
                  placeholder="Enter record ID"
                  value={recordId}
                  onChange={(e) => setRecordId(e.target.value)}
                />
              </div>
            )}

            {/* Endpoint Display */}
            <div className="space-y-2">
              <Label>Endpoint</Label>
              <div className="relative">
                <Input 
                  value={getEndpoint()} 
                  readOnly 
                  className="font-mono text-xs pr-10"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => copyCode(getEndpoint(), 'endpoint')}
                >
                  {copied === 'endpoint' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            {/* Request Body (for POST/PUT) */}
            {(selectedMethod === 'POST' || selectedMethod === 'PUT') && (
              <div className="space-y-2">
                <Label>Request Body (JSON)</Label>
                <Textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="font-mono text-sm min-h-[150px]"
                  placeholder='{"data": {...}}'
                />
              </div>
            )}

            {/* Execute Button */}
            <Button 
              onClick={executeRequest} 
              disabled={loading || !selectedDatabase || !selectedTable || !selectedApiKey}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Execute Request
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Response */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Response</CardTitle>
              {statusCode !== null && (
                <div className="flex items-center gap-2">
                  {statusCode >= 200 && statusCode < 300 ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {statusCode}
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {statusCode || 'Error'}
                    </Badge>
                  )}
                  {responseTime !== null && (
                    <Badge variant="outline">
                      {responseTime}ms
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {response && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 z-10"
                  onClick={() => copyCode(response, 'response')}
                >
                  {copied === 'response' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              )}
              <pre className="bg-black/50 p-4 rounded-lg overflow-auto max-h-[400px] text-xs font-mono">
                {response || "// Execute a request to see the response here"}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Side - Code Examples */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Code Examples</CardTitle>
            <CardDescription>
              Copy-paste ready code for your application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="curl" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
              </TabsList>
              
              <TabsContent value="curl" className="mt-4">
                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => copyCode(generateCurlCommand(), 'curl')}
                  >
                    {copied === 'curl' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <pre className="bg-black/50 p-4 rounded-lg overflow-auto max-h-[500px] text-xs font-mono">
                    {generateCurlCommand()}
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="javascript" className="mt-4">
                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => copyCode(generateJavaScriptCode(), 'js')}
                  >
                    {copied === 'js' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <pre className="bg-black/50 p-4 rounded-lg overflow-auto max-h-[500px] text-xs font-mono">
                    {generateJavaScriptCode()}
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="python" className="mt-4">
                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => copyCode(generatePythonCode(), 'python')}
                  >
                    {copied === 'python' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <pre className="bg-black/50 p-4 rounded-lg overflow-auto max-h-[500px] text-xs font-mono">
                    {generatePythonCode()}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-lg">💡 Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>GET</strong> - Fetches all records from the selected table</p>
            <p>• <strong>POST</strong> - Creates a new record with the data you provide</p>
            <p>• <strong>PUT</strong> - Updates an existing record (requires Record ID)</p>
            <p>• <strong>DELETE</strong> - Removes a record (requires Record ID)</p>
            <p>• All requests are made against your <strong>real database</strong></p>
            <p>• Code examples update automatically based on your selections</p>
            <p>• API keys can be managed in your database settings</p>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href={`/workspace/${selectedDatabase}/database`}>
                <Database className="h-4 w-4 mr-2" />
                Manage Database
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/docs">
                <ExternalLink className="h-4 w-4 mr-2" />
                API Documentation
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
