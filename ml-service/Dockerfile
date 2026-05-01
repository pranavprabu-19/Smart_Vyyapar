# syntax=docker/dockerfile:1

FROM python:3.11-slim AS base

WORKDIR /app

# xgboost / scikit-learn need libgomp at runtime; ca-certificates for outbound HTTPS.
RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends \
        libgomp1 \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN groupadd --system --gid 1001 mluser \
    && useradd --system --uid 1001 --gid mluser mluser \
    && chown -R mluser:mluser /app

USER mluser

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
