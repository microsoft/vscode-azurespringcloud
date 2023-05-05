// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DeploymentInstance } from "@azure/arm-appplatform";
import { IActionContext } from "@microsoft/vscode-azext-utils";
import { localize } from "vscode-nls";
import { getLogStreamId, ILogStream, logStreams, startStreamingLogs, stopStreamingLogs } from "../workflows/streamlog/streamingLog";
import { EnhancedDeployment } from "./EnhancedDeployment";

export class EnhancedInstance implements DeploymentInstance {

    public readonly name: string;
    public readonly status?: string;
    public readonly reason?: string;
    public readonly discoveryStatus?: string;
    public readonly startTime?: string;
    public readonly zone?: string;
    public readonly deployment: EnhancedDeployment;

    public constructor(deployment: EnhancedDeployment, resource: DeploymentInstance) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.name = resource.name!;
        this.status = resource.status;
        this.reason = resource.reason;
        this.discoveryStatus = resource.discoveryStatus;
        this.startTime = resource.startTime;
        this.zone = resource.zone;
        this.deployment = deployment;
    }

    get id(): string {
        return `${this.deployment.id}/instances/${this.name}`;
    }

    get properties(): {} {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { deployment: _, ...properties } = this;
        return properties;
    }

    get streamingLogConnected(): boolean {
        const logStreamId: string = getLogStreamId(this);
        const logStream: ILogStream | undefined = logStreams.get(logStreamId);
        return logStream?.isConnected ?? false;
    }

    public async startStreamingLogs(context: IActionContext): Promise<void> {
        if (this.status !== 'Running') {
            throw new Error(localize('instanceNotRunning', 'Selected instance is not running.'));
        }
        await startStreamingLogs(context, this);
    }

    public async stopStreamingLogs(): Promise<void> {
        await stopStreamingLogs(this);
    }
}
