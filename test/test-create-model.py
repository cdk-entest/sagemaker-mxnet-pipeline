import os 
import json
import boto3
from sagemaker.model import Model
from sagemaker.session import Session
import tarfile

# load config 
with open("./../config.json", "r", encoding="utf-8") as file:
    config = json.load(file)

# update model data
def update_model_data():
    s3 = boto3.resource('s3')
    # download model data from s3
    s3.meta.client.download_file(
        config['BUCKET'],
        config["MODEL_PATH_KEY"],
        "model.tar.gz"
    )
    # extract data
    os.system("tar -xvf model.tar.gz")
    # add mnist.py or inference.py 
    tar = tarfile.open('model.tar.gz', 'w:gz')
    for name in [
        'model-0000.params',
        'model-shapes.json',
        'model-symbol.json',
        'code/mnist.py']:
        tar.add(name)
    tar.close()
    # upload model data to s3
    s3.meta.client.upload_file(
        "model.tar.gz",
        config["BUCKET"],
        config["MODEL_PATH_KEY"]
    ) 
    return None 


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

def deploy_model_with_sagemaker():
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
        sagemaker_session=Session(),
        entry_point="mnist.py"
    )
    # create an endpoint 
    endpoint = model.deploy(
        initial_instance_count=1, 
        instance_type="ml.m4.xlarge",
        serializer=None
    )
    # check
    print(endpoint)



if __name__=="__main__":
    # create_model_with_sagemaker()
    # deploy_model_with_sagemaker()
    update_model_data()