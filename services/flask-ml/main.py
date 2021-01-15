import os.path
import flask
import numpy as np
from keras.models import load_model
import keras.backend as K
import joblib

app = flask.Flask(__name__)
SYMBOLS = ["EURUSD"]
FRAMES = ["m1", "m30", "H1"]
models = {}
scalers = {}


def root_mean_squared_error(y_true, y_pred):
    return K.sqrt(K.mean(K.square(y_pred - y_true)))


def load_local_model(model_name):
    model = None
    if os.path.exists(model_name):
        model = load_model(model_name, compile=False)
        model.compile(optimizer='adam', loss=root_mean_squared_error)
    return model


for symbol in SYMBOLS:
    for frame in FRAMES:
        if symbol not in models:
            models[symbol] = {}
        if symbol not in scalers:
            scalers[symbol] = {}
        models[symbol][frame] = load_local_model("{}_{}.h5".format(symbol, frame))
        scalers[symbol][frame] = joblib.load("scaler_{}_{}.pkl".format(symbol, frame))

temp_counter = 0


def find_prediction(arr, model, scaler):
    x = scaler.transform(arr)
    x1 = x[:100]
    # x2 = x[1:]
    p1 = model.predict(x1.reshape(1, 100, 4))
    inv1 = np.zeros(4)
    inv1[3] = p1[0][0]
    # p2 = model.predict(x2.reshape(1, 60, 4))
    # inv2 = np.zeros(4)
    # inv2[3] = p2[0][0]
    return scaler.inverse_transform([inv1])[0][3]


@app.route("/predict", methods=['POST'])
def predict():
    # get the request parameters
    params = flask.request.get_json(force=True)

    # if parameters are found, echo the msg parameter
    if params is not None:
        symbol = params["symbol"]
        frame = params["frame"]
        open_bids = params['o']
        high_bids = params['h']
        low_bids = params['l']
        close_bids = params['c']
        tsx = params['tsx']
        if open_bids == None or len(open_bids) < 100:
            return '-1', 500

        x = []
        for v in zip(open_bids, high_bids, low_bids, close_bids):
            x.append(v)
        x = np.array(x)
        # d = np.diff(x[:, 3]) * 1000
        # x = x[1:]
        # print(x, flush=True)
        # with open('fk_{}.json'.format(tsx[-1]), 'w') as f:
        #     json.dump(params, f)
        if symbol in models and models[symbol][frame] is not None and \
                symbol in scalers and scalers[symbol][frame] is not None:
            prediction = find_prediction(x, models[symbol][frame], scalers[symbol][frame])
            print("prediction", prediction, close_bids[-2:], flush=True)
            # x = scalers[symbol][frame].transform(x)
            # x = np.hstack([x, d.reshape(-1, 1)])
            # prediction = models[symbol][frame].predict(x.reshape(1, 10, 5))
            # print('prediction: {}'.format(round(prediction[0][0] / 1000, 5)), flush=True)
            # print('last: {}'.format(float(close_bids_arr[-1]), flush=True))
            # print('final', str(round(prediction[0][0] / 1000 + float(close_bids_arr[-1]), 5)), flush=True)
            return str(prediction), 200
    return '-1', 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
