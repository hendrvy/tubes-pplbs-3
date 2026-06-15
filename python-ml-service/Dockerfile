FROM python:3.10-slim

WORKDIR /app

RUN mkdir -p /app/models

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY train_models.py ml_api.py ./

RUN python train_models.py

RUN addgroup --system --gid 1001 appuser && \
    adduser --system --uid 1001 --gid 1001 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health').status==200"

CMD ["uvicorn", "ml_api:app", "--host", "0.0.0.0", "--port", "5000"]