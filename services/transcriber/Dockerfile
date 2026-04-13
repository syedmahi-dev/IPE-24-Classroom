FROM python:3.11-slim

WORKDIR /app

# Install ffmpeg (required by faster-whisper for audio decoding)
RUN apt-get update && \
    apt-get install -y ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download models during build so runtime startup is instant
# This adds ~500MB to image but avoids 2-min startup delay
RUN python -c "\
from sentence_transformers import SentenceTransformer; \
SentenceTransformer('all-MiniLM-L6-v2'); \
print('Embedding model downloaded')"

RUN python -c "\
import faster_whisper; \
faster_whisper.WhisperModel('base', device='cpu', compute_type='int8'); \
print('Whisper model downloaded')"

COPY main.py .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
