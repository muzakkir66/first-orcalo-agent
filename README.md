# first-orcalo-agent

To install dependencies:

```bash
node is already enough for this repo
```

To run:

```bash
node --env-file=.env index.js "Explain Node streams in 2 lines"
```

For larger code outputs, raise the token limit:

```bash
node --env-file=.env index.js --max-tokens 600 "Generate a small Express.js auth route"
```

## Groq integration

This project now sends prompts to the Groq Chat Completions API with a compact prompt strategy to reduce token usage.

Add your API key in `.env`:

```bash
GROQ_API_KEY=your_key_here
```

The current code also accepts the old `GRAQ_API_KEY` name so existing local setup does not break.

Run a prompt:

```bash
node --env-file=.env index.js "Generate a small Node.js file uploader"
```

If your local npm setup works, you can also use:

```bash
npm run ask -- "Generate a small Node.js file uploader"
```

Token-saving choices already built in:

- short system prompt
- low default `max_tokens`
- low temperature
- only the current user prompt is sent, not full history
