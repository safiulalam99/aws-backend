import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
export class Cdk1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC 
    const vpc = new ec2.Vpc(this, 'BackendVpc', {
      maxAzs: 2
    });

    // RDS 
    const dbSecret = new secretsmanager.Secret(this, 'DBSecret', {
      secretName: 'backend-rds-credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
      },
    });

    const dbInstance = new rds.DatabaseInstance(this, 'BackendRDS', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_14_13 }),
      vpc,
      credentials: rds.Credentials.fromSecret(dbSecret),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
      deletionProtection: false,
      databaseName: 'logdb',
    });

    // ECS cluster
    const cluster = new ecs.Cluster(this, 'BackendCluster', { vpc });

    // Fargate task definition with the container
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'BackendTask', {
      cpu: 256,
      memoryLimitMiB: 512,
    });

    const container = taskDefinition.addContainer('BackendContainer', {
      image: ecs.ContainerImage.fromRegistry('287149949465.dkr.ecr.us-east-1.amazonaws.com/backend:latest'),
      logging: new ecs.AwsLogDriver({ streamPrefix: 'Backend' }),
      environment: {
        PORT: '3000',
        DB_HOST: dbInstance.dbInstanceEndpointAddress,
        DB_PORT: '5432',
        DB_NAME: 'logdb',
        DB_USER: 'postgres',
      },
      secrets: {
        DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
      },
    });
    container.addPortMappings({
      containerPort: 3000,
    });
    const executionRole = taskDefinition.obtainExecutionRole();
    executionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
    );
    
    // Fargate service 
    const fargateService = new ecs.FargateService(this, 'BackendService', {
      cluster,
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    // Allow HTTP port 3000
    fargateService.connections.allowFromAnyIpv4(ec2.Port.tcp(3000));

    // ECS tasks  port 5432
    dbInstance.connections.allowFrom(fargateService, ec2.Port.tcp(5432));
  }
}
