import {
  aws_codebuild,
  aws_codepipeline,
  aws_codepipeline_actions,
  aws_iam,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Effect } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface PipelineProps extends StackProps {
  codeStarArn: string;
  sageMakerRole: string;
  bucketName: string;
}

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineProps) {
    super(scope, id, props);

    // artifact
    const sourceOutput = new aws_codepipeline.Artifact("SourceOutput");
    const sagemakerBuildOutput = new aws_codepipeline.Artifact(
      "SageMakerBuildOutput"
    );
    const cdkBuildOutput = new aws_codepipeline.Artifact("CdkBuildOutput");

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

    // codebuild upload training code to s3 for sagemaker
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

    // codebuild write model name to ssm parameter
    sageMakerBuild.addToRolePolicy(
      new aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        resources: ["*"],
        actions: ["ssm:*"],
      })
    );

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
              commands: ["cdk cdk-pipeline", "npm install"],
            },
            build: {
              commands: ["npm run build", "npm run cdk synth -- -o dist"],
            },
          },
          artifacts: {
            "base-directory": "cdk-pipeline/dist",
            files: ["*.template.json"],
          },
        }),
      }
    );

    // get system parameter store
    cdkBuildProject.addToRolePolicy(
      new aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        resources: ["*"],
        actions: ["ssm:*"],
      })
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
              templatePath: cdkBuildOutput.atPath(
                "MxnetEndpoint.template.json"
              ),
              adminPermissions: true,
            }),
          ],
        },
      ],
    });
  }
}
