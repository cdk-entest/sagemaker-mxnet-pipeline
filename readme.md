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
    |--model-symbol.json
```

## SageMaker Endpoint Stack

modelDataUrl stored in system parameter store

```tsx
const modelDataUrl = cdk.aws_ssm.StringParameter.fromStringParameterName(
  this,
  "ModelDataUrl",
  "ModelDataUrl"
).stringValue;
```

execution role for the model

```tsx
// execution role
const role = new cdk.aws_iam.Role(this, "ExecutionRoleMxNetModel", {
  roleName: "ExecutionRoleMxNetModel",
  assumedBy: new cdk.aws_iam.ServicePrincipal("sagemaker.amazonaws.com"),
});

role.addManagedPolicy(
  cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
    "AmazonSageMakerFullAccess"
  )
);

role.addToPolicy(
  new cdk.aws_iam.PolicyStatement({
    effect: Effect.ALLOW,
    resources: ["*"],
    actions: ["s3:*"],
  })
);
```

create a model mxnet

```tsx
const model = new cdk.aws_sagemaker.CfnModel(this, "MxNetModelDemo", {
  modelName: `MxNetModelDemo-${suffix}`,
  // passRole should be in the caller this api
  // sagemaker assume this role to access model artifacts, ecr.
  executionRoleArn: role.roleArn,
  primaryContainer: {
    modelDataUrl: modelDataUrl,
    image: imageUrl,
    mode: "SingleModel",
    environment: {
      SAGEMAKER_CONTAINER_LOG_LEVEL: "20",
      SAGEMAKER_PROGRAM: "mnist.py",
      SAGEMAKER_REGION: "us-east-1",
      SAGEMAKER_SUBMIT_DIRECTORY: "/opt/ml/model/code",
    },
  },
});
```

create endpont configuration

```tsx
const endpointConfig = new cdk.aws_sagemaker.CfnEndpointConfig(
  this,
  "MxNetModelEndpointConfig",
  {
    endpointConfigName: `MxnetModelEndpointConfig-${suffix}`,
    productionVariants: [
      {
        initialVariantWeight: 1,
        initialInstanceCount: 1,
        instanceType: "ml.m4.xlarge",
        modelName: model.modelName?.toString()!,
        variantName: model.modelName?.toString()!,
      },
    ],
  }
);
```

create an endpoint

```tsx
const endpoint = new cdk.aws_sagemaker.CfnEndpoint(
  this,
  "MxNetModelEndpointDemo",
  {
    endpointName: `MxNetModelEndpointDemo-${suffix}`,
    endpointConfigName: endpointConfig.attrEndpointConfigName,
  }
);

endpointConfig.addDependsOn(model);
endpoint.addDependsOn(endpointConfig);
```

## Pipeline Stack

artifacts

```tsx
// artifact
const sourceOutput = new aws_codepipeline.Artifact("SourceOutput");
const sagemakerBuildOutput = new aws_codepipeline.Artifact(
  "SageMakerBuildOutput"
);
const cdkBuildOutput = new aws_codepipeline.Artifact("CdkBuildOutput");
```

codebuild build sagemaker model

```tsx
const sageMakerBuild = new aws_codebuild.PipelineProject(
  this,
  "SageMakerCodeBuild",
  {
    projectName: "BuildMxNetModel",
    environment: {
      privileged: true,
      buildImage: aws_codebuild.LinuxBuildImage.STANDARD_5_0,
      computeType: aws_codebuild.ComputeType.MEDIUM,
      environmentVariables: {
        SAGEMAKER_ROLE: {
          value: props.sageMakerRole,
        },
        BUCKET: {
          value: props.bucketName,
        },
      },
    },
    buildSpec: aws_codebuild.BuildSpec.fromObject({
      version: "0.2",
      phases: {
        install: {
          commands: ["pip install -r requirements.txt"],
        },
        build: {
          commands: ["cd sagemaker", "python run.py"],
        },
      },
    }),
  }
);
```

codebuild need to access s3

```tsx
sageMakerBuild.addToRolePolicy(
  new aws_iam.PolicyStatement({
    effect: aws_iam.Effect.ALLOW,
    resources: ["*"],
    actions: [
      "sagemaker:*",
      "s3:*",
      "lambda:*",
      "iam:GetRole",
      "iam:PassRole",
      "states:*",
      "logs:*",
    ],
  })
);

sageMakerBuild.addToRolePolicy(
  new aws_iam.PolicyStatement({
    effect: Effect.ALLOW,
    resources: ["*"],
    actions: ["ssm:*"],
  })
);
```

codebuild build cdk stack

```tsx
const cdkBuildProject = new aws_codebuild.PipelineProject(
  this,
  "CdkBuildProject",
  {
    projectName: "BuildCdkStack",
    environment: {
      privileged: true,
      buildImage: aws_codebuild.LinuxBuildImage.STANDARD_5_0,
      computeType: aws_codebuild.ComputeType.MEDIUM,
      environmentVariables: {},
    },
    buildSpec: aws_codebuild.BuildSpec.fromObject({
      version: "0.2",
      phases: {
        install: {
          commands: ["cd cdk-pipeline", "npm install"],
        },
        build: {
          commands: ["npm run build", "npm run cdk synth -- -o dist", "ls "],
        },
      },
      artifacts: {
        "base-directory": "cdk-pipeline/dist",
        files: ["*.template.json"],
      },
    }),
  }
);
```

codebuild needs to access ssm to get the model name

```tsx
cdkBuildProject.addToRolePolicy(
  new aws_iam.PolicyStatement({
    effect: Effect.ALLOW,
    resources: ["*"],
    actions: ["ssm:*"],
  })
);
```

pipeline

```tsx
const pipeline = new aws_codepipeline.Pipeline(this, "MxNetCodePipeline", {
  pipelineName: "MxnNetCodePipeline",
  stages: [
    // source
    {
      stageName: "SourceStage",
      actions: [
        new aws_codepipeline_actions.CodeStarConnectionsSourceAction({
          actionName: "GitHub",
          owner: "entest-hai",
          repo: "sagemaker-sdk",
          branch: "main",
          connectionArn: props.codeStarArn,
          output: sourceOutput,
        }),
      ],
    },
    // build model using sagemaker
    {
      stageName: "BuildModel",
      actions: [
        new aws_codepipeline_actions.CodeBuildAction({
          actionName: "BuildModel",
          project: sageMakerBuild,
          input: sourceOutput,
          outputs: [sagemakerBuildOutput],
          runOrder: 1,
        }),
      ],
    },
    // build cdk stack
    {
      stageName: "BuildCdkStack",
      actions: [
        new aws_codepipeline_actions.CodeBuildAction({
          actionName: "BuildCdkStack",
          project: cdkBuildProject,
          input: sourceOutput,
          outputs: [cdkBuildOutput],
          runOrder: 2,
        }),
      ],
    },
    // deploy mxnet model stack
    {
      stageName: "DeployMxNetEndpoint",
      actions: [
        new aws_codepipeline_actions.CloudFormationCreateUpdateStackAction({
          actionName: "DeployMxNetEndpoint",
          stackName: "MxnetEndpoint",
          templatePath: cdkBuildOutput.atPath("MxNetEndpoint.template.json"),
          adminPermissions: true,
        }),
      ],
    },
  ],
});
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
- [tar.gz model complied](https://docs.aws.amazon.com/sagemaker/latest/dg/neo-compilation-preparing-model.html)
