/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeploymentResource, TestKeys } from '@azure/arm-appplatform/esm/models';
import { BasicAuthenticationCredentials, WebResource } from "ms-rest";
import * as request from 'request';
import * as vscode from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext, parseError } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../utils';

export interface ILogStream extends vscode.Disposable {
  isConnected: boolean;
  outputChannel: vscode.OutputChannel;
}

const primaryName: string = 'primary';
const logStreams: Map<string, ILogStream> = new Map();

export async function startStreamingLogs(app: string, testKey: TestKeys, instance: DeploymentResource): Promise<ILogStream> {
  const logStreamId: string = getLogStreamId(app, instance);
  const logStream: ILogStream | undefined = logStreams.get(logStreamId);
  if (logStream && logStream.isConnected) {
    logStream.outputChannel.show();
    // tslint:disable-next-line:no-floating-promises
    ext.ui.showWarningMessage(localize('logStreamAlreadyActive', 'The log-streaming service for "{0}" is already active.', instance.name));
    return logStream;
  } else {
    const outputChannel: vscode.OutputChannel = logStream ? logStream.outputChannel : vscode.window.createOutputChannel(localize('logStreamLabel', '{0} - Log Stream', instance.name));
    ext.context.subscriptions.push(outputChannel);
    outputChannel.show();
    outputChannel.appendLine(localize('connectingToLogStream', 'Connecting to log stream...'));
    const httpRequest: WebResource = new WebResource();
    await signRequest(testKey.primaryKey ?? '', httpRequest);
    const requestApi: request.RequestAPI<request.Request, request.CoreOptions, {}> = request.defaults(httpRequest);
    return await new Promise((onLogStreamCreated: (ls: ILogStream) => void): void => {
      // Intentionally setting up a separate telemetry event and not awaiting the result here since log stream is a long-running action
      // tslint:disable-next-line:no-floating-promises
      callWithTelemetryAndErrorHandling('appService.streamingLogs', async (context: IActionContext) => {
        context.errorHandling.suppressDisplay = true;
        await new Promise((onLogStreamEnded: () => void, reject: (err: Error) => void): void => {
          let newLogStream: ILogStream;
          const logsRequest: request.Request = requestApi(`${(testKey.primaryTestEndpoint ?? '').replace('.test', '')}/api/logstream/apps/${app}/instances/${instance.name}?follow=true&tailLines=10`);
          newLogStream = {
            dispose: (): void => {
              logsRequest.removeAllListeners();
              logsRequest.destroy();
              outputChannel.show();
              outputChannel.appendLine(localize('logStreamDisconnected', 'Disconnected from log-streaming service.'));
              newLogStream.isConnected = false;
              onLogStreamEnded();
            },
            isConnected: true,
            outputChannel: outputChannel
          };
          logsRequest.on('data', (chunk: Buffer | string) => {
            outputChannel.append(chunk.toString());
          }).on('error', (err: Error) => {
            newLogStream.isConnected = false;
            outputChannel.show();
            outputChannel.appendLine(localize('logStreamError', 'Error connecting to log-streaming service:'));
            outputChannel.appendLine(parseError(err).message);
            reject(err);
          }).on('complete', () => {
            newLogStream.dispose();
          });
          logStreams.set(logStreamId, newLogStream);
          onLogStreamCreated(newLogStream);
        });
      });
    });
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

function getLogStreamId(app: string, instance: DeploymentResource): string {
  return `${app}-${instance.name}`;
}

async function signRequest(primaryKey: string, httpRequest: WebResource): Promise<void> {
  const credential: BasicAuthenticationCredentials = new BasicAuthenticationCredentials(primaryName, primaryKey);
  await new Promise((resolve, reject): void => {
    credential.signRequest(httpRequest, (err: Error | undefined) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
