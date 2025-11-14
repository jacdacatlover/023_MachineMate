# Multi-stage Docker build for FastAPI backend
# Optimized for Cloud Run deployment

# ============================================================================
# Stage 1: Build stage
# ============================================================================
FROM python:3.9-slim as builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ============================================================================
# Stage 2: Runtime stage
# ============================================================================
FROM python:3.9-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security BEFORE copying dependencies
RUN useradd -m -u 1000 appuser

# Copy Python dependencies from builder to appuser's home
COPY --from=builder /root/.local /home/appuser/.local

# Make sure scripts in .local are usable
ENV PATH=/home/appuser/.local/bin:$PATH

# Copy application code
COPY app/ /app/app/

# Set ownership
RUN chown -R appuser:appuser /app /home/appuser/.local

USER appuser

# Expose port (Cloud Run will override this with PORT env var)
EXPOSE 8080

# Health check (using PORT from environment)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request, os; urllib.request.urlopen(f'http://localhost:{os.getenv(\"PORT\", \"8080\")}/health/live')"

# Start application
# Cloud Run sets PORT environment variable (default: 8080)
CMD exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8080} \
    --workers 2 \
    --loop uvloop \
    --log-level info
