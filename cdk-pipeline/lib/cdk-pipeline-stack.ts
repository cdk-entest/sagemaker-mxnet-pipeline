import * as cdk from "aws-cdk-lib";
import { Effect } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import config from "./../../config.json";

export class MxnetEndpoint extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // execution role
    const role = new cdk.aws_iam.Role(this, "ExecutionRoleMxNetModel", {
      roleName: "ExecutionRoleMxNetModel",
      assumedBy: new cdk.aws_iam.ServicePrincipal("sagemaker.amazonaws.com"),
    });

    role.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        resources: ["*"],
        actions: ["sagemaker:*"],
      })
    );

    // create a model
    const model = new cdk.aws_sagemaker.CfnModel(this, "MxNetModelDemo", {
      modelName: "MxNetModelDemo",
      executionRoleArn: role.roleArn,
      primaryContainer: {
        modelDataUrl: config.MODEL_PATH,
        image: config.ECR_IMG_URL,
        mode: "SingleModel",
        environment: {
          SAGEMAKER_CONTAINER_LOG_LEVEL: "20",
          SAGEMAKER_PROGRAM: "mnist.py",
          SAGEMAKER_REGION: "us-east-1",
          SAGEMAKER_SUBMIT_DIRECTORY: "/opt/ml/model/code",
        },
      },
    });

    // endpoint config
    const endpointConfig = new cdk.aws_sagemaker.CfnEndpointConfig(
      this,
      "MxNetModelEndpointConfig",
      {
        endpointConfigName: "MxnetModelEndpointConfig",
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

    // deploy a sagemaker endpoint
    new cdk.aws_sagemaker.CfnEndpoint(this, "MxNetModelEndpointDemo", {
      endpointName: "MxNetModelEndpointDemo",
      endpointConfigName: endpointConfig.attrEndpointConfigName,
    });
  }
}
