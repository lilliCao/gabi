from tweepy import Stream, OAuthHandler
from tweepy.streaming import StreamListener
from kafka import SimpleProducer, KafkaClient
import os

consumer_key = "nkoqHvi3YvpMikHG0WFBF6zha" # api key
consumer_secret = 'FFKZxArzlSgXecI7PuHj1VzX7TVBSR5gNrngjFB2oS3lUXVJyL' # api secret key
access_token = '2514597780-Nb00AN9uBodQPk4UIaV9VTgZWunmESlqZPQOvsT'
access_token_secret = 'yq9eqnYywHEDbleKlKTOBAm4ZeEEPl92quxkBzoQ439MA'

hashtag = '#eurusd'
topic = os.environ['TOPIC']
kafka_client = os.environ['KAFKA_CLIENT']
debug = os.environ['DEBUG']

class StdOutListener(StreamListener):
    def on_data(self, data):
        print('Receving data and publishing data to {}/{}'.format(kafka_client, topic))
        producer.send_messages(topic, data.encode('utf-8'))
        if debug == 'y':
            print (data)
        return True
    def on_error(self, status):
            print (status)

auth = OAuthHandler(consumer_key, consumer_secret)
auth.set_access_token(access_token, access_token_secret)
kafka = KafkaClient(kafka_client)
producer = SimpleProducer(kafka)
l = StdOutListener()
stream = Stream(auth, l)
stream.filter(track=hashtag)
