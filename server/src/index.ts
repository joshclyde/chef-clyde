import express from "express";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/chat", (req, res) => {
  const { messages } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
  };
  console.log("Received", messages.length, "messages");
  res.json({
    content: "Mocked response.",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
