#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Cdk1Stack } from '../lib/cdk_1-stack';

const app = new cdk.App();
new Cdk1Stack(app, 'Cdk1Stack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
