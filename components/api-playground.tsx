"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Code,
  Terminal,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  FileJson
} from "lucide-react"

export function APIPlayground() {
  const [method, setMethod] = useState("GET")
  const [endpoint, setEndpoint] = useState("/api/v1/users")
  const [headers, setHeaders] = useState(`{
  "Authorization": "Bearer your-api-key",
  "Content-Type": "application/json"
}`)
  const [body, setBody] = useState(`{
  "name": "John Doe",
  "email": "john@example.com"
}`)
  const [response, setResponse] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [responseTime, setResponseTime] = useState<number>(0)
  const [statusCode, setStatusCode] = useState<number>(0)
  const [copied, setCopied] = useState(false)
  const [generatedCode, setGeneratedCode] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState("javascript")

  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"]
  
  const quickEndpoints = [
    { label: "Get all users", method: "GET", path: "/api/v1/users" },
    { label: "Get user by ID", method: "GET", path: "/api/v1/users/:id" },
    { label: "Create user", method: "POST", path: "/api/v1/users" },
    { label: "Update user", method: "PATCH", path: "/api/v1/users/:id" },
    { label: "Delete user", method: "DELETE", path: "/api/v1/users/:id" },
    { label: "List tables", method: "GET", path: "/api/v1/tables" },
    { label: "Query table", method: "POST", path: "/api/v1/query" }
  ]

  const executeRequest = async () => {
    setIsLoading(true)
    const startTime = Date.now()
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700))
    
    const endTime = Date.now()
    setResponseTime(endTime - startTime)
    
    // Mock response based on method
    let mockResponse: any = {}
    let mockStatus = 200
    
    if (method === "GET") {
      mockResponse = {
        data: [
          { id: "1", name: "John Doe", email: "john@example.com", created_at: "2024-01-15T10:30:00Z" },
          { id: "2", name: "Jane Smith", email: "jane@example.com", created_at: "2024-01-16T14:20:00Z" }
        ],
        count: 2
      }
    } else if (method === "POST") {
      mockResponse = {
        data: {
          id: "3",
          name: "John Doe",
          email: "john@example.com",
          created_at: new Date().toISOString()
        },
        message: "User created successfully"
      }
      mockStatus = 201
    } else if (method === "PATCH") {
      mockResponse = {
        data: {
          id: "1",
          name: "John Doe Updated",
          email: "john.updated@example.com",
          updated_at: new Date().toISOString()
        },
        message: "User updated successfully"
      }
    } else if (method === "DELETE") {
      mockResponse = {
        message: "User deleted successfully"
      }
      mockStatus = 204
    }
    
    setResponse(mockResponse)
    setStatusCode(mockStatus)
    setIsLoading(false)
    generateCode()
  }

  const generateCode = () => {
    const parsedHeaders = JSON.parse(headers)
    const authHeader = parsedHeaders.Authorization || "Bearer your-api-key"
    
    const codeSnippets: Record<string, string> = {
      javascript: `// Using fetch API
const response = await fetch('https://api.aiappbuilder.com${endpoint}', {
  method: '${method}',
  headers: {
    'Authorization': '${authHeader}',
    'Content-Type': 'application/json'
  }${method !== "GET" && method !== "DELETE" ? `,
  body: JSON.stringify(${body})` : ""}
})

const data = await response.json()
console.log(data)`,
      
      python: `# Using requests library
import requests

response = requests.${method.toLowerCase()}(
    'https://api.aiappbuilder.com${endpoint}',
    headers={
        'Authorization': '${authHeader}',
        'Content-Type': 'application/json'
    }${method !== "GET" && method !== "DELETE" ? `,
    json=${body}` : ""}
)

data = response.json()
print(data)`,
      
      curl: `curl -X ${method} \\
  'https://api.aiappbuilder.com${endpoint}' \\
  -H 'Authorization: ${authHeader}' \\
  -H 'Content-Type: application/json'${method !== "GET" && method !== "DELETE" ? ` \\
  -d '${body.replace(/\n/g, "").replace(/\s+/g, " ")}'` : ""}`
    }
    
    setGeneratedCode(codeSnippets[selectedLanguage])
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const loadQuickEndpoint = (quickEndpoint: typeof quickEndpoints[0]) => {
    setMethod(quickEndpoint.method)
    setEndpoint(quickEndpoint.path)
    
    if (quickEndpoint.method === "POST") {
      setBody(`{
  "name": "John Doe",
  "email": "john@example.com"
}`)
    } else if (quickEndpoint.method === "PATCH") {
      setBody(`{
  "name": "John Doe Updated"
}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {quickEndpoints.map((qe, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => loadQuickEndpoint(qe)}
                className="text-xs"
              >
                <Badge variant="outline" className="mr-2 px-1 text-[10px]">
                  {qe.method}
                </Badge>
                {qe.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Request Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Method & Endpoint */}
            <div className="flex gap-2">
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {methods.map((m) => (
                    <SelectItem key={m} value={m}>
                      <Badge variant="outline" className={
                        m === "GET" ? "bg-blue-500/10 border-blue-500/30" :
                        m === "POST" ? "bg-green-500/10 border-green-500/30" :
                        m === "PUT" || m === "PATCH" ? "bg-yellow-500/10 border-yellow-500/30" :
                        "bg-red-500/10 border-red-500/30"
                      }>
                        {m}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="/api/v1/endpoint"
                className="flex-1"
              />
            </div>

            {/* Headers */}
            <div className="space-y-2">
              <Label>Headers</Label>
              <Textarea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                className="font-mono text-sm min-h-24"
                placeholder="JSON headers"
              />
            </div>

            {/* Body (only for POST, PUT, PATCH) */}
            {(method === "POST" || method === "PUT" || method === "PATCH") && (
              <div className="space-y-2">
                <Label>Request Body</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="font-mono text-sm min-h-32"
                  placeholder="JSON body"
                />
              </div>
            )}

            {/* Execute Button */}
            <Button
              onClick={executeRequest}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Execute Request
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Response Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Response
              </span>
              {response && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={
                    statusCode >= 200 && statusCode < 300 ? "bg-green-500/10 border-green-500/30 text-green-400" :
                    statusCode >= 400 ? "bg-red-500/10 border-red-500/30 text-red-400" :
                    "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                  }>
                    {statusCode >= 200 && statusCode < 300 ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <AlertCircle className="h-3 w-3 mr-1" />
                    )}
                    {statusCode}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400">
                    <Clock className="h-3 w-3 mr-1" />
                    {responseTime}ms
                  </Badge>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {response ? (
              <div className="bg-black/50 p-4 rounded-lg border border-white/10 overflow-auto max-h-96">
                <pre className="text-sm text-green-400 whitespace-pre-wrap">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileJson className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm">Execute a request to see the response</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Code Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Generated Code
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyCode(generatedCode)}
              disabled={!generatedCode}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Code
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedLanguage} onValueChange={(v) => { setSelectedLanguage(v); generateCode(); }}>
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>
            <TabsContent value="javascript" className="mt-4">
              <div className="bg-black/50 p-4 rounded-lg border border-white/10">
                <pre className="text-sm text-green-400 whitespace-pre-wrap overflow-x-auto">
                  {generatedCode || "Configure your request and click Execute to generate code"}
                </pre>
              </div>
            </TabsContent>
            <TabsContent value="python" className="mt-4">
              <div className="bg-black/50 p-4 rounded-lg border border-white/10">
                <pre className="text-sm text-green-400 whitespace-pre-wrap overflow-x-auto">
                  {generatedCode || "Configure your request and click Execute to generate code"}
                </pre>
              </div>
            </TabsContent>
            <TabsContent value="curl" className="mt-4">
              <div className="bg-black/50 p-4 rounded-lg border border-white/10">
                <pre className="text-sm text-green-400 whitespace-pre-wrap overflow-x-auto">
                  {generatedCode || "Configure your request and click Execute to generate code"}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
