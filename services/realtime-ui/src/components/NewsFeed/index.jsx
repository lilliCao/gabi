import React, {useEffect, useState} from 'react'
import FeedItem from "./FeedItem";
import './styles.css';
import {getNews} from "../../services/historicalData";

function NewsFeed() {
    const [news, setNews]= useState([]);
    // const news = [
    //     {
    //         id: 1,
    //         title: 'Euro Latest: ECB to Focus on EUR/USD, EUR/GBP Strengthens as Brexit Hopes Diminish',
    //         content: 'Key Talking Points:The ECB may use verbal pushback to weaken a solid euroBrexit talks continue to be at an impasse despite Johnson and von der Leyen meetingEUR/USD and',
    //         link: 'https://www.dailyfx.com/forex/market_alert/2020/12/10/Euro-Latest-ECB-to-Focus-on-EURUSD-EURGBP-Strengthens-as-Brexit-Hopes-Diminish.html',
    //         source: 'DailyFx',
    //         created_at: 1607597999484
    //     },
    //     {
    //         id: 2,
    //         title: 'GLOBAL MARKETS-ECB to go easy; Brexit goes sour',
    //         content: '* Uncertainty around Brexit and stimulus keeps investors sidelined * ECB expected to expand and extend stimulus * Uncertainly remains over U.S. stimulus By Marc Jones…',
    //         source: 'Reuters',
    //         created_at: 1607597969484
    //     },
    //     {
    //         id: 3,
    //         title: 'EUR/USD Daily Forecast – Test Of Support At 1.2090',
    //         content: 'EUR/USD continues its attempts to settle below the nearest support level at 1.2090.',
    //         link: 'https://www.fxempire.com/forecasts/article/eur-usd-daily-forecast-test-of-support-at-1-2090-687759',
    //         source: 'FXEmpire',
    //         created_at: 1607594999484
    //     },
    //     {
    //         id: 4,
    //         title: 'Euro Latest: ECB to Focus on EUR/USD, EUR/GBP Strengthens as Brexit Hopes Diminish',
    //         content: 'Key Talking Points:The ECB may use verbal pushback to weaken a solid euroBrexit talks continue to be at an impasse despite Johnson and von der Leyen meetingEUR/USD and',
    //         link: 'https://www.dailyfx.com/forex/market_alert/2020/12/10/Euro-Latest-ECB-to-Focus-on-EURUSD-EURGBP-Strengthens-as-Brexit-Hopes-Diminish.html',
    //         source: 'DailyFx',
    //         created_at: 1607587999484
    //     },
    //     {
    //         id: 5,
    //         title: 'GLOBAL MARKETS-ECB to go easy; Brexit goes sour',
    //         content: '* Uncertainty around Brexit and stimulus keeps investors sidelined * ECB expected to expand and extend stimulus * Uncertainly remains over U.S. stimulus By Marc Jones…',
    //         source: 'Reuters',
    //         created_at: 1607577999484
    //     },
    //     {
    //         id: 6,
    //         title: 'EUR/USD Daily Forecast – Test Of Support At 1.2090',
    //         content: 'EUR/USD continues its attempts to settle below the nearest support level at 1.2090.',
    //         link: 'https://www.fxempire.com/forecasts/article/eur-usd-daily-forecast-test-of-support-at-1-2090-687759',
    //         source: 'FXEmpire',
    //         created_at: 1607547999484
    //     }
    // ]
    useEffect(() => {
        getNews('EURUSD', 0, 20).then(res => {
            const news =res.map(item => {
                return {
                    id: item._id,
                    title: item.title,
                    content: item.summary.substr(0, 200),
                    link: item.url,
                    source: item.source,
                    created_at: item.time * 1000
                }
            });
            setNews(news);
        })
    }, []);
    return (
        <div style={{height: '100%'}}>
            <div className='title-wrapper'>
                <div className='title'>Headlines</div>
            </div>
            <div className='feed-list'>
                <ul>
                    {news.map((item, idx) =>
                        <FeedItem key={idx} item={item}/>
                    )}
                </ul>
            </div>
        </div>
    )
}

export default NewsFeed;