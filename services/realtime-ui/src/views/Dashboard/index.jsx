import React from 'react';

import {Responsive, WidthProvider} from 'react-grid-layout';
import RealtimeChart from "../../components/RealtimeChart";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import Sidebar from "../../components/Sidebar";
import NewsFeed from "../../components/NewsFeed";
import SystemMessagePanel from "../../components/SystemMessagePanel";

const ResponsiveGridLayout = WidthProvider(Responsive);

function Dashboard() {
    const layouts = {
        lg: [
            //{i: "0", x: 0, y:0, w:1, h:12},
            {i: "1", x: 0, y:0, w:19, h:8},
            {i: "2", x: 0, y:0, w:19, h:4},
            {i: "3", x: 19, y:0, w:5, h:12},
        ]
    };
    const { height: winHeight, width: winWidth } = useWindowDimensions();
    return (
        <ResponsiveGridLayout className="layout" layouts={layouts}
                              isDraggable={false}
                              isResizable={true}
                              containerPadding={[0,0]}
                              rowHeight={winHeight/12}
                              margin={[0,0]}
                              breakpoints={{lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0}}
                              cols={{lg: 24, md: 24, sm: 24, xs: 24, xxs: 24}}>
            <div key="1" style={{height: '100%'}}>
                <RealtimeChart/>
            </div>
            <div key="2" style={{backgroundColor:"#333", color:'#fff', overflow: 'scroll'}}>
                <SystemMessagePanel/>
            </div>
            <div key="3">
                <NewsFeed/>
            </div>
        </ResponsiveGridLayout>
    )
}

export default Dashboard;