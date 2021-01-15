import os
from pyspark.sql import SparkSession, Window
from pyspark.sql.functions import *
from pyspark.sql.types import *
from pyspark.sql.udf import UserDefinedFunction
import requests
import json

SYMBOL = "EURUSD"

FRAMES = {
    "m1": "1 minute",
    "m30": "30 minutes",
    "H1": "1 hour",
    "H4": "4 hours",
    "D1": "1 day",
    "W1": "1 week"
}


# def tumbling_window(name, df, decimal_places=5):
#     interval = FRAMES[name]
#
#     r = lambda x: round(col(x), decimal_places).alias(x)
#
#     return df.withWatermark("timestamp", "0 second") \
#         .groupBy(window("timestamp", interval), "symbol", "frame") \
#         .agg(min("bid").alias("minBid"), max("bid").alias("maxBid"),
#              min("ask").alias("minAsk"), max("ask").alias("maxAsk"),
#              first("bid").alias("openBid"), last("bid").alias("closeBid"),
#              first("ask").alias("openAsk"), last("ask").alias("closeAsk"),
#              count("bid").alias("count")) \
#         .select(unix_timestamp("window.start").alias("ts"),
#                 r("openBid"), r("closeBid"), r("minBid"), r("maxBid"), r("highBid"), r("closeBid"),
#                 r("openAsk"), r("closeAsk"), r("minAsk"), r("maxAsk"), r("highAsk"), r("closeAsk")) \
#         .withColumn("frame", lit(name))

def sliding_windows(symbol, frame, df, decimal_places=5):
    return df.withWatermark("timestamp", "3 days") \
        .filter((df['frame'] == frame) &
                (df['symbol'] == symbol) &
                (df['ts'] > unix_timestamp(current_timestamp()) - 3 * 24 * 60 * 60))


def predict(symbol, frame, openBids, highBids, lowBids, closeBids, timestamps):
    tsx = timestamps[-2:]
    # try:
    url = 'http://flask-ml:5000/predict'
    x = requests.post(url, json={
        'symbol': symbol,
        'frame': frame,
        'o': openBids[-100:],
        'h': highBids[-100:],
        'l': lowBids[-100:],
        'c': closeBids[-100:],
        'tsx': timestamps[-2:],
    })
    if x.status_code == 200:
        predictions = x.text.split(',')
        res = []
        interval = tsx[1] - tsx[0]
        last_timestamp = tsx[1] + interval
        for v in predictions:
            res.append([float(v), last_timestamp])
            last_timestamp += interval
        res = {'symbol': symbol, 'frame': frame, 'data': res}
        return json.dumps(res)
        # else:
        #     return ''
    # except:
    #     print('Cannot connect', flush=True)
    return ''


if __name__ == '__main__':
    brokers = os.getenv("KAFKA_BROKERS", "kafka:9092")
    jarsPkgs = ['org.apache.spark:spark-sql-kafka-0-10_2.12:3.0.1']
    SUBMIT_ARGS = f"--packages {','.join(jarsPkgs)} pyspark-shell"
    os.environ["PYSPARK_SUBMIT_ARGS"] = SUBMIT_ARGS

    spark = SparkSession.builder \
        .master('local[*]') \
        .appName('PriceCandlesticks') \
        .config("spark.sql.shuffle.partitions", '1') \
        .getOrCreate()
    spark.sparkContext.setLogLevel("WARN")

    spark.udf.register("predict", predict, StringType())

    schema = StructType() \
        .add("symbol", StringType()) \
        .add("bid", DoubleType()) \
        .add("ask", DoubleType()) \
        .add("high", DoubleType()) \
        .add("low", DoubleType()) \
        .add("updated", LongType())

    #     df = spark.readStream.format('kafka') \
    #         .option('kafka.bootstrap.servers', brokers) \
    #         .option('subscribe', 'dad.price.0') \
    #         .option("startingOffsets", "earliest") \
    #         .load() \
    #         .selectExpr("CAST(key AS STRING)", "CAST(value AS STRING)") \
    #         .select(from_json("value", schema).alias("data")).select("data.*") \
    #         .withColumn('timestamp', to_timestamp(round(col("updated") / 1000))) \
    #         .withColumn('avg', (col("bid") + col("ask")) / 2)
    schema_candles = StructType() \
        .add("_id", LongType()) \
        .add("symbol", StringType()) \
        .add("frame", StringType()) \
        .add("openBid", DoubleType()) \
        .add("closeBid", DoubleType()) \
        .add("highBid", DoubleType()) \
        .add("lowBid", DoubleType()) \
        .add("openAsk", DoubleType()) \
        .add("closeAsk", DoubleType()) \
        .add("highAsk", DoubleType()) \
        .add("lowAsk", DoubleType()) \
        .add("ts", LongType())

    df = spark.readStream.format('kafka') \
        .option('kafka.bootstrap.servers', brokers) \
        .option('subscribe', 'dad.candle.0') \
        .option("startingOffsets", "earliest") \
        .load() \
        .selectExpr("CAST(key AS STRING)", "CAST(value AS STRING)") \
        .select(from_json("value", schema_candles).alias("data")).select("data.*") \
        .withColumn('timestamp', to_timestamp(col('ts'))) \
        .dropDuplicates(['timestamp', 'frame', 'symbol'])

    windows = []

    df = sliding_windows(SYMBOL, 'm1', df)

    df = df.groupBy(df['symbol'], df['frame']) \
        .agg(collect_list(df['openBid']).alias('openBids'),
             collect_list(df['highBid']).alias('highBids'),
             collect_list(df['lowBid']).alias('lowBids'),
             collect_list(df['closeBid']).alias('closeBids'),
             collect_list(df['ts']).alias('tsx'))
    df = df.select(
        UserDefinedFunction(predict, StringType())(df['symbol'], df['frame'],
                                                   df['openBids'], df['highBids'], df['lowBids'],
                                                   df['closeBids'], df['tsx']).alias('value')
    )

    if False:
        query_debug = df.writeStream \
            .format('console') \
            .outputMode('complete') \
            .start() \
            .awaitTermination()
    else:
        df.writeStream \
            .format('kafka') \
            .option('kafka.bootstrap.servers', brokers) \
            .option('topic', 'dad.predictioncandle.0') \
            .option('checkpointLocation', 'checkpoint') \
            .outputMode('complete') \
            .start() \
            .awaitTermination()
