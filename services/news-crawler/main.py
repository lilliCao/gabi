import json
from datetime import datetime
import scrapy
from kafka import KafkaProducer
import os
from scrapy.crawler import CrawlerRunner
from twisted.internet import reactor

topic = os.environ['TOPIC']
kafka = os.environ['KAFKA']
next_pages = os.environ['NEXT_PAGES']
schedule = os.environ['SCHEDULE']

producer = KafkaProducer(bootstrap_servers=[kafka],
                         value_serializer=lambda x:
                         json.dumps(x).encode('utf-8'))


class NewsSpider(scrapy.Spider):
    name = "news"
    start_urls = [
        'https://www.dailyfx.com/market-news/articles'
    ]
    for i in range(next_pages):
        start_urls.append('https://www.dailyfx.com/market-news/articles/{}'.format(i+1))

    def parse(self, response):
        print('Crawling these pages {} at timestamp {}'.format(self.start_urls, datetime.now()))
        list_element = response.css('div.dfx-articleList')
        articles = list_element.css("a")
        news = []
        for article in articles:
            title = article.css('span::text')[0].get()
            time_str = article.css('span::text')[1].get().strip()
            time_reformat = datetime.strptime(time_str, '%Y-%m-%d %H:%M:%S')
            url = article.css('a::attr(href)')[0].get()

            data = {
                'title': title,
                'time': time_reformat,
                'url': url
            }
            news.append(data)
        news = sorted(news, key=lambda x: x['time'], reverse=True)
        print('Receiving {} articles Sample {}'.format(len(news), news[0]))
        print('Publishing to kafka.................................')
        producer.send(topic, news)


def crawl_job():
    """
    Job to start spiders.
    Return Deferred, which will execute after crawl has completed.
    """
    runner = CrawlerRunner()
    return runner.crawl(NewsSpider)


def schedule_next_crawl(null, sleep_time):
    """
    Schedule the next crawl
    """
    reactor.callLater(sleep_time, crawl)


def crawl():
    """
    A "recursive" function that schedules a crawl 30 seconds after
    each successful crawl.
    """
    # crawl_job() returns a Deferred
    d = crawl_job()
    # call schedule_next_crawl(<scrapy response>, n) after crawl job is complete
    d.addCallback(schedule_next_crawl, 60*schedule)


if __name__ == "__main__":
    crawl()
    reactor.run()
