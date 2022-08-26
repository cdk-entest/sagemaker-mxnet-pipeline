#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { MxnetEndpoint } from "../lib/endpoint-stack";
import { PipelineStack } from "../lib/pipeline-stack";

const app = new cdk.App();

// pipeline
new PipelineStack(app, "PipelineStack", {
  codeStarArn: `arn:aws:codestar-connections:${process.env.CDK_DEFAULT_REGION}:${process.env.CDK_DEFAULT_ACCOUNT}:connection/475216ac-d91d-40c7-827d-c0da1c714f10`,
  //
  sageMakerRole: `arn:aws:iam::${process.env.CDK_DEFAULT_REGION}:role/service-role/AmazonSageMaker-ExecutionRole-20220818T095999`,
  // sagemaker bucket
  bucketName: `sagemaker-${process.env.CDK_DEFAULT_REGION}-${process.env.CDK_DEFAULT_ACCOUNT}`,
});

// mxnet endpoint
new MxnetEndpoint(app, "MxNetEndpoint", {});
