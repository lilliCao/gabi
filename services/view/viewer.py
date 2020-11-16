# Import KafkaConsumer from Kafka library
from kafka import KafkaConsumer
import os

kafka_client = os.environ['KAFKA']
topic = os.environ['TOPIC']
group = os.environ['GROUP']

bootstrap_servers = [kafka_client]
consumer = KafkaConsumer(topic, group_id=group, bootstrap_servers=bootstrap_servers)

# Read and print message from consumer
for msg in consumer:
    print("Topic Name=%s,Message=%s".format(msg.topic, msg.value))
