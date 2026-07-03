# FROM python:3.11-slim
# WORKDIR /app
# COPY . /app
# RUN pip install --no-cache-dir -r requirements.txt
# EXPOSE 5000
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]


FROM python:3.12-slim

WORKDIR /app

# Install all system libraries Chromium needs directly.
# This replaces "playwright install-deps" which uses Ubuntu package names
# that do not exist on Debian Trixie (the base for python:3.12-slim).
# Library list matches exactly what Playwright reported as missing.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libexpat1 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libxcb1 \
    libxkbcommon0 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2t64 \
    libatspi2.0-0 \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (separate layer — cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download Chromium binary only (system deps already installed above)
RUN playwright install chromium

COPY . .

EXPOSE 5000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "5000"]