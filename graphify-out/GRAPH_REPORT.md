# Graph Report - codepad  (2026-05-24)

## Corpus Check
- 307 files · ~203,055 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1392 nodes · 2111 edges · 115 communities (82 shown, 33 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `21902edd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- [[_COMMUNITY_Loading States|Loading States]]
- [[_COMMUNITY_Privacy Policy|Privacy Policy]]
- [[_COMMUNITY_Terms of Service|Terms of Service]]
- [[_COMMUNITY_NextAuth Type Definitions|NextAuth Type Definitions]]
- [[_COMMUNITY_Next.js Configuration|Next.js Configuration]]
- [[_COMMUNITY_Tailwind Configuration|Tailwind Configuration]]
- [[_COMMUNITY_Environment Types|Environment Types]]
- [[_COMMUNITY_PostCSS Configuration|PostCSS Configuration]]
- [[_COMMUNITY_Assets|Assets]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 114|Community 114]]

## God Nodes (most connected - your core abstractions)
1. `isAdmin()` - 60 edges
2. `NotFound()` - 29 edges
3. `enosys()` - 28 edges
4. `PATCH()` - 19 edges
5. `rateLimit()` - 19 edges
6. `clientKey()` - 16 edges
7. `DELETE()` - 15 edges
8. `validatePageAccess()` - 14 edges
9. `TemplateLogo()` - 13 edges
10. `Homepage Scroll Animations — Architecture Plan` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Sandpack Execution Engine` --rationale_for--> `Root Layout`  [INFERRED]
  README.md → src/app/layout.tsx
- `Monaco Code Editor` --rationale_for--> `Home Page`  [INFERRED]
  README.md → src/app/page.tsx
- `WorkspaceOverviewPage()` --calls--> `NotFound()`  [INFERRED]
  src/app/admin/workspaces/[id]/page.tsx → src/app/not-found.tsx
- `WorkspaceChallengesPage()` --calls--> `NotFound()`  [INFERRED]
  src/app/admin/workspaces/[id]/challenges/page.tsx → src/app/not-found.tsx
- `EmbedPage()` --calls--> `NotFound()`  [INFERRED]
  src/app/embed/[id]/page.tsx → src/app/not-found.tsx

## Hyperedges (group relationships)
- **Core Technology Stack** — sandpack_execution, monaco_editor, auth_lib, prisma_lib [EXTRACTED 1.00]

## Communities (115 total, 33 thin omitted)

### Community 0 - "Landing Page Components"
Cohesion: 0.05
Nodes (32): fallback(), HomeChallenges(), loadStats(), roundedNumber(), Stats, PlaylistItem, SESSION, TONE_BORDER (+24 more)

### Community 1 - "Snippet Management & Actions"
Cohesion: 0.07
Nodes (22): blankStep(), ChallengeFormInput, ChallengeFormSurface, ChallengeStepInput, TestCaseInput, ChallengeTemplate, TEMPLATES, DIFFICULTIES (+14 more)

### Community 2 - "Home Page Sections"
Cohesion: 0.06
Nodes (25): ASPECT_OPTIONS, AspectRatio, ImageGenDialogProps, PRESET_PROMPTS, PublishDialogProps, TagInputProps, BlogEditorData, BlogEditorSavePayload (+17 more)

### Community 3 - "Template & Icon Utilities"
Cohesion: 0.08
Nodes (33): chdir(), chmod(), chown(), close(), cwd(), decoder, encoder, enosys() (+25 more)

### Community 4 - "User Profile & API"
Cohesion: 0.1
Nodes (28): POST(), submitSchema, GET(), POST(), ASPECT_DIMS, bodySchema, GenResult, isErr() (+20 more)

### Community 5 - "File System & Search Hooks"
Cohesion: 0.09
Nodes (17): FeedItem, Item, VisibilityFilter, NEWS, SHORTCUTS, WorkspaceItem, StatsProps, TabId (+9 more)

### Community 6 - "Global Layout & Provider"
Cohesion: 0.06
Nodes (15): PaginationProps, AdminBlogModerationModalProps, AdminBlogRowProps, ACTION_CONFIG, BAR_ACTIONS, BulkAction, BulkCtx, BulkHeaderCheckbox() (+7 more)

### Community 7 - "User Dashboard UI"
Cohesion: 0.07
Nodes (9): updateSchema, STATIC_ROUTES, createSchema, escapeXml(), GET(), globalForPrisma, metadata, telemetrySchema (+1 more)

### Community 8 - "Playground & Toolbar Components"
Cohesion: 0.11
Nodes (21): AdminLayout(), metadata, Ctx, DELETE(), Params, authorise(), GET(), looksLikeEmail() (+13 more)

### Community 9 - "Monaco Editor Integration"
Cohesion: 0.08
Nodes (20): arrayPrototypeMethods, Bridge(), ChatMessage, codeFromFile(), consoleMethods, documentMethods, jsGlobals, jsKeywords (+12 more)

### Community 10 - "Core Architecture & Setup"
Cohesion: 0.17
Nodes (15): applyUpdate(), authorize(), DELETE(), ensureAdmin(), filesSchema, fullSchema, GET(), Params (+7 more)

### Community 11 - "Error Pages & Embeds"
Cohesion: 0.1
Nodes (12): authorize(), bulkCreateSchema, bulkDeleteSchema, DELETE(), POST(), schema, Params, credentialsProvider (+4 more)

### Community 12 - "Code Formatting Utilities"
Cohesion: 0.09
Nodes (15): Props, SOURCE_OPTIONS, ParsedRow, Props, generateMetadata(), Props, WorkspaceDashboardPage(), CandidateItem (+7 more)

### Community 13 - "Loading States"
Cohesion: 0.12
Nodes (18): FileExplorer(), fileIconFor(), FileIconInfo, FileNodeIcon(), FOLDER_COLORS, folderColor(), FolderNodeIcon(), Props (+10 more)

### Community 14 - "Privacy Policy"
Cohesion: 0.09
Nodes (22): 1. The immediate gap you spotted, 2.1 Three overlapping concepts, 2.2 Per-item metadata lives in the wrong place, 2.3 Authorship inconsistency, 2.4 `/challenges` page is doing too much, 2.5 Naming overloads, 2. Bigger issues — as a senior architect, 3. Issues an end user will hit (+14 more)

### Community 15 - "Terms of Service"
Cohesion: 0.13
Nodes (11): ConsoleClearBridge(), ConsoleEntryBridge(), FilesBridge(), FormatBridge(), RunBridge(), customSnippetExtension, nbpTheme, Playground() (+3 more)

### Community 16 - "NextAuth Type Definitions"
Cohesion: 0.09
Nodes (21): 10. What I'd push back on if asked, 1. Naming — call it a **Track**, 2. Where it lives — both, with one clear job each, 3. Data model, 4. Authoring — admin-only in v1, users in v2, 5.1 `/challenges` (existing, evolves), 5.2 `/tracks/[slug]` (new), 5.3 `/dashboard` (new section) (+13 more)

### Community 17 - "Next.js Configuration"
Cohesion: 0.09
Nodes (21): 10. Open questions, 11. Out of scope, 1. Design principles (the rules), 2. Tech choice, 3. The four signature moments (high-impact, scroll-linked), 4. Reveal patterns (cheap stagger fades — apply broadly), 5. What NOT to animate (anti-patterns), 6. Performance budget (+13 more)

### Community 18 - "Tailwind Configuration"
Cohesion: 0.12
Nodes (6): metadata, LogoMark(), SizeProps, ICON_MAP, metadata, Providers

### Community 19 - "Environment Types"
Cohesion: 0.12
Nodes (12): EditorSurfaceProps, INITIAL_SLASH, lowlight, SlashState, ToolbarButtonProps, PromptConfig, PromptDialogProps, filterSlashItems() (+4 more)

### Community 20 - "PostCSS Configuration"
Cohesion: 0.1
Nodes (20): 1. What's there now, 2. Honest critique, 3.1 New header — `ChallengesHero`, 3.2 Toolbar — `ChallengesToolbar`, 3.3 Main grid — `ChallengesGrid`, 3.4 Section grouping (NEW), 3.5 Sidebar — `ChallengesProgressSidebar` *(signed-in only, lg+ desktop)*, 3. Proposed redesign (+12 more)

### Community 21 - "Assets"
Cohesion: 0.11
Nodes (16): arrayPrototypeMethods, CollaborativeEditor(), CollaborativeEditorProps, consoleMethods, documentMethods, jsGlobals, jsKeywords, jsonMethods (+8 more)

### Community 22 - "Community 22"
Cohesion: 0.1
Nodes (19): 10. Out of scope, 1. Why this section, 2. Placement, 3.1 Row 1 — Headline strip, 3.2 Row 2 — Animated "How it works" infographic (the centerpiece), 3.3 Row 3 — Live stats strip, 3.4 Dual CTA bar (bottom), 3. Section anatomy (+11 more)

### Community 23 - "Community 23"
Cohesion: 0.2
Nodes (16): AdminAttemptDetailPage(), AdminAttemptDetailPageProps, AdminInterviewDetailPage(), AdminInterviewDetailPageProps, ATTEMPT_COLOR, formatDuration(), parseFiles(), parseTestResults() (+8 more)

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (13): assertAdmin(), toggleBlogPostFeatured(), toggleChallengeFeatured(), toggleSnippetPinned(), AttemptData, BlogData, ChallengeData, DashboardFeedHubProps (+5 more)

### Community 25 - "Community 25"
Cohesion: 0.17
Nodes (10): Playground, Props, Snippet, Visibility, EmbedPage(), parseTags(), Playground, SavedPlaygroundPage() (+2 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (5): Props, CommentNode, BlogPostPage(), readingMinutes(), safeTags()

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (11): Props, CandidateDetailPage(), difficultyBg, difficultyColor, generateMetadata(), metadata, PortfolioPage(), Props (+3 more)

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (8): Challenge, ChallengeAttemptClient(), CollaborativeEditor, difficultyColor, FlatTest, formatDuration(), LiveLog, getSignalingUrls()

### Community 29 - "Community 29"
Cohesion: 0.15
Nodes (11): CODE_LINES, CodeLine, FEATURES, Phase, QUICK_STARTS, Token, Snippet, CardChip() (+3 more)

### Community 30 - "Community 30"
Cohesion: 0.16
Nodes (11): ExploreItem, ExplorePage(), metadata, validatePageAccess(), ChallengeOption, difficultyBg, difficultyColor, PlaygroundOption (+3 more)

### Community 31 - "Community 31"
Cohesion: 0.15
Nodes (10): difficultyClass, Row, ACTION_CONFIG, BAR_ACTIONS, BulkAction, BulkCtx, BulkHeaderCheckbox(), BulkRowCheckbox() (+2 more)

### Community 34 - "Community 34"
Cohesion: 0.13
Nodes (5): inter, jetbrainsMono, metadata, outfit, ThemeProvider()

### Community 35 - "Community 35"
Cohesion: 0.16
Nodes (11): FILES, FEATURED_DESCRIPTIONS, FEATURED_IDS, FeaturedSnippet, FeaturedTile(), FEATURES, FILTERS, groupLabel() (+3 more)

### Community 36 - "Community 36"
Cohesion: 0.19
Nodes (13): escapeHtml(), fileCode(), highlight(), isLowSignal(), langFor(), pickShowpiece(), PREFERRED_PATHS, Showpiece (+5 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (15): 1. Clone the repository, 2. Install dependencies, 3. Set up environment variables, 4. Initialize the Database, 5. Start the development server, code:bash (git clone https://github.com/rvndnishad-work/Codepad.git), code:bash (npm install), code:bash (cp .env.example .env) (+7 more)

### Community 38 - "Community 38"
Cohesion: 0.15
Nodes (4): BlogCardProps, FeaturedCarouselProps, RelatedPost, Props

### Community 39 - "Community 39"
Cohesion: 0.2
Nodes (6): handleSignOut(), Header(), UserShape, getNavLinks(), metadata, SettingsPage()

### Community 40 - "Community 40"
Cohesion: 0.18
Nodes (11): Attempt, difficultyBg, difficultyColor, formatDuration(), Interview, InterviewRunner(), Monaco, SessionChallenge (+3 more)

### Community 41 - "Community 41"
Cohesion: 0.29
Nodes (7): B2bSettingsConfig, DEFAULT_NAV_LINKS, NavLinkConfig, NavStatus, DEFAULT_B2B_SETTINGS, updateB2bSettings(), updateNavLinks()

### Community 42 - "Community 42"
Cohesion: 0.17
Nodes (5): Snippet, Visibility, ToolbarDropdownProps, VIEW_OPTIONS, ViewValue

### Community 43 - "Community 43"
Cohesion: 0.21
Nodes (4): BRANDS, EASE_EXPO_OUT, EASE_SMOOTH, RevealItem()

### Community 44 - "Community 44"
Cohesion: 0.21
Nodes (6): QUICK_TEMPLATES, FILTERS, IconFn, templateIcon, TemplateLogo(), groups

### Community 45 - "Community 45"
Cohesion: 0.2
Nodes (5): TemplateCategory, TemplateDef, templates, FEATURED_IDS, Welcome

### Community 46 - "Community 46"
Cohesion: 0.25
Nodes (4): getB2bSettings(), stripe, memberSchema, POST()

### Community 47 - "Community 47"
Cohesion: 0.2
Nodes (5): AdminAttemptRow(), AdminAttemptRowProps, formatDuration(), STATUS_BADGE, AdminAttemptsPageProps

### Community 48 - "Community 48"
Cohesion: 0.22
Nodes (7): AdminSessionReplayPage(), generateMetadata(), Props, WorkspaceSessionReplayPage(), PasteDetail, Props, TelemetryEvent

### Community 49 - "Community 49"
Cohesion: 0.27
Nodes (4): ChallengeAttemptPage(), TrackHelpContext, parseVideoUrl(), VideoEmbed

### Community 50 - "Community 50"
Cohesion: 0.22
Nodes (5): AdminInterviewRow(), AdminInterviewRowProps, formatDuration(), STATUS_COLOR, AdminInterviewsPageProps

### Community 51 - "Community 51"
Cohesion: 0.22
Nodes (6): CollaborativePlayground, formatDuration(), SessionTimer(), SessionTimerProps, InterviewPlaygroundPage(), metadata

### Community 52 - "Community 52"
Cohesion: 0.22
Nodes (7): NotFound(), EditBlogPage(), metadata, Props, WorkspaceMembersPage(), CandidateReportPage(), metadata

### Community 53 - "Community 53"
Cohesion: 0.28
Nodes (7): buildCodeFrame(), cleanErrorMessage(), ErrorBridge(), ErrorData, ErrorFrame, ErrorOverlay(), parseSandpackError()

### Community 54 - "Community 54"
Cohesion: 0.25
Nodes (4): Editor, EXT_COLOR, EXT_LANG, customSnippets

### Community 55 - "Community 55"
Cohesion: 0.22
Nodes (3): Stage, StageInfo, STAGES

### Community 56 - "Community 56"
Cohesion: 0.22
Nodes (9): User Registration API, Authentication Library, Home Page, Root Layout, Monaco Code Editor, Prisma Database Client, Rate Limiting Utility, Project Documentation (+1 more)

### Community 58 - "Community 58"
Cohesion: 0.32
Nodes (5): deleteWorkspaceAction(), updateWorkspacePlanAction(), PLAN_BADGES, Props, WorkspaceItem

### Community 59 - "Community 59"
Cohesion: 0.48
Nodes (6): daysAgo(), daysFromNow(), main(), prisma, rand(), shortCode()

### Community 60 - "Community 60"
Cohesion: 0.29
Nodes (3): IconName, iconsMap, AdminSidebarProps

### Community 61 - "Community 61"
Cohesion: 0.29
Nodes (5): Props, Status, STATUS_BADGES, STATUS_LABELS, STATUSES

### Community 62 - "Community 62"
Cohesion: 0.38
Nodes (4): createSchema, GET(), blogTagsSchema, coverImageSchema

### Community 63 - "Community 63"
Cohesion: 0.29
Nodes (5): filesSchema, payloadSchema, POST(), stepSchema, testCaseSchema

### Community 64 - "Community 64"
Cohesion: 0.29
Nodes (4): PLAN_BADGES, Props, WorkspaceDetailLayout(), Props

### Community 65 - "Community 65"
Cohesion: 0.33
Nodes (4): CollaborativeEditor, CollabTestInner(), NAMES_POOL, randomName()

### Community 67 - "Community 67"
Cohesion: 0.33
Nodes (5): BlogListingPage(), metadata, safeTags(), Tab, TABS

### Community 69 - "Community 69"
Cohesion: 0.4
Nodes (5): main(), POSTS, prisma, SeedPost, slugify()

### Community 70 - "Community 70"
Cohesion: 0.33
Nodes (3): ALLOWED_TYPES, bodySchema, Ctx

### Community 71 - "Community 71"
Cohesion: 0.4
Nodes (4): ChallengeDetailPage(), difficultyBg, difficultyColor, parseTags()

### Community 74 - "Community 74"
Cohesion: 0.4
Nodes (3): challenges, ChallengeSeed, prisma

### Community 77 - "Community 77"
Cohesion: 0.6
Nodes (4): emulateCode(), execAsync, LANGUAGE_COMMANDS, POST()

### Community 78 - "Community 78"
Cohesion: 0.6
Nodes (4): authorize(), createSchema, GET(), POST()

### Community 91 - "Community 91"
Cohesion: 0.67
Nodes (3): formatCode(), parserFor(), Parsers

## Knowledge Gaps
- **444 isolated node(s):** `nextConfig`, `config`, `prisma`, `prisma`, `prisma` (+439 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `isAdmin()` connect `Playground & Toolbar Components` to `Community 64`, `Snippet Management & Actions`, `Community 26`, `Community 71`, `Community 39`, `Community 41`, `Core Architecture & Setup`, `Error Pages & Embeds`, `Community 48`, `Community 49`, `Community 30`, `Community 23`, `Community 24`, `Community 58`, `Community 62`, `Community 63`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `getSignalingUrls()` connect `Community 28` to `Monaco Editor Integration`, `Assets`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `useResizable()` connect `Terms of Service` to `Monaco Editor Integration`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `isAdmin()` (e.g. with `PATCH()` and `DELETE()`) actually correct?**
  _`isAdmin()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 28 inferred relationships involving `NotFound()` (e.g. with `AdminLayout()` and `AdminAttemptDetailPage()`) actually correct?**
  _`NotFound()` has 28 INFERRED edges - model-reasoned connections that need verification._
- **What connects `nextConfig`, `config`, `prisma` to the rest of the system?**
  _444 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Landing Page Components` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._