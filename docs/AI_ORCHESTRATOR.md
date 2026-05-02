# AI Orchestrator

The AI orchestrator is Synapse's business intelligence layer, not a generic chatbot wrapper.

## Prompt Lifecycle

1. Load tenant-scoped conversation and agent.
2. Select recent conversation history.
3. Retrieve placeholder knowledge context.
4. Build a system prompt with agent goal, personality, rules, instructions, and knowledge.
5. Call the configured LLM provider.
6. Parse provider output into a structured response contract where possible.

## Provider Boundary

Providers implement `LlmProvider`:

- `generate(input): Promise<output>`

OpenAI is the first provider. Future providers should be added through the same interface rather than branching provider-specific behavior through the orchestrator.

## Structured Output Strategy

`AiAgentResponse` lives in `packages/contracts` and includes:

- `reply`
- `leadExtraction`
- `intent`
- `shouldEscalate`
- `metadata`

The current parser safely falls back to plain text. A later pass should enforce JSON schema output or tool/function style responses.

## Future Local LLM Strategy

Local LLMs should be added through providers for Ollama or vLLM-compatible APIs. The orchestrator should not care whether a model is remote or local; deployment and model capability should be handled in provider configuration.

## Future RAG

Do not overbuild RAG yet. The next practical step is chunking/versioning knowledge documents and introducing embeddings behind a provider boundary.
