import json
import boto3

client = boto3.client("sagemaker", region_name="us-east-1")

with open("./../config.json", "r", encoding="utf-8") as file:
    config = json.load(file)


# model = Model(
#     image_uri=config["ECR_IMG_URL"],
#     role=config["ROLE"],
#     model_data=config["MODEL_PATH"],
# )

resp = client.create_model(
    ModelName="MyMxNetDemo",
    PrimaryContainer={
        "Image": config["ECR_IMG_URL"],
        "Mode": "SingleModel",
        "ModelDataUrl": config["MODEL_PATH"],
    },
    ExecutionRoleArn=config["ROLE"],
)

print(resp)
