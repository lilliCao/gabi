FROM python:3.6.9-alpine

RUN pip3 install kafka-python elasticsearch

WORKDIR /app

COPY . /app

#ENV TOPIC="tweet"
#ENV KAFKA="localhost:9092"
ENV GROUP="group1"

ENTRYPOINT ["python3", "viewer.py"]
