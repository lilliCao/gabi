import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *

FRAMES = {
    "m1": "1 minute",
    "m30": "30 minutes",
    "H1": "1 hour",
    "H4": "4 hours",
    "D1": "1 day",
    "W1": "1 week"
}


def tumbling_window(name, df, decimal_places=5):
    interval = FRAMES[name]

    r = lambda x: round(col(x), decimal_places).alias(x)

    return df.withWatermark("timestamp", "0 second") \
        .groupBy(window("timestamp", interval), "symbol") \
        .agg(min("bid").alias("minBid"), max("bid").alias("maxBid"),
             min("ask").alias("minAsk"), max("ask").alias("maxAsk"),
             first("bid").alias("openBid"), last("bid").alias("closeBid"),
             first("ask").alias("openAsk"), last("ask").alias("closeAsk"),
             count("bid").alias("count")) \
        .select(unix_timestamp("window.start").alias("ts"),
                r("openBid"), r("closeBid"), r("minBid"), r("maxBid"),
                r("openAsk"), r("closeAsk"), r("minAsk"), r("maxAsk"),
                "count", "symbol") \
        .withColumn("frame", lit(name))


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

    schema = StructType() \
        .add("symbol", StringType()) \
        .add("bid", DoubleType()) \
        .add("ask", DoubleType()) \
        .add("high", DoubleType()) \
        .add("low", DoubleType()) \
        .add("updated", LongType())

    df = spark.readStream.format('kafka') \
        .option('kafka.bootstrap.servers', brokers) \
        .option('subscribe', 'dad.price.0') \
        .option("startingOffsets", "earliest") \
        .load() \
        .selectExpr("CAST(key AS STRING)", "CAST(value AS STRING)") \
        .select(from_json("value", schema).alias("data")).select("data.*") \
        .withColumn('timestamp', to_timestamp(round(col("updated") / 1000))) \
        .withColumn('avg', (col("bid") + col("ask")) / 2)

    windows = []
    for fr in FRAMES:
        res = tumbling_window(fr, df)
        query = res \
            .selectExpr("to_json(struct(*)) as value") \
            .writeStream \
            .format('kafka') \
            .option('kafka.bootstrap.servers', brokers) \
            .option('topic', 'dad.candle.0') \
            .option('checkpointLocation', 'checkpoint') \
            .outputMode('append') \
            .start()
        windows.append((query, res))
    # Debug
    if True:
        query_debug = windows[0][1].writeStream \
            .format('console') \
            .outputMode('append') \
            .start()
    windows[0][0].awaitTermination()
