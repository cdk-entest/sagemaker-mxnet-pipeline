"""
haimtran
- use sagemaker mxnet container with entry_point - my own script
- then this run script will call sagemaker mxnet trainning
- a model will be created and save to s3 for CDK stack deployment
- optionally sagemaker can deploy a endpoint from this script
"""

import os
import boto3
from sagemaker.mxnet import MXNet

# training input
region = boto3.Session().region_name
train_data_location = (
    f"s3://sagemaker-sample-data-{region}/mxnet/mnist/train"
)
test_data_location = (
    f"s3://sagemaker-sample-data-{region}/mxnet/mnist/test"
)
# training output
model_artifacts_location = f"s3://{os.environ['BUCKET']}/mxnet-mnist-example/code"
custom_code_upload_location = (
    f"s3://{os.environ['BUCKET']}/mxnet-mnist-example/code"
)
# aws managed mxnet container
mnist_estimator = MXNet(
    entry_point="mnist.py",
    role=os.environ['SAGEMAKER_ROLE'],
    output_path=model_artifacts_location,
    code_location=custom_code_upload_location,
    instance_count=1,
    instance_type="ml.m4.xlarge",
    framework_version="1.4.1",
    py_version="py3",
    hyperparameters={"learning-rate": 0.1},
)
# train in sagemaker - model params will be saved to S3
mnist_estimator.fit(
    {"train": train_data_location, "test": test_data_location}
)
# deploy model as an endpoint
# mnist_estimator.deploy(
#     initial_instance_count=1,
#     instance_type="ml.m4.xlarge",
#     serializer=None)
# get the training output - model path
print(f"model data: {mnist_estimator.model_data}")
