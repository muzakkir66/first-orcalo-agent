import { getExpenseToolContext, isExpenseQuestion } from "./tools/expenses.js";

const apiKey = process.env.GROQ_API_KEY ?? process.env.GRAQ_API_KEY;
const model = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
const defaultMaxTokens = Number(process.env.GROQ_MAX_TOKENS ?? 180);

function buildMessages(userPrompt, toolContext) {
  const messages = [
    {
      role: "system",
      content:
        "You are a compact coding assistant. Return complete answers, no markdown fences, and keep explanations brief unless asked. If tool data is provided, treat it as the source of truth.",
    },
  ];

  if (toolContext) {
    messages.push({
      role: "system",
      content: `Tool result from ${toolContext.toolName}:\n${toolContext.content}`,
    });
  }

  messages.push({
    role: "user",
    content: userPrompt,
  });

  return messages;
}
// for token calculation
function parseArgs(argv) {
  let maxTokens = defaultMaxTokens;
  const promptParts = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--max-tokens") {
      const nextValue = argv[index + 1];
      const parsedValue = Number(nextValue);

      if (!nextValue || Number.isNaN(parsedValue) || parsedValue <= 0) {
        throw new Error("Expected a positive number after --max-tokens.");
      }

      maxTokens = parsedValue;
      index += 1;
      continue;
    }

    promptParts.push(arg);
  }

  return {
    maxTokens,
    userPrompt: promptParts.join(" ").trim(),
  };
}

// Route data-related questions to local tools before asking the model.
async function resolveToolContext(userPrompt) {
  if (!isExpenseQuestion(userPrompt)) {
    return null;
  }

  return getExpenseToolContext();
}

// Keep the LLM request path separate from local tool logic so the entry file stays readable.
async function askGroq(userPrompt, maxTokens, toolContext) {
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY. Add it to your .env file.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages: buildMessages(userPrompt, toolContext),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("Groq returned an empty response.");
  }

  console.log(answer);

  if (toolContext) {
    console.error(`tool=${toolContext.toolName}`);
  }

  if (data.usage) {
    console.error(
      `tokens prompt=${data.usage.prompt_tokens ?? 0} completion=${data.usage.completion_tokens ?? 0} total=${data.usage.total_tokens ?? 0}`,
    );
  }
}

// Parse the CLI input once, then either enrich the prompt with tool data or send it directly.
const { userPrompt, maxTokens } = parseArgs(process.argv.slice(2));

if (!userPrompt) {
  console.error('Usage: node --env-file=.env index.js [--max-tokens 600] "your prompt here"');
  process.exit(1);
}

resolveToolContext(userPrompt)
  .then((toolContext) => askGroq(userPrompt, maxTokens, toolContext))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
