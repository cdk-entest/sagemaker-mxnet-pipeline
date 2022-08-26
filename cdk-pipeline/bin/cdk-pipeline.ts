#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { MxnetEndpoint } from "../lib/endpoint-stack";
import { PipelineStack } from "../lib/pipeline-stack";

const app = new cdk.App();

// pipeline
new PipelineStack(app, "PipelineStack", {
  codeStarArn:
    "arn:aws:codestar-connections:us-east-1:305047569515:connection/475216ac-d91d-40c7-827d-c0da1c714f10",
  //
  sageMakerRole:
    "arn:aws:iam::305047569515:role/service-role/AmazonSageMaker-ExecutionRole-20220818T095999",
  // sagemaker bucket
  bucketName: "sagemaker-us-east-1-305047569515",
});

// mxnet endpoint
new MxnetEndpoint(app, "MxNetEndpoint", {});
