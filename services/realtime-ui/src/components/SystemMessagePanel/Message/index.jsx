import React from 'react';
import "./styles.css";
import moment from "moment";

function Message({message}) {
    return(
        <div className='message'>
            - {moment(message.ts * 1000).utc().format("DD.MM.YYYY hh:mm:ss")} : Price {message.closeBid}
        </div>
    )
}

export default Message;