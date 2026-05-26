import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runRulesBasedGrader, callGeminiGrader, ScenarioDetails } from "@/lib/prompt-challenges/grader";

// POST /api/prompt-challenges/submit
// Grades a prompt submission using Gemini (if key available) or rules-based offline fallback
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Missing body parameters" }, { status: 400 });
    }

    const { scenarioId, promptText, sessionId, userId, durationSec } = body;

    if (!scenarioId || promptText === undefined) {
      return NextResponse.json({ error: "Missing required fields: scenarioId and promptText" }, { status: 400 });
    }

    // Retrieve the scenario
    const scenario = await prisma.promptScenario.findUnique({
      where: { id: scenarioId },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    // Parse traits and rubric weights
    let expectedTraits = { keywords: [], format: "", constraints: [] };
    try {
      expectedTraits = JSON.parse(scenario.expectedTraits);
    } catch (e) {
      console.warn("Failed to parse expectedTraits JSON:", e);
    }

    let rubricWeights = { clarity: 20, specificity: 20, efficiency: 15, context: 15, constraints: 15, edgeCases: 15 };
    try {
      rubricWeights = JSON.parse(scenario.rubricWeights);
    } catch (e) {
      console.warn("Failed to parse rubricWeights JSON:", e);
    }

    const scenarioDetails: ScenarioDetails = {
      title: scenario.title,
      objective: scenario.objective,
      description: scenario.description,
      expectedTraits,
      rubricWeights,
    };

    // Calculate metadata
    const charCount = promptText.length;
    const tokenEstimate = Math.ceil(charCount / 4.0); // simple token approximation

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    let grading;

    if (apiKey) {
      try {
        grading = await callGeminiGrader(apiKey, scenarioDetails, promptText);
      } catch (err) {
        console.error("Gemini AI Prompt Grading failed, falling back to static rules:", err);
        grading = runRulesBasedGrader(promptText, scenarioDetails);
      }
    } else {
      grading = runRulesBasedGrader(promptText, scenarioDetails);
    }

    // Persist attempt
    const attempt = await prisma.promptAttempt.create({
      data: {
        scenarioId,
        promptText,
        charCount,
        tokenEstimate,
        score: grading.score,
        rubricScores: JSON.stringify(grading.rubricScores),
        feedback: grading.feedback,
        graderType: grading.graderType,
        sessionId: sessionId || null,
        userId: userId || null,
        durationSec: durationSec ? parseInt(durationSec, 10) : null,
      },
      include: {
        scenario: {
          select: {
            title: true,
            category: true,
            difficulty: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      attempt,
    });
  } catch (error) {
    console.error("Failed to submit and grade prompt attempt:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
