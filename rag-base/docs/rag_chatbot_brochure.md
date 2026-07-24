# Omnisense RAG Chatbot

Ask questions across your documents and data sources in one conversational workspace.

The Omnisense RAG Chatbot helps you turn scattered operational knowledge into answers you can use. Instead of switching between PDFs, uploaded files, MongoDB records, analytics tables, and application pages, you can ask a natural-language question and let the assistant retrieve the right context before responding.

## What You Can Do

### Chat With Your Own Knowledge

- Ask questions in plain language and get answers grounded in connected documents and databases.
- Search uploaded PDFs and text files semantically, even when your wording does not exactly match the source text.
- Use both session-specific documents and your reusable global documents as answer context.
- Enable or disable documents so each conversation uses only the sources that matter.

### Work Across Multiple Data Sources

- Query MongoDB collections without writing filters or aggregation pipelines yourself.
- Explore ClickHouse analytics tables with natural-language requests.
- Retrieve counts, records, summaries, schemas, and analytical results from connected systems.
- Combine document context and structured database results in a single response.

### Keep Conversations Organized

- Create separate chat sessions for different investigations, projects, customers, or workflows.
- Return to previous conversations from the sidebar.
- See past messages in chronological order, so context is not lost between questions.
- Keep each user's sessions private through authenticated access.

### Get Answers as They Are Generated

- Watch responses stream into the chat window in real time.
- Continue working without waiting for a full response to finish silently in the background.
- See clear error feedback if a data source or tool cannot complete a request.

### Bring New Documents Into the Assistant

- Add documents to a single session when they are relevant only to that conversation.
- Add global documents when they should be available across your future work.
- Let the chatbot retrieve the most relevant chunks automatically when you ask a question.
- Refresh available resources after new global documents are added.

### Navigate Faster

- Turn natural-language requests into configured page URLs.
- Ask for a page view such as events, maps, or filtered results, and let the assistant build the right query parameters.
- Move from a question to the relevant application view without manually composing URLs.

## Everyday Use Cases

- "Summarize the key points from this uploaded vessel report."
- "Find records in MongoDB that match this customer or event."
- "How many items match these criteria?"
- "Show trends from the analytics table for this time period."
- "Which documents mention this vessel, location, or incident?"
- "Open the events page filtered for these attributes."
- "Compare what the database says with what the uploaded report says."

## Why Users Like It

- One place to ask: documents, operational databases, analytics, and navigation tools are available through the same chat flow.
- Less query writing: users can ask for outcomes instead of constructing SQL, Mongo filters, or URL parameters by hand.
- Context-aware answers: the assistant can use chat history, retrieved document chunks, and source schemas to respond with better grounding.
- Source control per conversation: users can decide which uploaded documents are active for retrieval.
- Secure by default: chat sessions and messages are tied to the authenticated user.

## How It Feels To Use

1. Log in.
2. Create or select a conversation.
3. Add any relevant documents.
4. Ask a question in plain language.
5. Receive a streamed answer that can draw from enabled documents and connected data tools.
6. Continue refining the conversation without losing previous context.

## Feature List

| Feature | User Benefit |
| --- | --- |
| Authenticated login | Gives each user a private workspace where their chats, uploaded documents, and saved sessions stay tied to their own account. |
| Saved chat sessions | Lets users split work by investigation, customer, vessel, incident, project, or workflow, then return later without rebuilding the context from scratch. |
| Streaming responses | Shows the answer as it is being generated, so users can start reading, checking direction, and continuing their work without waiting for a silent loading state. |
| Conversation history | Keeps earlier questions and answers available inside the session, making follow-up questions more natural and reducing the need to repeat background details. |
| Session documents | Lets users attach documents that matter only to the current conversation, such as a one-off report, case file, export, or customer-specific reference. |
| Global documents | Makes frequently used reference material available across future sessions, so teams do not have to upload the same operational documents again and again. |
| Document enable/disable | Gives users control over which documents are used for retrieval, helping them narrow the assistant's context to the sources that are relevant for the task at hand. |
| Semantic document retrieval | Finds useful passages based on meaning and intent, even when the user's question uses different wording than the original document. |
| Operational database questions | Lets users ask about MongoDB records in plain language instead of manually writing database filters, lookup queries, or aggregation logic. |
| Analytics data exploration | Lets users ask questions over ClickHouse tables to get counts, trends, summaries, and other analytical results without writing SQL themselves. |
| Schema-aware tool use | Helps the assistant work with the right collections, tables, fields, and filters, improving accuracy when answering questions over structured data. |
| Natural-language page navigation | Turns requests such as opening events, maps, or filtered views into application URLs with the right parameters already applied. |
| Configurable knowledge sources | Lets teams decide which documents, databases, analytics stores, and navigation tools the chatbot can use in their environment. |
| Flexible model support | Allows the chatbot to run with the AI model configuration that fits the team's deployment needs, including local or remote model options. |
| Clear runtime feedback | Shows useful error details when a document source, database, model, or tool cannot complete a request, so users know what failed and what to try next. |
