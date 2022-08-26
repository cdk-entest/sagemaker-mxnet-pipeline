#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { MxnetEndpoint } from "../lib/endpoint-stack";
import { PipelineStack } from "../lib/pipeline-stack";
import config from "./../../config.json";

const app = new cdk.App();

// pipeline
new PipelineStack(app, "PipelineStack", {
  codeStarArn: config.CODE_STAR_ARN,
  sageMakerRole: config.ROLE,
});

// mxnet endpoint
new MxnetEndpoint(app, "MxNetEndpoint", {});
