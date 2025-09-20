import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

const app = express();
app.use(cors());
app.use(express.json());

const GroceryPlanSchema = z.object({
  final_list: z.array(z.string()).describe('The final grocery list after applying all instructions.'),
  reasoning: z.string().describe('Brief reasoning on how instructions were interpreted.'),
});

const SYSTEM = `
You transform natural-language instructions about a grocery list into a final list.
Rules:
- Understand variants like "add X", "put X on grocery list", "add X to shopping".
- Handle removals: "remove X", "delete X", "take X off the list".
- Handle relative removal: "I'll take that last one out" = remove the most recently added item.
- Ignore filler words; normalize item names (e.g., lowercase, no trailing punctuation).
- Output ONLY in the specified JSON schema.
`;

app.post('/api/grocery', async (req, res) => {
  try {
    const { transcript } = req.body as { transcript: string };

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ error: 'Missing OPENAI_API_KEY' });
    }

    const llm = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      apiKey: process.env.OPENAI_API_KEY,
    });
    const structuredModel = llm.withStructuredOutput(GroceryPlanSchema, { name: 'grocery_plan' });

    const userPrompt = `
Transcript:
"""
${transcript}
"""

Task: Read all instructions in order and return the FINAL grocery list after applying adds/removes/“last one out”.
Return JSON only.
`;

    const result = await structuredModel.invoke([
      new SystemMessage(SYSTEM),
      new HumanMessage(userPrompt),
    ]);

    return res.json({ items: result.final_list, reasoning: result.reasoning });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to process grocery instructions.' });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
app.listen(PORT, () => console.log(`Grocery API running on http://localhost:${PORT}`));


