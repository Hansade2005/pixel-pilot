Instruction: Limit 'check error' Tool Calls to Two

Scope

- Audience: AI agents and server-side agents that call the project's "check error" or `get_errors` tool.
- Purpose: Ensure the agent calls the 'check error' tool at most twice when handling a top-level error and provides a clear report after the second call.

Rules

1. Call Limit
   - You may call the 'check error' tool at most 2 times during a single request or action. Track the number of calls in a local counter.
2. When to Call
   - Call the tool only when you detect a top-level or blocking error that prevents further progress.
   - The first call should be used to gather errors and see whether a quick fix is obvious.
   - The second call should be used only if the first call produced new information and a follow-up check is required.
3. Reporting
   - After each call, summarize the results in two lines:
     - "check_error_call_n: <number_of_errors_found> errors"
     - "top_errors: <comma-separated list of top 3 error messages or filenames:line>"
   - After the second call (or after the single call if second is not needed), output a final summary:
     - "final_check_error_summary: total_calls=<n>, total_errors=<m>, recommended_action=<short instruction>"
4. Fallback Behaviour
   - If the tool fails or returns an empty response, do not call it again unless you have a clear new action to justify the second call.
   - If the call limit is reached, stop calling the tool and proceed with best-effort analysis. Include the message:
     - "note: check_error call limit reached; proceeding with best-effort analysis"
5. Safety and Idempotence
   - The 'check error' tool calls should be considered non-destructive; do not attempt to modify files within those calls.

Example Output

call_1: 3 errors
top_errors: src/App.tsx:45 UncaughtTypeError, src/main.tsx:12 ModuleNotFoundError, src/utils.js:102 SyntaxError

call_2: 1 errors
top_errors: src/App.tsx:45 UncaughtTypeError

final_check_error_summary: total_calls=2, total_errors=4, recommended_action=Fix the TypeError in src/App.tsx line 45 and re-run checks

note: check_error call limit reached; proceeding with best-effort analysis

Implementation Note (optional)

- Consider adding a server-side guard if agents can call the tool directly (e.g., limit calls per request ID/session).
- For coordinated multi-agent systems, persist the call count in a short-lived context to prevent duplication.
