#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { MxnetEndpoint } from "../lib/cdk-pipeline-stack";

const app = new cdk.App();

new MxnetEndpoint(app, "MxNetEndpoint", {
  env: {
    region: "us-east-1",
  },
});
