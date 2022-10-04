// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DeploymentInstance } from "@azure/arm-appplatform";
import { EnhancedDeployment } from "./EnhancedDeployment";

export class EnhancedInstance implements DeploymentInstance {

    public readonly name?: string;
    public readonly status?: string;
    public readonly reason?: string;
    public readonly discoveryStatus?: string;
    public readonly startTime?: string;
    public readonly zone?: string;
    public readonly deployment: EnhancedDeployment;

    public constructor(deployment: EnhancedDeployment, resource: DeploymentInstance) {
        this.name = resource.name!;
        this.status = resource.status;
        this.reason = resource.reason;
        this.discoveryStatus = resource.discoveryStatus;
        this.startTime = resource.startTime;
        this.zone = resource.zone;
        this.deployment = deployment;
    }
}
