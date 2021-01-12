function calculateNewCandle(lastCandle, updateData, frameInSec) {
    console.log("udpatedata", updateData, lastCandle);
    const sec = Math.floor((updateData.updated / 1000));
    const endTime = sec - sec % frameInSec;// + frameInSec;
    const val = updateData.bid;
    const retval = {...lastCandle};
    retval.time = endTime;
    if (val > retval.high) {
        retval.high = val;
    }
    if (val < retval.low) {
        retval.low = val;
    }
    retval.close = val;
    if (endTime > lastCandle.time) {
        return lastCandle;
    }
    return retval;
}


export {
    calculateNewCandle,
};