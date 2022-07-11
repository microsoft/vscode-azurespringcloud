// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { DeploymentResource, TestKeys } from '@azure/arm-appplatform';
import { BasicAuthenticationCredentials, WebResource } from "@azure/ms-rest-js";
import { parseError } from '@microsoft/vscode-azext-utils';
import * as request from 'request';
import * as vscode from 'vscode';
import { IActionContext } from '../../../extension.bundle';
import { ext } from '../../extensionVariables';
import { localize } from '../../utils';

export interface ILogStream extends vscode.Disposable {
    isConnected: boolean;
    outputChannel: vscode.OutputChannel;
}

const primaryName: string = 'primary';
const logStreams: Map<string, ILogStream> = new Map();

export async function startStreamingLogs(context: IActionContext, app: string, testKey: TestKeys, instance: DeploymentResource): Promise<ILogStream> {
    const logStreamId: string = getLogStreamId(app, instance);
    const logStream: ILogStream | undefined = logStreams.get(logStreamId);
    if (logStream && logStream.isConnected) {
        logStream.outputChannel.show();
        // tslint:disable-next-line:no-floating-promises
        context.ui.showWarningMessage(localize('logStreamAlreadyActive', 'The log-streaming service for "{0}" is already active.', instance.name));
        return logStream;
    } else {
        const outputChannel: vscode.OutputChannel = logStream ? logStream.outputChannel : vscode.window.createOutputChannel(localize('logStreamLabel', '{0} - Log Stream', instance.name));
        ext.context.subscriptions.push(outputChannel);
        outputChannel.show();
        outputChannel.appendLine(localize('connectingToLogStream', 'Connecting to log-streaming service...'));
        const logsRequest: request.Request = await getLogRequest(testKey, app, instance.name ?? '');
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

export async function stopStreamingLogs(app: string, instance: DeploymentResource): Promise<void> {
    const logStreamId: string = getLogStreamId(app, instance);
    const logStream: ILogStream | undefined = logStreams.get(logStreamId);
    if (logStream && logStream.isConnected) {
        logStream.dispose();
    } else {
        await vscode.window.showWarningMessage(localize('alreadyDisconnected', 'The log-streaming service is already disconnected.'));
    }
}

function createLogStream(outputChannel: vscode.OutputChannel, logsRequest: request.Request): ILogStream {
    let newLogStream: ILogStream;
    newLogStream = {
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

async function getLogRequest(testKey: TestKeys, app: string, instance: string): Promise<request.Request> {
    const httpRequest: WebResource = new WebResource();
    await signRequest(testKey.primaryKey ?? '', httpRequest);
    const requestApi: request.RequestAPI<request.Request, request.CoreOptions, {}> = request.defaults(httpRequest);
    return requestApi(`${(testKey.primaryTestEndpoint ?? '').replace('.test', '')}/api/logstream/apps/${app}/instances/${instance}?follow=true&tailLines=10`);
}

function getLogStreamId(app: string, instance: DeploymentResource): string {
    return `${app}-${instance.name}`;
}

async function signRequest(primaryKey: string, httpRequest: WebResource): Promise<void> {
    const credential: BasicAuthenticationCredentials = new BasicAuthenticationCredentials(primaryName, primaryKey);
    await credential.signRequest(httpRequest);
}
