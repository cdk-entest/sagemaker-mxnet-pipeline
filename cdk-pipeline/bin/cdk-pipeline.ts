#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { MxnetEndpoint } from "../lib/endpoint-stack";
import { PipelineStack } from "../lib/pipeline-stack";

const app = new cdk.App();

// below should be better
const codeStarArn = ``;
// role passed to model
const sagemakerRole = ``;
// sagemaker bucker
const bucketName = ``;
// pipeline
new PipelineStack(app, "PipelineStack", {
  codeStarArn: codeStarArn,
  sageMakerRole: sagemakerRole,
  bucketName: bucketName,
});
// mxnet endpoint
new MxnetEndpoint(app, "MxNetEndpoint", {});
