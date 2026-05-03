# AI Virtual CR — RAG Implementation (VPS Hosted)

## Overview

The Virtual CR is a Retrieval-Augmented Generation (RAG) chatbot powered by Google Gemini 1.5 Flash (free tier). It answers student questions by searching a structured knowledge base of class documents, then generating a grounded, citation-aware response.

Deployment model: the full RAG pipeline (knowledge ingestion, chunking, vector storage, retrieval, and chat response) runs on your VPS stack using Docker services and PostgreSQL + pgvector.

RAG prevents hallucination: the model ONLY answers from retrieved context, and explicitly says "I don't know" when context is missing.

---

## Python Transcriber + Embedder Service

This is a single FastAPI service that handles both voice transcription and text embedding. Run it as a Docker container.

### `services/transcriber/main.py`
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import faster_whisper
from sentence_transformers import SentenceTransformer
import tempfile, os, base64

app = FastAPI()

# Load models once on startup — not per request
print("Loading Whisper model...")
whisper_model = faster_whisper.WhisperModel("base", device="cpu", compute_type="int8")

print("Loading embedding model...")
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

print("Models ready.")


class TranscribeRequest(BaseModel):
    audio_base64: str   # base64-encoded audio bytes
    filename: str = "audio.ogg"


class EmbedRequest(BaseModel):
    text: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/transcribe")
