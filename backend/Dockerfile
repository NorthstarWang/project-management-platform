FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app /app/app
COPY tests /app/tests

# Environment variables for configuration
# API_BASE_URL: Base URL for API tests (default: http://backend:8000)
ENV API_BASE_URL=http://backend:8000

# FRONTEND_BASE_URL: Base URL for frontend service (default: http://frontend:3000)
ENV FRONTEND_BASE_URL=http://frontend:3000

# ALWAYS_RESET_DATA: Set to "true" to regenerate mock data on every startup
# Default: "false" - preserves existing data, only generates if database is empty
# ENV ALWAYS_RESET_DATA=false

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]