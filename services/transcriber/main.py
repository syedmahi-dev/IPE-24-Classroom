from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import faster_whisper
from sentence_transformers import SentenceTransformer
import tempfile, os, base64

app = FastAPI(title="IPE-24 Transcriber + Embedder")

# Load models once on startup
print("Loading Whisper model...")
whisper_model = faster_whisper.WhisperModel("base", device="cpu", compute_type="int8")

print("Loading embedding model...")
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

print("Models ready.")


class TranscribeRequest(BaseModel):
    audio_base64: str
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

        with tempfile.NamedTemporaryFile(
            suffix=os.path.splitext(req.filename)[1], delete=False
        ) as f:
            f.write(audio_bytes)
            tmp_path = f.name

        segments, info = whisper_model.transcribe(tmp_path, beam_size=3, language="en")
        transcript = " ".join(seg.text.strip() for seg in segments)

        os.unlink(tmp_path)
        return {
            "transcript": transcript,
            "language": info.language,
            "duration": info.duration,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed")
def embed(req: EmbedRequest):
    if not req.text or len(req.text.strip()) < 2:
        raise HTTPException(status_code=400, detail="Text too short")

    embedding = embed_model.encode(req.text, normalize_embeddings=True).tolist()
    return {"embedding": embedding, "dimensions": len(embedding)}
