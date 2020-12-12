import React, {useState} from 'react';
import Select from "react-dropdown-select";
import './styles.css';
import LineIcon from "../../../assets/images/line-chart.png";
import CandlestickIcon from "../../../assets/images/candlestick-chart.png";


function HeaderToolbar({onChangeCurrency, onChangeInterval, onChangeChartType}) {
    const currencies = [
        {id: "EURUSD", name: "EURUSD"},
        {id: "USDEUR", name: "USDEUR"}
    ];
    const intervals = [
        {id: "1m", name: "1 Minute"},
        {id: "30m", name: "30 Minuten"},

        {id: "1h", name: "1 Stunde"},
        {id: "4h", name: "4 Stunden"},

        {id: "1d", name: "1 Tag"},
    ];

    const chartTypes = [
        {id: "line", name: "Line", icon: LineIcon},
        {id: "candles", name: "Candle", icon: CandlestickIcon},
    ];
    const [currencyId, setCurrencyId] = useState(currencies[0].id);
    const [intervalId, setIntervalId] = useState(intervals[0].id);
    const [selectedChartTypeId, setChartTypeId] = useState(chartTypes[0].id);

    /** line chart
     <a target="_blank" href="https://icons8.com/icons/set/line-chart">Line Chart icon</a> icon by <a target="_blank" href="https://icons8.com">Icons8</a>
     */

    /** candles
     <a target="_blank" href="https://icons8.com/icons/set/candle-sticks">Candlestick Chart icon</a> icon by <a target="_blank" href="https://icons8.com">Icons8</a>
     */
    const handleSelectCurrency = (values) => {
        setCurrencyId(values[0].id);
        if (onChangeCurrency) {
            onChangeCurrency(values[0].id)
        }
    }

    const handleSelectInterval = (values) => {
        setIntervalId(values[0].id);
        if (onChangeInterval) {
            onChangeInterval(values[0].id)
        }
    }

    const handleSelectChartType = (values) => {
        setChartTypeId(values[0].id);
        if (onChangeChartType) {
            onChangeChartType(values[0].id)
        }
    }
    return (
        <div style={{display: 'flex', direction: 'column'}}>
            <div style={{width: "150px", maxWidth: "150px"}}>
                <Select options={currencies}
                        values={[currencies.find(opt => opt.id === currencyId)]}
                        labelField='name'
                        valueField='id'
                        dropdownHandle={false}
                        keepOpen={false}
                        searchable={false}
                        dropdownGap={-3}
                        onChange={handleSelectCurrency}
                />
            </div>

            <div style={{width: "150px", maxWidth: "150px"}}>
                <Select options={intervals}
                        values={[intervals.find(opt => opt.id === intervalId)]}
                        labelField='name'
                        valueField='id'
                        dropdownHandle={false}
                        keepOpen={false}
                        searchable={false}
                        dropdownGap={-3}
                        onChange={handleSelectInterval}
                />
            </div>

            <div style={{width: "150px", maxWidth: "150px"}}>
                <Select options={chartTypes}
                        values={[chartTypes.find(opt => opt.id === selectedChartTypeId)]}
                        valueField='id'
                        dropdownHandle={false}
                        keepOpen={false}
                        searchable={false}
                        dropdownGap={-3}
                        onChange={handleSelectChartType}
                        itemRenderer={({item, methods}) => {
                            return (
                                <div className={`item ${item.id === selectedChartTypeId ? 'item-selected' : ''}`}
                                     onClick={() => methods.addItem(item)}>
                                    <img className='chart-icon' src={item.icon} alt=""/>
                                    <div className='labelRow'>{item.name}</div>
                                </div>

                            )
                        }}
                        contentRenderer={({state}) => {
                            const item = state.values[0];
                            return (
                                <div className='selected-item-label'>
                                    <img className='chart-icon' src={item.icon} alt=""/>
                                    <div className='labelRow'>{item.name}</div>
                                </div>
                            )
                        }}
                />
            </div>
        </div>
    )
}


export default HeaderToolbar;