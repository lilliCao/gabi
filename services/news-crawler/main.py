import json
from datetime import timezone, datetime
import w3lib.html
import scrapy
from kafka import KafkaProducer
import os
from scrapy.crawler import CrawlerRunner
from twisted.internet import reactor
import re

topic = os.environ['TOPIC']
kafka = os.environ['KAFKA']
pages = int(os.environ['PAGES'])
schedule = int(os.environ['SCHEDULE'])
symbol = 'EUR/USD'

producer = KafkaProducer(bootstrap_servers=[kafka],
                         value_serializer=lambda x:
                         json.dumps(x).encode('utf-8'))


class NewsSpider(scrapy.Spider):
    name = "news"
    start_urls = []
    last_crawl = None
    crawl_page = 0

    for i in range(pages):
        start_urls.append('https://www.dailyfx.com/market-news/articles/{}'.format(i + 1))

    def get_text_of_the_article(self, response):
        """
        Get actual news text and send to kafka
        :param response:
        :return:
        """
        item = response.request.meta['item']

        content = response.xpath('//div[@class="dfx-articleBody__content"]').extract()[0]

        advertisement = response.xpath(
            '//div[@class="dfx-articleBody__content"]//*[contains(@class,"dfx-ad")]'
        ).extract()[0]

        # TODO: remove banner does not work
        banner = response.xpath(
            '//div[@class="dfx-articleBody__content"]//*[contains(@class,"dfx-inHouseGuideBannerComponent")]'
        ).extract()[0]

        content = content.replace(advertisement, "")
        content = content.replace(banner, "")


        if symbol.replace('/', '') in content or symbol in content:
            print("found", item['title'])
            text = w3lib.html.remove_tags(content, keep=('h2','li'))
            text = w3lib.html.replace_tags(text, token='\n').strip()

            # TODO: change  multiple lines to one line does not work
            text = re.sub(r'\n+', '\n',text)
            # TODO: change  multiple spaces to one space does not work
            text =re.sub(r'\s+', '\s',text)
            item['text'] = text
#
#             print('Publishing to kafka.....Time....{} Title ..... {}'.format(item['time'], item['title']))
#             producer.send(topic, item)

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
            time_reformat = int(
                datetime.strptime(time_str, '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc).timestamp())
            url = article.css('a::attr(href)')[0].get()
            if "fundamental/article" in url:
                continue
            data = {
                'title': title,
                'time': time_reformat,
                'url': url,
                'symbol': symbol.replace('/', ''),
                'source': 'DailyFX'
            }

            if data not in news:
                news.append(data)
        # Sort news from newest to oldest
        news = sorted(news, key=lambda x: x['time'], reverse=True)
        print('Receiving {} articles Sample {}'.format(len(news), news[0]))
        for item in news:
            #if NewsSpider.last_crawl is None or NewsSpider.crawl_page < pages:
            #    print('This is the first crawling. Last crawl is {} or number of pages have been crawled {}'
            #          .format(NewsSpider.last_crawl, NewsSpider.crawl_page))
            #elif item['time'] < NewsSpider.last_crawl:
            #    print('These news have already read the last time, skip all. Aborting crawling')
            #    break
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
    d.addCallback(schedule_next_crawl, 60 * schedule)


if __name__ == "__main__":
    crawl()
    reactor.run()
