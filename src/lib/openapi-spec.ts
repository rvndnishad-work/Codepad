// OpenAPI 3.1 specification for the Interviewpad/Codepad HTTP API.
//
// Served (admin-gated) at GET /api/openapi and rendered by the Swagger UI page
// at /api-docs. Kept as a YAML string so it bundles reliably on Vercel and can
// be copied into Postman / editor.swagger.io as-is.
//
// Coverage: all 82 route handlers, grouped by domain tag. Core/integration
// endpoints (auth, execute, grade, snippets, MCP, webhooks) carry detailed
// request/response schemas; high-volume internal CRUD routes document method,
// auth, path params, and a representative JSON shape (bodies are validated
// server-side with zod — see the route source for exact fields).
export const openapiYaml = `openapi: 3.1.0
info:
  title: Interviewpad API
  version: "1.0.0"
  description: |
    HTTP API for the Interviewpad / Codepad platform (Next.js route handlers under /api).

    ## Authentication
    - **session** — NextAuth session cookie (browser). Most app endpoints.
    - **admin** — session cookie whose email is in ADMIN_EMAILS. Admin endpoints.
    - **apiKey** — \`Authorization: Bearer <workspace API key>\`. MCP endpoints only.
    - **cronSecret** — \`Authorization: Bearer <CRON_SECRET>\`. Cron endpoints (called by Vercel Cron).
    - **webhookSignature** — provider HMAC signature header (Stripe/Resend). No session.
    - **public** — no auth (still rate-limited).

    Errors are JSON: \`{ "error": string | object }\`. Rate-limited endpoints return 429.
servers:
  - url: https://interviewpad.in
    description: Production
  - url: http://localhost:3000
    description: Local development
tags:
  - name: Auth
    description: Registration and NextAuth session endpoints.
  - name: Snippets
    description: Code snippets / playgrounds CRUD and forking.
  - name: Code Execution
    description: Run untrusted code on the Piston sandbox.
  - name: Challenges
    description: Coding challenges, enrollment, attempts, server-side grading, invites, telemetry.
  - name: Prompt Challenges
    description: Prompt-engineering challenges, playground, attempts.
  - name: AI Interview
    description: Live AI screening interview message/observe/submit/practice + TTS.
  - name: Interviews
    description: Interview lifecycle (create, schedule, activate, manage).
  - name: Take-home
    description: Take-home assignment start.
  - name: Blogs
    description: Blog posts, comments, reactions, bookmarks, cover-image generation.
  - name: Notifications
    description: Per-user notification feed.
  - name: Users & Profile
    description: Current-user profile, user type, follow, portfolio.
  - name: Workspace
    description: Recruiter workspace — candidates, members, integrations, billing, take-home.
  - name: Admin
    description: Admin-only management (users, challenges, blogs, interviews, copilot, TTS).
  - name: MCP
    description: Model Context Protocol JSON-RPC endpoints (workspace API key auth).
  - name: Webhooks
    description: Inbound provider webhooks (Stripe, Resend).
  - name: Cron
    description: Scheduled jobs (Vercel Cron; CRON_SECRET bearer).
  - name: Integrations
    description: Outbound/ATS integration webhooks.
  - name: Misc
    description: Explore feed, oEmbed, LiveKit token, lobby link.
components:
  securitySchemes:
    session:
      type: apiKey
      in: cookie
      name: authjs.session-token
      description: NextAuth session cookie (set by signing in).
    apiKey:
      type: http
      scheme: bearer
      description: Workspace API key for MCP endpoints.
    cronSecret:
      type: http
      scheme: bearer
      description: CRON_SECRET, sent by Vercel Cron.
  schemas:
    Error:
      type: object
      properties:
        error:
          oneOf:
            - type: string
            - type: object
      required: [error]
    Ok:
      type: object
      properties:
        ok:
          type: boolean
          example: true
    GenericObject:
      type: object
      additionalProperties: true
      description: Shape validated server-side (zod). See route source for exact fields.
  responses:
    BadRequest:
      description: Invalid input.
      content:
        application/json:
          schema: { $ref: "#/components/schemas/Error" }
    Unauthorized:
      description: Not authenticated.
      content:
        application/json:
          schema: { $ref: "#/components/schemas/Error" }
    Forbidden:
      description: Authenticated but not allowed (e.g. not admin / not a workspace member).
      content:
        application/json:
          schema: { $ref: "#/components/schemas/Error" }
    NotFound:
      description: Resource not found.
      content:
        application/json:
          schema: { $ref: "#/components/schemas/Error" }
    RateLimited:
      description: Too many requests.
      content:
        application/json:
          schema: { $ref: "#/components/schemas/Error" }
    OkResponse:
      description: Success.
      content:
        application/json:
          schema: { $ref: "#/components/schemas/GenericObject" }
  parameters:
    Slug:
      name: slug
      in: path
      required: true
      schema: { type: string }
    Id:
      name: id
      in: path
      required: true
      schema: { type: string }
    Token:
      name: token
      in: path
      required: true
      schema: { type: string }
paths:
  /api/auth/register:
    post:
      tags: [Auth]
      summary: Register a new account (or set a password on an OAuth account)
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                name: { type: string, maxLength: 80 }
                email: { type: string, format: email, maxLength: 254 }
                password: { type: string, minLength: 8, maxLength: 200 }
                userType: { type: string, enum: [candidate, recruiter] }
      responses:
        "200": { description: Created, content: { application/json: { schema: { $ref: "#/components/schemas/Ok" } } } }
        "400": { $ref: "#/components/responses/BadRequest" }
        "409": { description: Email already registered, content: { application/json: { schema: { $ref: "#/components/schemas/Error" } } } }
        "429": { $ref: "#/components/responses/RateLimited" }
  /api/auth/{nextauth}:
    parameters:
      - name: nextauth
        in: path
        required: true
        schema: { type: string }
        description: NextAuth catch-all (signin, callback, session, csrf, signout, providers).
    get:
      tags: [Auth]
      summary: NextAuth handler (session, csrf, providers, callbacks)
      security: []
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
    post:
      tags: [Auth]
      summary: NextAuth handler (signin, signout, callback)
      security: []
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }

  /api/execute:
    post:
      tags: [Code Execution]
      summary: Run code on the Piston sandbox
      description: Executes untrusted code in an isolated, network-disabled jail. No emulator fallback. Rate limit 30/min (auth) or 10/min (guest).
      security: [{ session: [] }, {}]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [language, code]
              properties:
                language: { type: string, example: python, description: "One of python, javascript/node, typescript, go, java, cpp, rust." }
                code: { type: string, description: Source (max 64KB). }
                stdin: { type: string, description: Standard input (max 16KB). }
                speculative: { type: boolean, description: Allow cached/speculative result. }
      responses:
        "200":
          description: Execution result.
          content:
            application/json:
              schema:
                type: object
                properties:
                  stdout: { type: string }
                  stderr: { type: string }
                  exitCode: { type: integer }
                  timeMs: { type: integer }
                  compileError: { type: boolean }
                  signal: { type: [string, "null"] }
        "400": { $ref: "#/components/responses/BadRequest" }
        "429": { $ref: "#/components/responses/RateLimited" }
        "503": { description: Piston unavailable, content: { application/json: { schema: { $ref: "#/components/schemas/Error" } } } }

  /api/snippets:
    post:
      tags: [Snippets]
      summary: Create a snippet
      security: [{ session: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [title, template, files]
              properties:
                title: { type: string, minLength: 1, maxLength: 120 }
                template: { type: string }
                files:
                  type: object
                  additionalProperties:
                    oneOf: [{ type: string }, { type: object, properties: { code: { type: string } } }]
                visibility: { type: string, enum: [private, public] }
      responses:
        "200": { $ref: "#/components/responses/OkResponse" }
        "400": { $ref: "#/components/responses/BadRequest" }
        "401": { $ref: "#/components/responses/Unauthorized" }
        "413": { description: Snippet too large }
        "429": { $ref: "#/components/responses/RateLimited" }
    get:
      tags: [Snippets]
      summary: List the current user's snippets
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }
  /api/snippets/{id}:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    get:
      tags: [Snippets]
      summary: Get a snippet
      security: [{ session: [] }, {}]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "404": { $ref: "#/components/responses/NotFound" } }
    patch:
      tags: [Snippets]
      summary: Update a snippet (owner)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" } }
    delete:
      tags: [Snippets]
      summary: Delete a snippet (owner)
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/snippets/{id}/fork:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    post:
      tags: [Snippets]
      summary: Fork a snippet
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }

  /api/challenges:
    post:
      tags: [Challenges]
      summary: Create a coding challenge
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }
  /api/challenges/{slug}:
    parameters: [{ $ref: "#/components/parameters/Slug" }]
    patch:
      tags: [Challenges]
      summary: Update a challenge (admin)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
    delete:
      tags: [Challenges]
      summary: Delete a challenge (admin)
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/challenges/{slug}/enroll:
    parameters: [{ $ref: "#/components/parameters/Slug" }]
    post:
      tags: [Challenges]
      summary: Enroll in a challenge
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }
    patch:
      tags: [Challenges]
      summary: Update enrollment state
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }
  /api/challenges/{slug}/attempt:
    parameters: [{ $ref: "#/components/parameters/Slug" }]
    post:
      tags: [Challenges]
      summary: Record / start a challenge attempt
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }
  /api/challenges/{slug}/grade:
    parameters: [{ $ref: "#/components/parameters/Slug" }]
    post:
      tags: [Challenges]
      summary: Server-authoritative grading (run or submit)
      description: Runs candidate code against test cases on Piston, computes the score, persists the attempt (unless dryRun), and returns results with hidden cases redacted.
      security: [{ session: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [stepId]
              properties:
                stepId: { type: string }
                language: { type: string, description: Harness mode language. }
                code: { type: string, description: Harness mode single-function source. }
                files: { type: object, additionalProperties: { type: string }, description: unit-js mode source files. }
                durationSec: { type: integer, minimum: 0 }
                sessionId: { type: [string, "null"] }
                token: { type: [string, "null"] }
                dryRun: { type: boolean, description: Run sample cases without persisting an attempt. }
      responses:
        "200":
          description: Grade result (hidden cases redacted).
          content:
            application/json:
              schema:
                type: object
                properties:
                  passed: { type: integer }
                  total: { type: integer }
                  score: { type: number }
                  compileError: { type: boolean }
                  results: { type: array, items: { type: object } }
        "400": { $ref: "#/components/responses/BadRequest" }
        "401": { $ref: "#/components/responses/Unauthorized" }
        "429": { $ref: "#/components/responses/RateLimited" }
  /api/challenges/{slug}/telemetry:
    parameters: [{ $ref: "#/components/parameters/Slug" }]
    post:
      tags: [Challenges]
      summary: Submit attempt telemetry (focus/paste events, etc.)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/challenges/{slug}/invites:
    parameters: [{ $ref: "#/components/parameters/Slug" }]
    get:
      tags: [Challenges]
      summary: List challenge invites (admin)
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
    post:
      tags: [Challenges]
      summary: Create a challenge invite (admin)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/challenges/{slug}/invites/{inviteId}:
    parameters:
      - { $ref: "#/components/parameters/Slug" }
      - { name: inviteId, in: path, required: true, schema: { type: string } }
    delete:
      tags: [Challenges]
      summary: Revoke a challenge invite (admin)
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }

  /api/prompt-challenges:
    get:
      tags: [Prompt Challenges]
      summary: List prompt challenges (admin)
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
    post:
      tags: [Prompt Challenges]
      summary: Create a prompt challenge (admin)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/prompt-challenges/{id}:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    get:
      tags: [Prompt Challenges]
      summary: Get a prompt challenge (admin)
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
    patch:
      tags: [Prompt Challenges]
      summary: Update a prompt challenge (admin)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
    delete:
      tags: [Prompt Challenges]
      summary: Delete a prompt challenge (admin)
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/prompt-challenges/submit:
    post:
      tags: [Prompt Challenges]
      summary: Submit a prompt-challenge attempt (graded)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }
  /api/prompt-playground/run:
    post:
      tags: [Prompt Challenges]
      summary: Run a prompt in the playground (LLM call)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" }, "429": { $ref: "#/components/responses/RateLimited" } }
  /api/prompt-attempts:
    get:
      tags: [Prompt Challenges]
      summary: List prompt attempts
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/prompt-attempts/{id}/share:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    post:
      tags: [Prompt Challenges]
      summary: Toggle share on a prompt attempt
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/prompt-attempts/{id}/upvote:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    post:
      tags: [Prompt Challenges]
      summary: Upvote a shared prompt attempt
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }

  /api/ai-interview/message:
    post:
      tags: [AI Interview]
      summary: Send a candidate message to the AI interviewer
      security: [{ session: [] }, {}]
      requestBody: { required: true, content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "400": { $ref: "#/components/responses/BadRequest" }, "429": { $ref: "#/components/responses/RateLimited" } }
  /api/ai-interview/observe:
    post:
      tags: [AI Interview]
      summary: Report an observation/event during an AI interview
      security: [{ session: [] }, {}]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/ai-interview/submit:
    post:
      tags: [AI Interview]
      summary: Submit / finalize an AI interview
      security: [{ session: [] }, {}]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/ai-interview/practice:
    get:
      tags: [AI Interview]
      summary: Get the credit-free practice interview state
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }
    post:
      tags: [AI Interview]
      summary: Start / advance a practice interview
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }
  /api/ai-interview/tts:
    post:
      tags: [AI Interview]
      summary: Text-to-speech for the AI interviewer voice
      security: [{ session: [] }, {}]
      requestBody: { content: { application/json: { schema: { type: object, properties: { text: { type: string } } } } } }
      responses: { "200": { description: Audio stream (audio/mpeg) }, "400": { $ref: "#/components/responses/BadRequest" } }

  /api/interview:
    post:
      tags: [Interviews]
      summary: Create an interview
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }
  /api/interview/{id}:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    get:
      tags: [Interviews]
      summary: Get an interview
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "404": { $ref: "#/components/responses/NotFound" } }
    patch:
      tags: [Interviews]
      summary: Update an interview
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
    delete:
      tags: [Interviews]
      summary: Delete an interview
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/interview/{id}/active:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    patch:
      tags: [Interviews]
      summary: Set the active snippet/state of an interview
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/interview/{id}/schedule:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    post:
      tags: [Interviews]
      summary: Schedule an interview (sends invite + .ics)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/interview/stack-pool:
    get:
      tags: [Interviews]
      summary: Get the tech-stack question pool
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }

  /api/take-home/{token}/start:
    parameters: [{ $ref: "#/components/parameters/Token" }]
    post:
      tags: [Take-home]
      summary: Start a take-home assignment by token
      security: []
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "404": { $ref: "#/components/responses/NotFound" } }

  /api/blogs:
    get:
      tags: [Blogs]
      summary: List blogs (admin view)
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
    post:
      tags: [Blogs]
      summary: Create a blog (admin)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/blogs/{id}:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    get:
      tags: [Blogs]
      summary: Get a blog
      security: [{ session: [] }, {}]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "404": { $ref: "#/components/responses/NotFound" } }
    patch:
      tags: [Blogs]
      summary: Update a blog (author/admin)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
    delete:
      tags: [Blogs]
      summary: Delete a blog (author/admin)
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/blogs/{id}/comments:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    post:
      tags: [Blogs]
      summary: Comment on a blog
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { type: object, properties: { body: { type: string } } } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }
  /api/blogs/{id}/reactions:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    post:
      tags: [Blogs]
      summary: React to a blog
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
    delete:
      tags: [Blogs]
      summary: Remove a reaction
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/blogs/{id}/bookmark:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    post:
      tags: [Blogs]
      summary: Bookmark a blog
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
    delete:
      tags: [Blogs]
      summary: Remove a bookmark
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/blogs/generate-image:
    post:
      tags: [Blogs]
      summary: Generate a blog cover image
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { type: object, properties: { prompt: { type: string } } } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "429": { $ref: "#/components/responses/RateLimited" } }
  /api/comments/{id}:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    delete:
      tags: [Blogs]
      summary: Delete a comment (admin/author)
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }

  /api/notifications/me:
    get:
      tags: [Notifications]
      summary: List my notifications
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }
    post:
      tags: [Notifications]
      summary: Bulk action on my notifications (mark all read, etc.)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/notifications/me/{id}/read:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    post:
      tags: [Notifications]
      summary: Mark a notification read
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/notifications/me/{id}/dismiss:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    post:
      tags: [Notifications]
      summary: Dismiss a notification
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }

  /api/me/portfolio:
    get:
      tags: [Users & Profile]
      summary: Get my portfolio settings
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
    patch:
      tags: [Users & Profile]
      summary: Update my portfolio (bio, hireMeUrl, visibility)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/me/user-type:
    post:
      tags: [Users & Profile]
      summary: Set my user type (candidate/recruiter)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { type: object, properties: { userType: { type: string, enum: [candidate, recruiter] } } } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/users/{id}/follow:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    post:
      tags: [Users & Profile]
      summary: Follow a user
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
    delete:
      tags: [Users & Profile]
      summary: Unfollow a user
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }

  /api/w/create:
    post:
      tags: [Workspace]
      summary: Create a workspace
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }
  /api/w/{slug}/candidates:
    parameters: [{ $ref: "#/components/parameters/Slug" }]
    get:
      tags: [Workspace]
      summary: List workspace candidates
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
    post:
      tags: [Workspace]
      summary: Add a candidate
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/w/{slug}/candidates/{id}:
    parameters: [{ $ref: "#/components/parameters/Slug" }, { $ref: "#/components/parameters/Id" }]
    patch:
      tags: [Workspace]
      summary: Update a candidate
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
    delete:
      tags: [Workspace]
      summary: Remove a candidate
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/w/{slug}/candidates/bulk:
    parameters: [{ $ref: "#/components/parameters/Slug" }]
    post:
      tags: [Workspace]
      summary: Bulk add candidates
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
    delete:
      tags: [Workspace]
      summary: Bulk remove candidates
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/w/{slug}/members:
    parameters: [{ $ref: "#/components/parameters/Slug" }]
    post:
      tags: [Workspace]
      summary: Invite/add a workspace member
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
    delete:
      tags: [Workspace]
      summary: Remove a workspace member
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/w/{slug}/integrations:
    parameters: [{ $ref: "#/components/parameters/Slug" }]
    get:
      tags: [Workspace]
      summary: List workspace integrations (ATS/MCP/webhooks)
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
    post:
      tags: [Workspace]
      summary: Add an integration
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
    delete:
      tags: [Workspace]
      summary: Remove an integration
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/w/{slug}/take-home:
    parameters: [{ $ref: "#/components/parameters/Slug" }]
    post:
      tags: [Workspace]
      summary: Send a take-home to a candidate
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/w/{slug}/billing/session:
    parameters: [{ $ref: "#/components/parameters/Slug" }]
    post:
      tags: [Workspace]
      summary: Create a Stripe checkout/billing session
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { description: Stripe checkout URL, content: { application/json: { schema: { type: object, properties: { url: { type: string } } } } } }, "403": { $ref: "#/components/responses/Forbidden" } }

  /api/admin/users/{id}:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    patch:
      tags: [Admin]
      summary: Update a user (ban, type, etc.)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
    delete:
      tags: [Admin]
      summary: Delete a user
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/admin/snippets/{id}:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    patch:
      tags: [Admin]
      summary: Moderate a snippet
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/admin/attempts/{id}:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    delete:
      tags: [Admin]
      summary: Delete a challenge attempt
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/admin/challenges:
    post:
      tags: [Admin]
      summary: Create a challenge (admin authoring)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/admin/challenges/{id}:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    patch:
      tags: [Admin]
      summary: Update a challenge
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
    put:
      tags: [Admin]
      summary: Replace a challenge
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
    delete:
      tags: [Admin]
      summary: Delete a challenge
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/admin/challenges/bulk:
    post:
      tags: [Admin]
      summary: Bulk challenge operations
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/admin/challenges/validate:
    post:
      tags: [Admin]
      summary: Validate a challenge contract (runs reference solutions on Piston)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/admin/blogs/{id}:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    patch:
      tags: [Admin]
      summary: Update a blog (admin)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
    delete:
      tags: [Admin]
      summary: Delete a blog (admin)
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/admin/blogs/bulk:
    post:
      tags: [Admin]
      summary: Bulk blog operations
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/admin/interviews/{id}:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    patch:
      tags: [Admin]
      summary: Update an interview (admin)
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/GenericObject" } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
    delete:
      tags: [Admin]
      summary: Delete an interview (admin)
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/admin/copilot:
    post:
      tags: [Admin]
      summary: Admin operations copilot (Gemma RAG) query
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { type: object, properties: { message: { type: string } } } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/admin/copilot/alerts-count:
    get:
      tags: [Admin]
      summary: Count of open copilot alerts
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/admin/copilot/blog-preview/{id}:
    parameters: [{ $ref: "#/components/parameters/Id" }]
    get:
      tags: [Admin]
      summary: Preview an AI-drafted blog
      security: [{ session: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "403": { $ref: "#/components/responses/Forbidden" } }
  /api/admin/tts:
    post:
      tags: [Admin]
      summary: Admin text-to-speech
      security: [{ session: [] }]
      requestBody: { content: { application/json: { schema: { type: object, properties: { text: { type: string } } } } } }
      responses: { "200": { description: Audio stream }, "403": { $ref: "#/components/responses/Forbidden" } }

  /api/mcp:
    post:
      tags: [MCP]
      summary: MCP JSON-RPC (workspace tools)
      description: Model Context Protocol over Streamable HTTP. Bearer = workspace API key. Plan must include MCP. Rate limit 60/min per key.
      security: [{ apiKey: [] }]
      requestBody: { required: true, content: { application/json: { schema: { type: object, description: JSON-RPC 2.0 request }, example: { jsonrpc: "2.0", id: 1, method: "tools/list" } } } }
      responses:
        "200": { description: JSON-RPC 2.0 response, content: { application/json: { schema: { type: object } } } }
        "401": { $ref: "#/components/responses/Unauthorized" }
        "403": { $ref: "#/components/responses/Forbidden" }
        "429": { $ref: "#/components/responses/RateLimited" }
    get:
      tags: [MCP]
      summary: MCP SSE / capability stream
      security: [{ apiKey: [] }]
      responses: { "200": { description: Stream }, "401": { $ref: "#/components/responses/Unauthorized" } }
    delete:
      tags: [MCP]
      summary: MCP session teardown
      security: [{ apiKey: [] }]
      responses: { "200": { description: OK }, "401": { $ref: "#/components/responses/Unauthorized" } }
  /api/mcp/public:
    post:
      tags: [MCP]
      summary: Public MCP discovery (unauthenticated, limited)
      security: []
      requestBody: { content: { application/json: { schema: { type: object } } } }
      responses: { "200": { description: JSON-RPC 2.0 response } }
    get:
      tags: [MCP]
      summary: Public MCP discovery stream
      security: []
      responses: { "200": { description: Stream } }
    delete:
      tags: [MCP]
      summary: Public MCP teardown
      security: []
      responses: { "200": { description: OK } }
  /api/mcp/spike:
    post:
      tags: [MCP]
      summary: MCP spike/experimental endpoint
      security: [{ apiKey: [] }]
      requestBody: { content: { application/json: { schema: { type: object } } } }
      responses: { "200": { description: JSON-RPC 2.0 response } }
    get:
      tags: [MCP]
      summary: MCP spike stream
      security: [{ apiKey: [] }]
      responses: { "200": { description: Stream } }
    delete:
      tags: [MCP]
      summary: MCP spike teardown
      security: [{ apiKey: [] }]
      responses: { "200": { description: OK } }

  /api/webhooks/stripe:
    post:
      tags: [Webhooks]
      summary: Stripe webhook (checkout.session.completed, etc.)
      description: Verifies the stripe-signature header against STRIPE_WEBHOOK_SECRET. Records AI-credit purchases and subscription upgrades.
      security: []
      requestBody: { required: true, content: { application/json: { schema: { type: object, description: Stripe Event payload } } } }
      responses:
        "200": { description: Acknowledged }
        "400": { description: Invalid signature, content: { application/json: { schema: { $ref: "#/components/schemas/Error" } } } }
  /api/webhooks/resend:
    post:
      tags: [Webhooks]
      summary: Resend webhook (delivery, bounce, complaint)
      description: Verifies the Svix signature against RESEND_WEBHOOK_SECRET. Updates EmailLog + suppression list.
      security: []
      requestBody: { required: true, content: { application/json: { schema: { type: object } } } }
      responses:
        "200": { description: Acknowledged }
        "400": { description: Invalid signature }
        "503": { description: Webhook secret not configured }
  /api/integrations/webhooks/{provider}:
    parameters: [{ name: provider, in: path, required: true, schema: { type: string } }]
    post:
      tags: [Integrations]
      summary: Inbound integration/ATS webhook
      security: []
      requestBody: { content: { application/json: { schema: { type: object } } } }
      responses: { "200": { description: Acknowledged }, "400": { $ref: "#/components/responses/BadRequest" } }

  /api/cron/telemetry-scan:
    get:
      tags: [Cron]
      summary: Proactive telemetry scan (Gemma monitor)
      security: [{ cronSecret: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }
  /api/cron/take-home-reminders:
    get:
      tags: [Cron]
      summary: Send take-home reminder emails
      security: [{ cronSecret: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }
    post:
      tags: [Cron]
      summary: Send take-home reminder emails (POST trigger)
      security: [{ cronSecret: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }
  /api/cron/notifications/take-home-expiring:
    get:
      tags: [Cron]
      summary: Notify on expiring take-homes
      security: [{ cronSecret: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }
    post:
      tags: [Cron]
      summary: Notify on expiring take-homes (POST)
      security: [{ cronSecret: [] }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "401": { $ref: "#/components/responses/Unauthorized" } }
  /api/cron/notifications/stale-scorecards:
    get:
      tags: [Cron]
      summary: Notify recruiters of stale scorecards
      security: [{ cronSecret: [] }, {}]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
    post:
      tags: [Cron]
      summary: Notify recruiters of stale scorecards (POST)
      security: [{ cronSecret: [] }, {}]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/cron/notifications/ai-credits-sweep:
    get:
      tags: [Cron]
      summary: Sweep low AI-credit workspaces and notify
      security: [{ cronSecret: [] }, {}]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
    post:
      tags: [Cron]
      summary: Sweep low AI-credit workspaces (POST)
      security: [{ cronSecret: [] }, {}]
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }

  /api/explore:
    get:
      tags: [Misc]
      summary: Public explore feed (snippets/challenges)
      security: []
      parameters:
        - { name: q, in: query, schema: { type: string } }
        - { name: cursor, in: query, schema: { type: string } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" } }
  /api/oembed:
    get:
      tags: [Misc]
      summary: oEmbed metadata for a snippet/blog URL
      security: []
      parameters: [{ name: url, in: query, required: true, schema: { type: string } }]
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "404": { $ref: "#/components/responses/NotFound" } }
  /api/livekit/token:
    get:
      tags: [Misc]
      summary: Mint a LiveKit access token (voice/video)
      security: [{ session: [] }]
      responses: { "200": { description: LiveKit JWT, content: { application/json: { schema: { type: object, properties: { token: { type: string } } } } } }, "401": { $ref: "#/components/responses/Unauthorized" } }
  /api/lobby/send-link:
    post:
      tags: [Misc]
      summary: Email a lobby/join link
      security: []
      requestBody: { content: { application/json: { schema: { type: object, properties: { email: { type: string }, link: { type: string } } } } } }
      responses: { "200": { $ref: "#/components/responses/OkResponse" }, "429": { $ref: "#/components/responses/RateLimited" } }
`;
