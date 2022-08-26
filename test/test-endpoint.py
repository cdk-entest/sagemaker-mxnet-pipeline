import json
import mxnet as mx
from sagemaker.mxnet import MXNetPredictor
from sagemaker.session import Session

# load configuration
with open("./../config.json", "r", encoding="utf-8") as file:
    config = json.load(file)

# create a predictor
predictor = MXNetPredictor(
    sagemaker_session=Session(), endpoint_name=config["ENDPOINT"]
)

# load local images
def load_image_from_file(filename):
    """
    use open cv to read image
    """
    image = mx.image.imread(filename, 0)
    image = mx.image.imresize(image, 28, 28)
    image = image.transpose((2, 0, 1))
    image = image.astype(dtype="float32")
    return image


# load local image
data = load_image_from_file("./../data/image-2.png")
data = data.asnumpy()
# predict
print(predictor)
response = predictor.predict(data=data)
response = list(zip(range(10), response[0]))
response.sort(key=lambda x: 1.0 - x[1])
print(response)
