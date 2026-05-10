# Graph Report - .  (2026-05-11)

## Corpus Check
- Corpus is ~32,547 words - fits in a single context window. You may not need a graph.

## Summary
- 249 nodes · 353 edges · 22 communities (16 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.82)
- Token cost: 5,000 input · 1,000 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Landing Page Components|Landing Page Components]]
- [[_COMMUNITY_Snippet Management & Actions|Snippet Management & Actions]]
- [[_COMMUNITY_Home Page Sections|Home Page Sections]]
- [[_COMMUNITY_Template & Icon Utilities|Template & Icon Utilities]]
- [[_COMMUNITY_User Profile & API|User Profile & API]]
- [[_COMMUNITY_File System & Search Hooks|File System & Search Hooks]]
- [[_COMMUNITY_Global Layout & Provider|Global Layout & Provider]]
- [[_COMMUNITY_User Dashboard UI|User Dashboard UI]]
- [[_COMMUNITY_Playground & Toolbar Components|Playground & Toolbar Components]]
- [[_COMMUNITY_Monaco Editor Integration|Monaco Editor Integration]]
- [[_COMMUNITY_Core Architecture & Setup|Core Architecture & Setup]]
- [[_COMMUNITY_Error Pages & Embeds|Error Pages & Embeds]]
- [[_COMMUNITY_Code Formatting Utilities|Code Formatting Utilities]]
- [[_COMMUNITY_Privacy Policy|Privacy Policy]]
- [[_COMMUNITY_Terms of Service|Terms of Service]]
- [[_COMMUNITY_NextAuth Type Definitions|NextAuth Type Definitions]]
- [[_COMMUNITY_Next.js Configuration|Next.js Configuration]]
- [[_COMMUNITY_Tailwind Configuration|Tailwind Configuration]]
- [[_COMMUNITY_Assets|Assets]]

## God Nodes (most connected - your core abstractions)
1. `rateLimit()` - 13 edges
2. `clientKey()` - 12 edges
3. `TemplateLogo()` - 10 edges
4. `templatesById` - 7 edges
5. `LogoMark()` - 5 edges
6. `PATCH()` - 4 edges
7. `NotFound()` - 3 edges
8. `POST()` - 3 edges
9. `GET()` - 3 edges
10. `POST()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Sandpack Execution Engine` --rationale_for--> `Root Layout`  [INFERRED]
  README.md → src/app/layout.tsx
- `Monaco Code Editor` --rationale_for--> `Home Page`  [INFERRED]
  README.md → src/app/page.tsx
- `EmbedPage()` --calls--> `NotFound()`  [INFERRED]
  src/app/embed/[id]/page.tsx → src/app/not-found.tsx
- `SavedPlaygroundPage()` --calls--> `NotFound()`  [INFERRED]
  src/app/play/[id]/page.tsx → src/app/not-found.tsx
- `POST()` --calls--> `rateLimit()`  [EXTRACTED]
  src/app/api/auth/register/route.ts → src/lib/rate-limit.ts

## Hyperedges (group relationships)
- **Core Technology Stack** — sandpack_execution, monaco_editor, auth_lib, prisma_lib [EXTRACTED 1.00]

## Communities (22 total, 6 thin omitted)

### Community 0 - "Landing Page Components"
Cohesion: 0.08
Nodes (19): ConsoleEntryBridge(), FilesBridge(), FormatBridge(), RunBridge(), buildCodeFrame(), cleanErrorMessage(), ErrorBridge(), ErrorData (+11 more)

### Community 1 - "Snippet Management & Actions"
Cohesion: 0.09
Nodes (11): FEATURES, QUICK_STARTS, Snippet, FeedItem, QUICK_TEMPLATES, ExploreItem, FILTERS, metadata (+3 more)

### Community 2 - "Home Page Sections"
Cohesion: 0.09
Nodes (9): handleSignOut(), metadata, LogoMark(), SizeProps, credentialsProvider, credsSchema, { handlers, auth, signIn, signOut }, oauthProviders (+1 more)

### Community 3 - "Template & Icon Utilities"
Cohesion: 0.15
Nodes (19): GET(), POST(), DELETE(), PATCH(), patchSchema, requireOwner(), globalForPrisma, Bucket (+11 more)

### Community 4 - "User Profile & API"
Cohesion: 0.1
Nodes (17): FILES, FEATURED_DESCRIPTIONS, FEATURED_IDS, FeaturedSnippet, FeaturedTile(), FEATURES, FILTERS, groupLabel() (+9 more)

### Community 5 - "File System & Search Hooks"
Cohesion: 0.14
Nodes (16): FileExplorer(), fileIconFor(), FileIconInfo, FileNodeIcon(), FOLDER_COLORS, folderColor(), FolderNodeIcon(), Props (+8 more)

### Community 6 - "Global Layout & Provider"
Cohesion: 0.18
Nodes (3): metadata, outfit, ThemeProvider()

### Community 7 - "User Dashboard UI"
Cohesion: 0.2
Nodes (3): NEWS, SHORTCUTS, StatsProps

### Community 8 - "Playground & Toolbar Components"
Cohesion: 0.22
Nodes (3): Snippet, Visibility, ToolbarDropdownProps

### Community 9 - "Monaco Editor Integration"
Cohesion: 0.25
Nodes (4): Editor, EXT_COLOR, EXT_LANG, customSnippets

### Community 10 - "Core Architecture & Setup"
Cohesion: 0.22
Nodes (9): User Registration API, Authentication Library, Home Page, Root Layout, Monaco Code Editor, Prisma Database Client, Rate Limiting Utility, Project Documentation (+1 more)

### Community 11 - "Error Pages & Embeds"
Cohesion: 0.33
Nodes (5): NotFound(), EmbedPage(), metadata, parseTags(), SavedPlaygroundPage()

### Community 12 - "Code Formatting Utilities"
Cohesion: 0.67
Nodes (3): formatCode(), parserFor(), Parsers

## Knowledge Gaps
- **65 isolated node(s):** `nextConfig`, `config`, `FEATURES`, `QUICK_STARTS`, `Snippet` (+60 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TemplateLogo()` connect `Snippet Management & Actions` to `Landing Page Components`, `Playground & Toolbar Components`, `User Profile & API`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `templatesById` connect `User Profile & API` to `Landing Page Components`, `Snippet Management & Actions`, `Template & Icon Utilities`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `nextConfig`, `config`, `FEATURES` to the rest of the system?**
  _65 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Landing Page Components` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Snippet Management & Actions` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Home Page Sections` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `User Profile & API` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._