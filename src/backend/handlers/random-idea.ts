import { generateRandomIdea } from "@/backend/lib/ai/script-generator";

interface RandomIdeaResult {
  idea: string;
}

export async function randomIdea(): Promise<RandomIdeaResult> {
  const idea = await generateRandomIdea();
  return { idea: idea.trim() };
}
