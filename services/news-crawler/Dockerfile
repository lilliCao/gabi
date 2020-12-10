FROM python:3.7-alpine

RUN pip3 install kafka-python
RUN pip3 install scrapy
RUN pip3 install twisted
RUN pip3 install w3lib

WORKDIR /app

COPY . /app

ENTRYPOINT ["python3", "main.py"]
