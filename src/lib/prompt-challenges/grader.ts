import { AI_INTERVIEW_GEMINI_MODEL } from "../ai-interview/scaffolds";

export interface RubricScores {
  clarity: number;
  specificity: number;
  efficiency: number;
  context: number;
  constraints: number;
  edgeCases: number;
}

export interface GraderResult {
  score: number;
  rubricScores: RubricScores;
  feedback: string;
  graderType: "rules" | "ai";
}

export interface ScenarioDetails {
  title: string;
  objective: string;
  description: string;
  expectedTraits: {
    keywords: string[];
    format: string;
    constraints: string[];
  };
  rubricWeights: {
    clarity: number;
    specificity: number;
    efficiency: number;
    context: number;
    constraints: number;
    edgeCases: number;
  };
}

// Rules-based offline grader fallback
export function runRulesBasedGrader(
  promptText: string,
  scenario: ScenarioDetails
): GraderResult {
  const prompt = (promptText || "").trim();
  const charCount = prompt.length;

  if (charCount === 0) {
    return {
      score: 0,
      rubricScores: { clarity: 0, specificity: 0, efficiency: 0, context: 0, constraints: 0, edgeCases: 0 },
      feedback: "### Evaluation Summary\n\n- [Flaw] Prompt is empty. Please enter a detailed instruction for the AI.",
      graderType: "rules"
    };
  }

  const lowercasePrompt = prompt.toLowerCase();
  const words = prompt.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const strengths: string[] = [];
  const improvements: string[] = [];

  // 1. Clarity (20%) - Unambiguous structure, headers, lists
  let clarityScore = 40;
  if (charCount > 100) clarityScore += 20;
  if (charCount > 250) clarityScore += 15;
  if (/(?:^|\n)(?:\d+\.|\*|-)\s/.test(prompt)) {
    clarityScore += 15; // structured list
    strengths.push("Excellent use of structured lists (bullet points or numbers) to outline instructions clearly.");
  } else {
    improvements.push("Consider organizing your prompt using numbered lists or bullet points to improve reading structure.");
  }
  if (/#+\s|^\s*[A-Z][A-Z\s]+:/.test(prompt)) {
    clarityScore += 10; // headers or section labels
    strengths.push("Effective use of headers or section labels (e.g. 'Objective:', 'Context:') to break up information.");
  }
  clarityScore = Math.min(100, clarityScore);

  // 2. Specificity (20%) - Concrete instructions and domain terms
  let specificityScore = 30;
  if (wordCount > 30) specificityScore += 15;
  if (wordCount > 70) specificityScore += 15;
  
  // Match expected keywords from scenario
  let matchedKeywords = 0;
  const keywordList = scenario.expectedTraits.keywords || [];
  keywordList.forEach((kw) => {
    if (lowercasePrompt.includes(kw.toLowerCase())) {
      matchedKeywords++;
    }
  });

  if (keywordList.length > 0) {
    const keywordMatchRatio = matchedKeywords / keywordList.length;
    specificityScore += Math.round(keywordMatchRatio * 40);
    if (matchedKeywords > 0) {
      strengths.push(`Addressed key scenario-specific concepts: ${matchedKeywords} out of ${keywordList.length} relevant keywords detected.`);
    } else {
      improvements.push("Try adding more scenario-specific terms and technical instructions related to the objective.");
    }
  } else {
    specificityScore += 40;
  }
  specificityScore = Math.min(100, specificityScore);

  // 3. Token Efficiency (15%) - Word count, no bloat
  let efficiencyScore = 100;
  if (wordCount > 450) {
    // Penalize verbose prompts that don't add structure
    const penalty = Math.min(40, Math.floor((wordCount - 450) / 10));
    efficiencyScore -= penalty;
    improvements.push(`Prompt is somewhat verbose (${wordCount} words). AI can perform better with concise, high-density instructions.`);
  } else if (wordCount < 40) {
    efficiencyScore -= 30;
    improvements.push("Prompt is too brief, missing out on density and necessary detail for a comprehensive solution.");
  } else {
    strengths.push("Good length and density. Highly focused without unnecessary rambling.");
  }
  efficiencyScore = Math.min(100, Math.max(0, efficiencyScore));

  // 4. Context Quality (15%) - Setting a role / scenario background
  let contextScore = 30;
  const contextTriggers = [
    "act as", "role", "you are", "background", "scenario", "context", "imagine",
    "situation", "developer", "architect", "expert", "specialist", "dba", "analyst"
  ];
  let matchedContext = 0;
  contextTriggers.forEach((trigger) => {
    if (lowercasePrompt.includes(trigger)) matchedContext++;
  });
  contextScore += Math.min(70, matchedContext * 20);
  if (matchedContext >= 2) {
    strengths.push("Clearly defined the role or background context for the AI agent.");
  } else {
    improvements.push("Set a clear persona or role for the AI (e.g. 'Act as a Senior React Engineer...') to prompt better answers.");
  }
  contextScore = Math.min(100, contextScore);

  // 5. Constraint Specification (15%) - Output format & boundaries
  let constraintsScore = 35;
  const formatTriggers = ["format", "output", "json", "markdown", "schema", "only", "must", "strictly", "no external", "do not"];
  let matchedFormat = 0;
  formatTriggers.forEach((trigger) => {
    if (lowercasePrompt.includes(trigger)) matchedFormat++;
  });
  constraintsScore += Math.min(45, matchedFormat * 15);

  // Check scenario expected format
  const expectedFormat = (scenario.expectedTraits.format || "").toLowerCase();
  if (expectedFormat && lowercasePrompt.includes(expectedFormat)) {
    constraintsScore += 20;
    strengths.push(`Directly requested the correct output format style: "${scenario.expectedTraits.format}".`);
  } else if (expectedFormat) {
    improvements.push(`Specify constraints regarding output format more clearly (e.g., "${scenario.expectedTraits.format}").`);
  }
  constraintsScore = Math.min(100, constraintsScore);

  // 6. Edge-Case Awareness (15%) - Corner cases / fallback
  let edgeCasesScore = 30;
  const edgeTriggers = [
    "edge case", "empty", "null", "undefined", "fail", "invalid", "error", "exception",
    "boundary", "fallback", "limitation", "timeout", "handling", "catch", "check"
  ];
  let matchedEdge = 0;
  edgeTriggers.forEach((trigger) => {
    if (lowercasePrompt.includes(trigger)) matchedEdge++;
  });
  edgeCasesScore += Math.min(70, matchedEdge * 20);
  if (matchedEdge >= 2) {
    strengths.push("Proactively requested edge-case, error, or empty-state handling instructions.");
  } else {
    improvements.push("Explicitly ask the AI to handle edge cases, empty states, or invalid inputs.");
  }
  edgeCasesScore = Math.min(100, edgeCasesScore);

  // Calculate composite score using weights
  const w = scenario.rubricWeights || { clarity: 20, specificity: 20, efficiency: 15, context: 15, constraints: 15, edgeCases: 15 };
  const totalWeight = w.clarity + w.specificity + w.efficiency + w.context + w.constraints + w.edgeCases;
  
  const compositeScore = Math.round(
    (clarityScore * w.clarity +
      specificityScore * w.specificity +
      efficiencyScore * w.efficiency +
      contextScore * w.context +
      constraintsScore * w.constraints +
      edgeCasesScore * w.edgeCases) /
      totalWeight
  );

  // Construct Markdown feedback
  let feedback = `### Static Evaluation Score: ${compositeScore}/100\n\n`;
  feedback += `#### Strengths\n`;
  if (strengths.length > 0) {
    feedback += strengths.map((s) => `- [Strength] ${s}`).join("\n") + "\n";
  } else {
    feedback += `- None identified. Let's add more structure and detail to your prompt!\n`;
  }
  feedback += `\n#### Areas for Improvement\n`;
  if (improvements.length > 0) {
    feedback += improvements.map((i) => `- [Improvement] ${i}`).join("\n") + "\n";
  } else {
    feedback += `- Incredible work! Your prompt matches all static quality checklist items.\n`;
  }

  return {
    score: compositeScore,
    rubricScores: {
      clarity: clarityScore,
      specificity: specificityScore,
      efficiency: efficiencyScore,
      context: contextScore,
      constraints: constraintsScore,
      edgeCases: edgeCasesScore
    },
    feedback,
    graderType: "rules"
  };
}

