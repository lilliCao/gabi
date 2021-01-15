import React, {useEffect, useState} from 'react';
import useSocket from "../../hooks/useSocket";
import Message from "./Message";
import "./styles.css"


function SystemMessagePanel() {
    const socket = useSocket();
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState();

    useEffect(() => {
        socket.on('predictioncandle', prediction => {
            console.log('new prediction', prediction)
            if (currentMessage && currentMessage.ts === prediction.ts) return;
            setCurrentMessage(prediction);

        });
        // return () => {
        //     socket.disconnect()
        // }
    }, [socket])

    useEffect(() => {
        if (!currentMessage) return;
        if (messages.length > 0 && messages[messages.length - 1].ts === currentMessage.ts) return;
        setMessages([...messages, currentMessage]);

    }, [currentMessage]);


    return (
        <div className='messages-panel-wrapper'>
            <div className='messages-header'> System message</div>
            <div className='messages-list'>
                {
                    messages.map(msg =>
                        <Message
                            key={msg.ts}
                            message={msg}/>)
                }
            </div>

        </div>
    )
}

export default SystemMessagePanel;