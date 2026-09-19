# ChatGPT connection and daily task

Create a dedicated private Secure MCP Tunnel named **Anki** in the OpenAI Platform. Connect it to the personal ChatGPT workspace, then run `python3 ops/install_tunnel.py tunnel_...` with its ID. This uses the existing Cortex tunnel client's runtime key and supervises a separate Anki MCP process. Add the tunnel as an **Anki** app in ChatGPT. A local MCP process alone is not reachable from ChatGPT.

Create a ChatGPT scheduled task for **7:00 a.m., America/Bogota** with this prompt:

> Use @Anki every morning to call `get_generation_context` for today's Bogota date. If today's run is complete, stop. Make up to five concise basic or cloze cards from eligible passages only. For every card, use its `sourcePassageId`, quote an exact supporting sentence in `evidence`, and put an answer in that quote. Do not use material dated in the future, unread book pages or locations, or facts not in the passage. If there is no suitable material or the unreviewed pool is full, call `submit_generated_cards` with an empty `cards` array so the zero-card run is recorded. Otherwise call `submit_generated_cards` once with the returned daily run key and up to five cards. Call `get_generation_run` to verify that a success or zero result was saved. If a tool or source read fails, call `record_generation_failure` with the daily run key and a short reason. Report the saved card count and any rejected cards.

The task must be tested from the native ChatGPT phone app with an `@Anki` tool call. A completed desktop MCP call does not establish phone access or an unattended scheduled run.
