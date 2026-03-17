FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r /app/requirements.txt

COPY . /app

CMD ["sh", "-c", "python manage.py migrate && daphne -b ${BACKEND_HOST} -p ${BACKEND_PORT} patchtalent.asgi:application"]
