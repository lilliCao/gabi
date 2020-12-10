import json
from datetime import datetime
import w3lib.html
import scrapy
from kafka import KafkaProducer
import os
from scrapy.crawler import CrawlerRunner
from twisted.internet import reactor

topic = os.environ['TOPIC']
kafka = os.environ['KAFKA']
pages = os.environ['PAGES']
schedule = os.environ['SCHEDULE']

producer = KafkaProducer(bootstrap_servers=[kafka],
                         value_serializer=lambda x:
                         json.dumps(x).encode('utf-8'))


class NewsSpider(scrapy.Spider):
    name = "news"
    start_urls = []
    last_crawl = None
    crawl_page = 0
    for i in range(pages):
        start_urls.append('https://www.dailyfx.com/market-news/articles/{}'.format(i+1))

    def get_text_of_the_article(self, response):
        """
        Get actual news text and send to kafka
        :param response:
        :return:
        """
        item = response.request.meta['item']
        result = response.xpath('//div[@class="dfx-articleBody__content"]').extract_first()
        if 'EURUSD' in result or 'EUR/USD' in result:
            item['text'] = w3lib.html.remove_tags(result)
            print('Publishing to kafka.....Time....{} Title ..... {}'.format(item['time'], item['title']))
            producer.send(topic, str(item))

    def parse(self, response):
        """
        Parsing main page to get news title, date and url for further process
        :param response:
        :return:
        """
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

            if data not in news:
                news.append(data)
        # Sort news from newest to oldest
        news = sorted(news, key=lambda x: x['time'], reverse=True)
        print('Receiving {} articles Sample {}'.format(len(news), news[0]))
        for item in news:
            if NewsSpider.last_crawl is None or NewsSpider.crawl_page < pages:
                print('This is the first crawling. Last crawl is {} or number of pages have been crawled {}'
                      .format(NewsSpider.last_crawl, NewsSpider.crawl_page))
            elif item['time'] < NewsSpider.last_crawl:
                print('These news have already read the last time, skip all. Aborting crawling')
                break
            yield scrapy.Request(url=item['url'], callback=self.get_text_of_the_article, meta={'item': item})
        NewsSpider.last_crawl = datetime.now()
        NewsSpider.crawl_page = NewsSpider.crawl_page + 1
        print('Updating last crawler to {}'.format(NewsSpider.last_crawl))


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
