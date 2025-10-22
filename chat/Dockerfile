
FROM python:3.9-slim


WORKDIR /app

COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt


COPY ./app /app



EXPOSE 8001


CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
