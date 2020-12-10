import os

from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *


def sliding_window(name, df, decimal_places=5):
    name = name.upper()
    frames = {
        "M1": "1 minute",
        "M30": "30 minutes",
        "H1": "1 hour",
        "H4": "4 hours",
        "D1": "1 day",
        "W1": "1 week"
    }
    interval = frames[name]

    # round down
    # m = pow(lit(10), decimal_places).cast(LongType())
    # r = lambda x: round((col(x) * m).cast(LongType()) / m, decimal_places).alias(x)
    # round
    r = lambda x: round(col(x), decimal_places).alias(x)

    return df.withWatermark("timestamp", "0 seconds") \
        .groupBy(window("timestamp", interval, interval), "symbol") \
        .agg(min("bid").alias("minBid"), max("bid").alias("maxBid"),
             min("ask").alias("minAsk"), max("ask").alias("maxAsk"),
             min("avg").alias("minAvg"), max("avg").alias("maxAvg"),
             first("avg").alias("openAvg"), last("avg").alias("closeAvg"),
             first("bid").alias("openBid"), last("bid").alias("closeBid"),
             first("ask").alias("openAsk"), last("ask").alias("closeAsk"),
             count("bid").alias("count")) \
        .select(unix_timestamp("window.start").alias("ts") * 1000, r("openAvg"),
                r("closeAvg"), r("minAvg"), r("maxAvg"), "count",
                "symbol") \
        .withColumn("frame", lit(name))


if __name__ == '__main__':
    brokers = os.getenv("KAFKA_BROKERS", "kafka:9092")
    jarsPkgs = ['org.apache.spark:spark-sql-kafka-0-10_2.12:3.0.1']
    SUBMIT_ARGS = f"--packages {','.join(jarsPkgs)} pyspark-shell"
    os.environ["PYSPARK_SUBMIT_ARGS"] = SUBMIT_ARGS

    spark = SparkSession.builder \
        .master('local[*]') \
        .appName('PriceCandlesticks') \
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
        .option("startingOffsets", "latest") \
        .load() \
        .selectExpr("CAST(key AS STRING)", "CAST(value AS STRING)") \
        .select(from_json("value", schema).alias("data")).select("data.*") \
        .withColumn('timestamp', to_timestamp(col("updated") / 1000)) \
        .withColumn('avg', (col("bid") + col("ask")) / 2)

    res = sliding_window("M1", df)
    query_1 = res.writeStream \
        .format('console') \
        .start()

    query_2 = res \
        .selectExpr("to_json(struct(*)) as value") \
        .writeStream \
        .format('kafka') \
        .option('kafka.bootstrap.servers', brokers) \
        .option('topic', 'dad.candle.0') \
        .option('checkpointLocation', 'checkpoint') \
        .start()

    query_2.awaitTermination()
    query_1.awaitTermination()