// Call Gemini API to perform programmatic grading of prompt writing
export async function callGeminiGrader(
  apiKey: string,
  scenario: ScenarioDetails,
  promptText: string
): Promise<GraderResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_INTERVIEW_GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const graderPrompt = `You are the Expert Prompt Engineer Assessor AI.
Evaluate a candidate's prompt-writing skill based on the following scenario details.

### Scenario Title: ${scenario.title}
### Scenario Context / Description:
${scenario.description}

### Scenario Objective / Goal:
${scenario.objective}

### Expected Traits / Characteristics:
- Keywords expected: ${JSON.stringify(scenario.expectedTraits.keywords)}
- Format requested: ${scenario.expectedTraits.format}
- Constraints: ${JSON.stringify(scenario.expectedTraits.constraints)}

---
### Candidate's Written Prompt to Evaluate:
"""
${promptText}
"""
---

Score the candidate's prompt on exactly 6 rubric dimensions (each from 0 to 100):
1. **Clarity**: Is the prompt unambiguous, easy to follow, and clearly structured?
2. **Specificity**: Does the candidate specify technical details, domain-specific requirements, or keywords?
3. **Efficiency**: Does the candidate achieve their goal concisely without unnecessary fluff, filler text, or excessive tokens?
4. **Context**: Does the candidate establish a persona (role) or background context for the AI?
5. **Constraints**: Does the candidate outline strict rules, output format styles (e.g. JSON, markdown, TypeScript), boundaries, or exclusions?
6. **Edge Cases**: Does the candidate address potential errors, empty states, boundary values, or unexpected conditions?

Provide a constructive review in Markdown format for the "feedback" field (including bulleted strengths and improvement points).

Output your response strictly as a JSON object containing precisely:
{
  "clarity": number (0-100),
  "specificity": number (0-100),
  "efficiency": number (0-100),
  "context": number (0-100),
  "constraints": number (0-100),
  "edgeCases": number (0-100),
  "score": number (0-100 composite, using the weights: clarity: ${scenario.rubricWeights.clarity}%, specificity: ${scenario.rubricWeights.specificity}%, efficiency: ${scenario.rubricWeights.efficiency}%, context: ${scenario.rubricWeights.context}%, constraints: ${scenario.rubricWeights.constraints}%, edgeCases: ${scenario.rubricWeights.edgeCases}%),
  "feedback": "string containing rich markdown feedback summarizing strengths and improvements"
}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: graderPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini HTTP error ${res.status}`);
  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Empty grader result from Gemini API");

  const parsed = JSON.parse(rawText.trim());
  return {
    score: parsed.score,
    rubricScores: {
      clarity: parsed.clarity,
      specificity: parsed.specificity,
      efficiency: parsed.efficiency,
      context: parsed.context,
      constraints: parsed.constraints,
      edgeCases: parsed.edgeCases
    },
    feedback: parsed.feedback,
    graderType: "ai"
  };
}
