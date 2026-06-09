import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = express.Router();
const anthropic = new Anthropic();

router.post("/", async (req, res) => {
  const { messages } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (process.env.MOCK_AI === "true") {
    res.json({ content: "Mocked response." });
    return;
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8096,
      thinking: { type: "adaptive" },
      system:
        "You are a creative and knowledgeable chef assistant for Chef Clyde. " +
        "Help users discover and create delicious recipes. When asked for a recipe, " +
        "provide clear ingredients with measurements and step-by-step cooking instructions. " +
        "You can also help with ingredient substitutions, scaling, and cooking tips.",
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    res.json({ content: textBlock?.text ?? "" });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export default router;
