// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { TestKeys } from "@azure/arm-appplatform";
import { BasicAuthenticationCredentials, WebResource } from "@azure/ms-rest-js";
import { IActionContext, parseError } from '@microsoft/vscode-azext-utils';
import * as request from 'request';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { EnhancedApp } from "../../model/EnhancedApp";
import { EnhancedInstance } from '../../model/EnhancedInstance';
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
        const logsRequest: request.Request = await getLogRequest(instance);
        const newLogStream: ILogStream = createLogStream(outputChannel, logsRequest);
        logsRequest.on('data', (chunk: Buffer | string) => {
            outputChannel.append(chunk.toString());
        }).on('error', (err: Error) => {
            newLogStream.isConnected = false;
            outputChannel.show();
            outputChannel.appendLine(localize('logStreamError', 'Error connecting to log-streaming service:'));
            outputChannel.appendLine(parseError(err).message);
        }).on('complete', () => {
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

function createLogStream(outputChannel: vscode.OutputChannel, logsRequest: request.Request): ILogStream {
    const newLogStream: ILogStream = {
        dispose: (): void => {
            logsRequest.removeAllListeners();
            logsRequest.destroy();
            outputChannel.show();
            outputChannel.appendLine(localize('logStreamDisconnected', 'Disconnected from log-streaming service.'));
            newLogStream.isConnected = false;
        },
        isConnected: true,
        outputChannel: outputChannel
    };
    return newLogStream;
}

async function getLogRequest(instance: EnhancedInstance): Promise<request.Request> {
    const app: EnhancedApp = instance.deployment.app;
    const httpRequest: WebResource = new WebResource();
    const testKeys: TestKeys = await app.getTestKeys();
    await signRequest(testKeys.primaryKey ?? '', httpRequest);
    const requestApi: request.RequestAPI<request.Request, request.CoreOptions, {}> = request.defaults(httpRequest);
    return requestApi(`${(testKeys.primaryTestEndpoint ?? '').replace('.test', '')}/api/logstream/apps/${app.name}/instances/${instance.name}?follow=true&tailLines=500`);
}

export function getLogStreamId(instance: EnhancedInstance): string {
    return `${instance.deployment.app.name}-${instance.name}`;
}

async function signRequest(primaryKey: string, httpRequest: WebResource): Promise<void> {
    const credential: BasicAuthenticationCredentials = new BasicAuthenticationCredentials(primaryName, primaryKey);
    await credential.signRequest(httpRequest);
}
