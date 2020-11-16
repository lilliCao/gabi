# Import KafkaConsumer from Kafka library
import json
import os
from datetime import datetime
from elasticsearch import Elasticsearch
from kafka import KafkaConsumer


kafka_client = os.environ['KAFKA']
topic = os.environ['TOPIC']
group = os.environ['GROUP']
es_host = os.environ['ELASTICSEARCH']
bootstrap_servers = [kafka_client]

consumer = KafkaConsumer(topic, group_id=group,
                         bootstrap_servers=bootstrap_servers,
                         value_deserializer=lambda x: json.loads(x.decode('utf-8')))

es = Elasticsearch([es_host])

# Read and print message from consumer
for msg in consumer:
    print("Topic Name={},Message={}".format(msg.topic, msg.value))
    payload = json.loads(msg.value)
    if "id_str" not in payload:
        continue
    payload = {
        "id": payload["id"],
        "created_at": datetime.strptime(payload["created_at"], '%a %b %d %H:%M:%S %z %Y'),
        "text": payload["text"],
    }
    response = es.index(
        index='tweet',
        doc_type='tweet',
        id=payload['id'],
        body=payload
    )
