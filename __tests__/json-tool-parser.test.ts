/**
 * Test JSON Tool Parser functionality
 */

import { jsonToolParser } from '../components/workspace/json-tool-parser'

// Test JSON tool detection
console.log('🧪 Testing JSON Tool Parser...')

// Test case 1: write_file tool
const testContent1 = `
Looking at the code, I'll create a new file for you:

\`\`\`json
{
  "tool": "write_file",
  "path": "src/components/NewComponent.tsx",
  "content": "import React from 'react';\n\nexport const NewComponent = () => {\n  return <div>Hello World</div>;\n};"
}
\`\`\`

This will create the component file.
`

const result1 = jsonToolParser.parseJsonTools(testContent1)
console.log('✅ Test 1 - write_file:', result1.tools.length, 'tools detected')
console.log('Tool details:', result1.tools[0])

// Test case 2: edit_file tool
const testContent2 = `
I'll update the existing file:

\`\`\`json
{
  "tool": "edit_file",
  "path": "src/utils/helper.ts",
  "operation": "search_replace",
  "search": "old code",
  "replace": "new code"
}
\`\`\`

The file has been updated.
`

const result2 = jsonToolParser.parseJsonTools(testContent2)
console.log('✅ Test 2 - edit_file:', result2.tools.length, 'tools detected')

// Test case 3: Multiple tools
const testContent3 = `
I'll create multiple files:

\`\`\`json
{
  "tool": "write_file",
  "path": "src/types/User.ts",
  "content": "export interface User { id: string; name: string; }"
}
\`\`\`

And then:

\`\`\`json
{
  "tool": "write_file", 
  "path": "src/services/userService.ts",
  "content": "import { User } from '../types/User';\n\nexport const getUser = async (id: string): Promise<User> => {\n  // implementation\n};"
}
\`\`\`

Both files created!
`

const result3 = jsonToolParser.parseJsonTools(testContent3)
console.log('✅ Test 3 - Multiple tools:', result3.tools.length, 'tools detected')

// Test case 4: delete_file tool
const testContent4 = `
I'll remove the old file:

\`\`\`json
{
  "tool": "delete_file",
  "path": "src/components/OldComponent.tsx"
}
\`\`\`

File deleted successfully.
`

const result4 = jsonToolParser.parseJsonTools(testContent4)
console.log('✅ Test 4 - delete_file:', result4.tools.length, 'tools detected')

// Test case 5: Malformed JSON (missing quotes, unescaped content)
const testContent5 = `
Here's a malformed JSON that should still be parsed:

{
 "tool": "write_file",
 "path": "src/pages/RideDetails.tsx",
content": "import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Calendar, Clock, Users, Car, Star, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

export function RideDetails() {
  return <div>Test</div>
}"
}
`

const result5 = jsonToolParser.parseJsonTools(testContent5)
console.log('✅ Test 5 - Malformed JSON:', result5.tools.length, 'tools detected')
if (result5.tools.length > 0) {
  console.log('Tool parsed successfully:', result5.tools[0].tool)
  console.log('Path:', result5.tools[0].path)
  console.log('Content length:', result5.tools[0].content?.length || 0)
}

console.log('🎉 All JSON tool parser tests completed!')
console.log('📊 Total tools detected across all tests:',
  result1.tools.length + result2.tools.length + result3.tools.length + result4.tools.length + result5.tools.length)