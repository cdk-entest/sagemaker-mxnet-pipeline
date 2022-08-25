"""
haimtran
sageemaker mxnet conatainer with script mode
"""

import json
from sagemaker.mxnet import MXNet
from sagemaker.session import Session
import boto3

# load role for sagemaker
with open("config.json", "r", encoding="utf-8") as file:
    config = json.load(file)

# train and test data loation
region = boto3.Session().region_name
train_data_location = "s3://sagemaker-sample-data-{}/mxnet/mnist/train".format(region)
test_data_location = "s3://sagemaker-sample-data-{}/mxnet/mnist/test".format(region)

# get default bucket
bucket = Session().default_bucket()
model_artifacts_location = f"s3://{bucket}/mxnet-mnist-example/code"
custom_code_upload_location = f"s3://{bucket}/mxnet-mnist-example/code"

# aws managed mxnet container
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

# train in sagemaker
mnist_estimator.fit({"train": train_data_location, "test": test_data_location})

# create a model
model = mnist_estimator.create_model(
    model_server_workers=1,
    role=config["role"],
    entry_point="mnist.py",
)

# how to create a model without going to deploy step?

# deploy model as an endpoint
mnist_estimator.deploy(
    initial_instance_count=1, instance_type="ml.m4.xlarge", serializer=None
)
