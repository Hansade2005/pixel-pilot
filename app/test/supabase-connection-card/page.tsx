/**
 * Test page for SupabaseConnectionCard component
 * 
 * Navigate to: /test/supabase-connection-card
 * 
 * This page demonstrates the SupabaseConnectionCard with various configurations
 */

import { SupabaseConnectionCard } from '@/components/workspace/supabase-connection-card'

export default function TestSupabaseConnectionCard() {
  return (
    <div className="min-h-screen bg-background p-8 space-y-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Supabase Connection Card Tests</h1>
          <p className="text-muted-foreground">
            Visual testing for the request_supabase_connection tool rendering
          </p>
        </div>

        {/* Test 1: Default Props */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">1. Default Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Using all default values (no props passed)
          </p>
          <SupabaseConnectionCard />
        </section>

        {/* Test 2: Custom Title and Description */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">2. Custom Title & Description</h2>
          <p className="text-sm text-muted-foreground">
            Tailored messaging for deployment scenario
          </p>
          <SupabaseConnectionCard
            title="Production Deployment - Connection Required"
            description="I need to authenticate with your Supabase account to deploy the schema changes safely. This ensures I'm deploying to the correct project."
          />
        </section>

        {/* Test 3: Custom Button Labels */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">3. Custom Button Labels</h2>
          <p className="text-sm text-muted-foreground">
            Modified CTA labels for inspection use case
          </p>
          <SupabaseConnectionCard
            title="View Database Schema"
            description="Connect your project so I can inspect your current tables, columns, and relationships."
            labels={{
              connectAuth: "Authenticate to View",
              manageProject: "Select Database"
            }}
          />
        </section>

        {/* Test 4: Minimal Custom Props */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">4. Title Only</h2>
          <p className="text-sm text-muted-foreground">
            Custom title with default description and labels
          </p>
          <SupabaseConnectionCard
            title="Reconnect to Run Query"
          />
        </section>

        {/* Test 5: All Custom Props */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">5. Fully Customized</h2>
          <p className="text-sm text-muted-foreground">
            All props customized for specific context
          </p>
          <SupabaseConnectionCard
            title="Set Up User Authentication"
            description="Before I can create the authentication tables and configure security policies, we need to connect to your Supabase project."
            labels={{
              connectAuth: "Connect for Auth Setup",
              manageProject: "Choose Auth Project"
            }}
          />
        </section>

        {/* Test 6: Error Recovery Scenario */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">6. Error Recovery Context</h2>
          <p className="text-sm text-muted-foreground">
            When previous operation failed due to connection issues
          </p>
          <SupabaseConnectionCard
            title="Connection Lost - Please Reconnect"
            description="Your previous query failed because the Supabase connection was interrupted. Please reconnect to continue."
            labels={{
              connectAuth: "Reconnect Account",
              manageProject: "Verify Project"
            }}
          />
        </section>

        {/* Dark Mode Test Section */}
        <section className="space-y-4 border-t pt-8">
          <h2 className="text-xl font-semibold">Theme Testing</h2>
          <p className="text-sm text-muted-foreground">
            Toggle your system/app theme to test dark mode appearance
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">
              The card should maintain visual hierarchy and readability in both light and dark modes.
              Gradients, borders, and text colors all adapt automatically.
            </p>
          </div>
        </section>

        {/* Usage Notes */}
        <section className="space-y-4 border-t pt-8">
          <h2 className="text-xl font-semibold">Usage Notes</h2>
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <p><strong>Tool Name:</strong> request_supabase_connection</p>
            <p><strong>Type:</strong> Client-side UI tool (no server execution)</p>
            <p><strong>Rendering:</strong> Special handling (not a pill)</p>
            <p><strong>Click Test:</strong> Buttons should open in new tabs</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Step 1 button → https://pipilot.dev/workspace/account</li>
              <li>Step 2 button → https://pipilot.dev/workspace/management</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
