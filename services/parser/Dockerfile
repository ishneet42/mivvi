# Mivvi parser service — deployable to Render, Fly.io, Railway, or any
# container platform. Listens on $PORT (default 8001).
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8001

WORKDIR /app

# System deps for Pillow (libjpeg, zlib).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo zlib1g && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8001

# Uvicorn picks up $PORT so Render / Fly / Railway can bind any port.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}"]
