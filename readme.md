## SageMaker Options

- built-in algorithms
- script mode
- container mode

sagemaker variables and training outputs

- SM_MODEL_DIR=/opt/ml/model

[training output](https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms-training-algo-output.html)

## Script mode

- aws provide container per framework such as tensorflow, pytouch, mxnet
- you provide training code similar to your local

## SageMaker SDK

create a mxnet estimator

```py
mnist_estimator = MXNet(
    entry_point="mnist.py",
    role=config["role"],
    output_path=model_artifacts_location,
    code_location=custom_code_upload_location,
    instance_count=1,
    instance_type="ml.m4.xlarge",
    framework_version="1.4.1",
    py_version="py3",
    # distribution={"parameter_server": {"enabled": True}},
    hyperparameters={"learning-rate": 0.1},
)
```

train the model

```py
mnist_estimator.fit(
  {
    "train": train_data_location,
     "test": test_data_location
  }
)
```

deploy an endpoint

```py
mnist_estimator.deploy(
    initial_instance_count=1,
    instance_type="ml.m4.xlarge",
    serializer=None
)

```

test the endpoint, create the predictor

```py
predictor = MXNetPredictor(
    sagemaker_session=Session(),
    endpoint_name=config["endpoint-1"]
)
```

load a local image

```py
def load_image_from_file(filename):
    """
    use open cv to read image
    """
    image = mx.image.imread(filename, 0)
    image = mx.image.imresize(image, 28, 28)
    image = image.transpose((2, 0, 1))
    image = image.astype(dtype="float32")
    return image
```

and test it

```py
data = load_image_from_file("data/image-2.png")
data = data.asnumpy()
response = predictor.predict(data=data)
response = list(zip(range(10), response[0]))
response.sort(key=lambda x: 1.0 - x[1])
print(response)
```

## Troubleshooting

model.deploy will create package a model.tar.gz to s3 which contains

```
model
    |--code
        |--mnist.py
    |--model-0000.params
    |--model-shapes.json
    |--model-symbol.json
```

estimator.fit and training will package a model.targ.gz

```
model
    |--model-0000.params
    |--model-shapes.json
    |--model-symbol.json`
```

## Reference

- [amazon sagemaker example](https://github.com/aws/amazon-sagemaker-examples/blob/main/sagemaker-python-sdk/mxnet_mnist/mnist.py)
- [my own image](https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms-training-algo-dockerfile.html)
- [inference.py](https://docs.aws.amazon.com/sagemaker/latest/dg/neo-deployment-hosting-services-prerequisites.html)
- [MXNetModel](https://sagemaker.readthedocs.io/en/stable/frameworks/mxnet/using_mxnet.html#train-a-model-with-mxnet)
- [custom model](https://aws.amazon.com/blogs/machine-learning/deploying-custom-models-built-with-gluon-and-apache-mxnet-on-amazon-sagemaker/)
- [aws image list](https://docs.aws.amazon.com/sagemaker/latest/dg/neo-deployment-hosting-services-container-images.html)
- [pre-trained mxnet](https://aws.amazon.com/blogs/machine-learning/bring-your-own-pre-trained-mxnet-or-tensorflow-models-into-amazon-sagemaker/)
- [troubleshoot](https://docs.aws.amazon.com/sagemaker/latest/dg/neo-troubleshooting-inference.html)
