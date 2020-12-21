package price

import org.apache.spark.sql._
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types._

object PriceCandlestick {
  val FRAMES: Map[String, String] = Map(
    "m1" -> "1 minute",
    "m30" -> "30 minutes",
    "H1" -> "1 hour",
    "H4" -> "4 hours",
    "D1" -> "1 day",
    "W1" -> "1 week"
  )

  def main(args: Array[String]): Unit = {
    val master = scala.util.Properties.envOrElse("MASTER", "spark://sparkmaster:7077")
    val brokers = scala.util.Properties.envOrElse("BROKERS", "kafka:9092")
    val spark = SparkSession
      .builder
      .appName("PriceCandlestick")
      .master(master)
      .config("spark.sql.shuffle.partitions", "1")
      .getOrCreate()

    val frameName = spark.conf.get("spark.executorEnv.price.frameName", "m1")
    val schema = new StructType()
      .add("symbol", StringType, false)
      .add("bid", DoubleType, false)
      .add("ask", DoubleType, false)
      .add("high", DoubleType, false)
      .add("low", DoubleType, false)
      .add("updated", LongType, false)

    val df = spark
      .readStream
      .format("kafka")
      .option("kafka.bootstrap.servers", brokers)
      .option("subscribe", "dad.price.0")
      .option("startingOffsets", "earliest")
      .load()
      .selectExpr("CAST(key AS STRING)", "CAST(value AS STRING)")
      .select(from_json(col("value"), schema).alias("data")).select("data.*")
      .withColumn("timestamp", to_timestamp(round(col("updated") / 1000)))
      .withColumn("avg", (col("bid") + col("ask")) / 2)

    val res = tumblingWindow(frameName, df, 5)

    res
      .selectExpr("to_json(struct(*)) as value")
      .writeStream
      .format("kafka")
      .option("kafka.bootstrap.servers", brokers)
      .option("topic", "dad.candle.0")
      .option("checkpointLocation", "checkpoint")
      .outputMode("append")
      .start()
      .awaitTermination()
  }

  def tumblingWindow(fr: String, df: DataFrame, decimalPlaces: Integer): DataFrame = {
    val interval = PriceCandlestick.FRAMES(fr)
    val r = (x: String) => round(col(x), decimalPlaces).alias(x)

    df.withWatermark("timestamp", "0 second")
      .groupBy(window(col("timestamp"), interval), col("symbol"))
      .agg(min("bid").alias("minBid"), max("bid").alias("maxBid"),
        min("ask").alias("minAsk"), max("ask").alias("maxAsk"),
        first("bid").alias("openBid"), last("bid").alias("closeBid"),
        first("ask").alias("openAsk"), last("ask").alias("closeAsk"),
        count("bid").alias("count"))
      .select(
        unix_timestamp(col("window.start")).alias("ts"),
        r("openBid"), r("closeBid"), r("minBid"), r("maxBid"),
        r("openAsk"), r("closeAsk"), r("minAsk"), r("maxAsk"), col("count"), col("symbol"))
      .withColumn("frame", lit(fr))
  }
}