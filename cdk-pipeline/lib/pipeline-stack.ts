import {
  aws_codebuild,
  aws_codepipeline,
  aws_codepipeline_actions,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";

interface PipelineProps extends StackProps {
  codeStarArn: string;
  sageMakerRole: string;
}

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineProps) {
    super(scope, id, props);

    // artifact
    const sourceOutput = new aws_codepipeline.Artifact("SourceOutput");
    const sagemakerBuildOutput = new aws_codepipeline.Artifact(
      "SageMakerBuildOutput"
    );

    // codebuild build sagemaker model
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
          },
        },
        buildSpec: aws_codebuild.BuildSpec.fromObject({
          version: "0.2",
          phases: {
            install: {
              comands: ["pip install -r requirements.txt"],
            },
            build: {
              commands: ["cd sagemaker", "python run.py"],
            },
          },
        }),
      }
    );

    // code piepline
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
        // codebuild to build model using sagemaker
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

        // deploy endpoint
      ],
    });
  }
}