def transcribe(req: TranscribeRequest):
    try:
        audio_bytes = base64.b64decode(req.audio_base64)

        with tempfile.NamedTemporaryFile(suffix=os.path.splitext(req.filename)[1], delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name

        segments, info = whisper_model.transcribe(tmp_path, beam_size=3, language="en")
        transcript = " ".join(seg.text.strip() for seg in segments)

        os.unlink(tmp_path)
        return {"transcript": transcript, "language": info.language, "duration": info.duration}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed")
def embed(req: EmbedRequest):
    if not req.text or len(req.text.strip()) < 2:
        raise HTTPException(status_code=400, detail="Text too short")

    embedding = embed_model.encode(req.text, normalize_embeddings=True).tolist()
    return {"embedding": embedding, "dimensions": len(embedding)}
```

### `services/transcriber/requirements.txt`
```
fastapi==0.111.0
uvicorn==0.30.1
faster-whisper==1.0.3
sentence-transformers==3.0.1
pydantic==2.7.4
python-multipart==0.0.9
```

### `services/transcriber/Dockerfile`
```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download models during build (not at runtime)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
RUN python -c "import faster_whisper; faster_whisper.WhisperModel('base', device='cpu', compute_type='int8')"

COPY main.py .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## RAG Pipeline (Step by Step)

### Step 1: Document Ingestion

The CR uploads source documents via the Admin Panel → AI Knowledge page. Supported sources:

| Source Type | Example |
|---|---|
| `syllabus` | Course syllabus PDF (extracted text) |
| `past_paper` | Previous exam questions |
| `faq` | Manually written Q&A pairs |
| `calendar` | IUT academic calendar events |
| `rule` | IUT academic rules & regulations |
| `class_note` | Specific course notes summary |

The admin paste/upload text, selects source type and course, and submits. The backend:
1. Stores the raw text in `knowledge_documents`
2. Calls `indexDocument(documentId)` which chunks and embeds

### Step 2: Chunking Strategy

```typescript
// lib/knowledge-indexer.ts
const CHUNK_SIZE = 500       // characters — keeps chunks focused
const CHUNK_OVERLAP = 80     // overlap prevents context loss at boundaries

function chunkText(text: string): string[] {
  // Prefer splitting at sentence boundaries
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) ?? [text]
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if ((current + sentence).length > CHUNK_SIZE) {
      if (current.trim()) chunks.push(current.trim())
      // Start next chunk with overlap from end of previous
      current = current.slice(-CHUNK_OVERLAP) + sentence
    } else {
      current += sentence
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.filter(c => c.length > 50)
}
```

### Step 3: Embedding Storage

```typescript
// After chunking, embed each chunk and store in pgvector
for (let i = 0; i < chunks.length; i++) {
  const response = await fetch('http://transcriber:8000/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: chunks[i] }),
  })
  const { embedding } = await response.json()

  await prisma.$executeRaw`
    INSERT INTO knowledge_chunks (id, document_id, chunk_index, content, embedding)
    VALUES (uuid_generate_v4(), ${documentId}::uuid, ${i}, ${chunks[i]}, ${embedding}::vector)
  `
}
```

### Step 4: Query Processing

```typescript
// When student sends a question:
// 1. Embed the query
const queryEmbedding = await getEmbedding(question)

// 2. Search pgvector for top 5 most similar chunks
const results = await prisma.$queryRaw<...>`
  SELECT kc.content, kd.title, kd.source_type, kd.course_code,
         1 - (kc.embedding <=> ${queryEmbedding}::vector) AS similarity
  FROM knowledge_chunks kc
  JOIN knowledge_documents kd ON kc.document_id = kd.id
  WHERE kc.embedding IS NOT NULL
  ORDER BY kc.embedding <=> ${queryEmbedding}::vector
  LIMIT 5
`

// 3. Filter by relevance threshold
const relevant = results.filter(r => r.similarity > 0.55)
```

### Step 5: Prompt Construction

```typescript
function buildSystemPrompt(chunks: SearchResult[]): string {
  const contextBlocks = chunks.map((c, i) =>
    `[Source ${i + 1}: ${c.title} (${c.source_type}${c.course_code ? ` · ${c.course_code}` : ''})]
${c.content}`
  ).join('\n\n---\n\n')

  return `You are the Virtual CR (Class Representative) of IPE-24 batch at Islamic University of Technology (IUT), Bangladesh. Your role is to help students with questions about their batch's academic affairs.

RULES:
1. Answer ONLY using the provided class information below
2. If the answer is NOT in the provided context, respond: "I don't have that specific information in my knowledge base. Please ask the CR directly or check the class notice board."
3. Be friendly, clear, and concise
4. Use bullet points for lists
5. If mentioning exam dates or schedules, remind students to verify with the official notice board
6. Never make up course names, dates, room numbers, or teacher names

CLASS INFORMATION:
${contextBlocks || "No relevant documents found for this query."}

Remember: You are a helpful assistant, not an official source. Always encourage students to verify important information with the CR or official IUT notices.`
}
```

### Step 6: Streaming Response

```typescript
const model = gemini.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    maxOutputTokens: 800,
    temperature: 0.3,    // Lower = more factual, less creative
    topP: 0.8,
  },
})

const chat = model.startChat({ systemInstruction: systemPrompt })
const result = await chat.sendMessageStream(question)

// Stream tokens to client
for await (const chunk of result.stream) {
  controller.enqueue(new TextEncoder().encode(chunk.text()))
}
```

---

## Knowledge Base Management UI

### Admin Panel Features (`/admin/knowledge`)

```tsx
// components/admin/KnowledgeManager.tsx
// Features:
// 1. Document list with source type, course, last updated
// 2. "Add Document" form:
//    - Title input
//    - Source type dropdown (syllabus / faq / past_paper / calendar / rule)
//    - Course selector (optional)
//    - Large textarea for document content
//    - OR: PDF upload (text extracted server-side via pdf-parse)
// 3. "Reindex All" button with progress indicator
// 4. Delete document button (removes chunks too via CASCADE)
// 5. Search test box: type a query, see what chunks it retrieves
```

### PDF Text Extraction
```typescript
// apps/web/app/api/v1/admin/knowledge/route.ts
import pdfParse from 'pdf-parse'

// When file is uploaded instead of text:
const pdfBuffer = Buffer.from(await file.arrayBuffer())
const parsed = await pdfParse(pdfBuffer)
const extractedText = parsed.text
// Then proceed with indexDocument as normal
```

---

## Knowledge Base Seed Data

Populate this before launch. Write these manually:

### FAQ Document (paste as plain text)
```
Q: When is the semester exam?
A: The semester final exam schedule will be posted by IUT Exam Controller. Check the notice board and the class portal for updates.

Q: Who is the CR of IPE-24?
A: [Your name] is the CR of IPE-24. You can reach them via the WhatsApp group or by posting in the class portal.

Q: What are the class timings?
A: Check the class routine on the portal — it is synchronized with the official Google Sheet maintained by the CR.

Q: How many absences are allowed per course?
A: IUT policy allows a maximum of 25% absences. More than 25% absence in any course may result in being barred from that course's exam.

Q: Where can I get past exam papers?
A: Past exam papers are available in the Resources section of the class portal, organized by course.
```

---

## Rate Limiting for Chatbot

```typescript
// 20 questions per user per hour
const { success, remaining } = await rateLimit(`chat:${userId}`, 20, 3600)

if (!success) {
  return NextResponse.json({
    success: false,
    error: { code: 'RATE_LIMITED', message: 'You have reached the 20 questions/hour limit. Try again later.' }
  }, { status: 429 })
}
```

This is generous enough for real use (no student asks 20 academic questions in an hour) but protects against API abuse.

---

## Gemini Free Tier Management

- **Limit:** 15 requests/minute, 1M tokens/day
- **Expected usage:** ~2-5 req/min during peak hours, ~5k tokens/day
- **Protection:** Redis queue if concurrent requests spike above 10/min

```typescript
// lib/gemini-queue.ts
// If more than 12 requests/minute are in flight, delay new ones
const GEMINI_WINDOW_SECONDS = 60
const GEMINI_MAX_PER_WINDOW = 12  // leave headroom below the 15 limit

export async function geminiRateCheck(): Promise<boolean> {
  const { success } = await rateLimit('gemini:global', GEMINI_MAX_PER_WINDOW, GEMINI_WINDOW_SECONDS)
  return success
}
```

---

## Chatbot Feedback Loop

After each response, show thumbs up/down buttons. Store feedback in `chat_logs.thumbs_up`. Review monthly — low-rated answers indicate knowledge gaps or retrieval problems. Fix by:
1. Adding better FAQ entries covering the missed topic
2. Adjusting the similarity threshold if irrelevant chunks are retrieved
3. Rewriting the system prompt for clarity
