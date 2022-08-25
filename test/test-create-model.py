import json
import boto3
from sagemaker.model import Model
from sagemaker.session import Session

# load config 
with open("./../config.json", "r", encoding="utf-8") as file:
    config = json.load(file)

def create_model_with_boto3():
    # client boto3 
    client = boto3.client("sagemaker", region_name="us-east-1")
    # create a model 
    resp = client.create_model(
        ModelName="MyMxNetDemo",
        PrimaryContainer={
            "Image": config["ECR_IMG_URL"],
            "Mode": "SingleModel",
            "ModelDataUrl": config["MODEL_PATH"],
            "Environment": {
                "SAGEMAKER_CONTAINER_LOG_LEVEL": "20",
                "SAGEMAKER_PROGRAM": "mnist.py",
                "SAGEMAKER_REGION": "us-east-1",
                "SAGEMAKER_SUBMIT_DIRECTORY": "/opt/ml/model/code",
            },
        },
        ExecutionRoleArn=config["ROLE"],
    )
    print(resp)

def create_model_with_sagemaker():
    # init a model 
    model = Model(
        name="MxNetModelCreatedFromSagMaker",
        image_uri=config['ECR_IMG_URL'],
        model_data=config['MODEL_PATH'],
        role=config['ROLE'],
        env={
            "SAGEMAKER_CONTAINER_LOG_LEVEL": "20",
            "SAGEMAKER_PROGRAM": "mnist.py",
            "SAGEMAKER_REGION": "us-east-1",
            "SAGEMAKER_SUBMIT_DIRECTORY": "/opt/ml/model/code",
        },
        sagemaker_session=Session()
    )
    # create the model 
    resp = model.create(
        instance_type='ml.m4.xlarge')
    # check
    print(resp)


if __name__=="__main__":
    create_model_with_sagemaker()
