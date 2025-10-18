// Simple test for JSON parsing
console.log('Testing basic JSON parsing...');

const testJson = '{"tool": "write_file", "path": "test.tsx", "content": "test content"}';
try {
  const parsed = JSON.parse(testJson);
  console.log('Basic JSON parsing works:', parsed.tool);
  console.log('Path:', parsed.path);
  console.log('Has content:', !!parsed.content);
} catch(e) {
  console.error('JSON parsing failed:', e.message);
}

console.log('\nTesting malformed JSON...');
const malformedJson = `{
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
}`;

try {
  const parsed = JSON.parse(malformedJson);
  console.log('Malformed JSON parsed successfully');
} catch(e) {
  console.error('Malformed JSON failed as expected:', e.message);
}