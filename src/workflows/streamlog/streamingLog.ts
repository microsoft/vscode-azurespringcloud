// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { TestKeys } from "@azure/arm-appplatform";
import { IActionContext, createSubscriptionContext, parseError } from '@microsoft/vscode-azext-utils';
import { AzureSubscription } from "@microsoft/vscode-azureresources-api";
import axios, { AxiosResponse } from 'axios';
import { IncomingMessage } from "http";
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { EnhancedApp } from "../../model/EnhancedApp";
import { EnhancedInstance } from '../../model/EnhancedInstance';
import { EnhancedService } from "../../model/EnhancedService";
import { localize } from '../../utils';

export interface ILogStream extends vscode.Disposable {
    isConnected: boolean;
    outputChannel: vscode.OutputChannel;
}

const primaryName: string = 'primary';
export const logStreams: Map<string, ILogStream> = new Map();

export async function startStreamingLogs(context: IActionContext, instance: EnhancedInstance): Promise<ILogStream> {
    const logStreamId: string = getLogStreamId(instance);
    const logStream: ILogStream | undefined = logStreams.get(logStreamId);
    if (logStream && logStream.isConnected) {
        logStream.outputChannel.show();
        void context.ui.showWarningMessage(localize('logStreamAlreadyActive', 'The log-streaming service for "{0}" is already active.', instance.name));
        return logStream;
    } else {
        const outputChannel: vscode.OutputChannel = logStream ? logStream.outputChannel : vscode.window.createOutputChannel(localize('logStreamLabel', '{0} - Log Stream', instance.name));
        ext.context.subscriptions.push(outputChannel);
        outputChannel.show();
        outputChannel.appendLine(localize('connectingToLogStream', 'Connecting to log-streaming service...'));
        const response: IncomingMessage = await getLogRequest(instance);
        const newLogStream: ILogStream = createLogStream(outputChannel, response);
        response.on('data', (chunk: Buffer | string) => {
            outputChannel.append(chunk.toString());
        }).on('error', (err: Error) => {
            newLogStream.isConnected = false;
            outputChannel.show();
            outputChannel.appendLine(localize('logStreamError', 'Error connecting to log-streaming service:'));
            outputChannel.appendLine(parseError(err).message);
        }).on('close', () => {
            newLogStream.dispose();
        }).on('end', () => {
            newLogStream.dispose();
        });
        logStreams.set(logStreamId, newLogStream);
        return Promise.resolve(newLogStream);
    }
}

export async function stopStreamingLogs(instance: EnhancedInstance): Promise<void> {
    const logStreamId: string = getLogStreamId(instance);
    const logStream: ILogStream | undefined = logStreams.get(logStreamId);
    if (logStream && logStream.isConnected) {
        logStream.dispose();
    } else {
        await vscode.window.showWarningMessage(localize('alreadyDisconnected', 'The log streaming service is not connected.'));
    }
}

function createLogStream(outputChannel: vscode.OutputChannel, response: IncomingMessage): ILogStream {
    const newLogStream: ILogStream = {
        dispose: (): void => {
            response.removeAllListeners();
            response.destroy()
            outputChannel.show();
            outputChannel.appendLine(localize('logStreamDisconnected', 'Disconnected from log-streaming service.'));
            newLogStream.isConnected = false;
        },
        isConnected: true,
        outputChannel: outputChannel
    };
    return newLogStream;
}

async function getLogRequest(instance: EnhancedInstance): Promise<IncomingMessage> {
    const app: EnhancedApp = instance.deployment.app;
    const service: EnhancedService = app.service;
    if (await app.service.isConsumptionTier()) {
        const subscription: AzureSubscription = service.subscription;
        const subContext = createSubscriptionContext(subscription);
        const token: { token: string } = <{ token: string }>await subContext.credentials.getToken();
        // refer to https://github.com/Azure/azure-cli-extensions/blob/main/src/spring/azext_spring/custom.py#L511
        const url = `https://${(await service.properties)?.fqdn}/proxy/logstream${instance.id}?follow=true&tailLines=300&tenantId=${subscription.tenantId}`;
        const response: AxiosResponse<IncomingMessage> = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token.token}`
            },
            responseType: 'stream'
        });
        return response.data;
    } else {
        const testKeys: TestKeys = await app.getTestKeys();
        const credentials = `${primaryName}:${testKeys.primaryKey ?? ''}`;
        const encodedCredentials = Buffer.from(credentials).toString("base64");
        const url = `${(testKeys.primaryTestEndpoint ?? '').replace('.test', '')}/api/logstream/apps/${app.name}/instances/${instance.name}?follow=true&tailLines=300`;
        const response: AxiosResponse<IncomingMessage> = await axios.get(url, {
            headers: {
                Authorization: `Basic ${encodedCredentials}`
            },
            responseType: 'stream'
        });
        return response.data;
    }
}

export function getLogStreamId(instance: EnhancedInstance): string {
    return `${instance.deployment.app.name}-${instance.name}`;
}
