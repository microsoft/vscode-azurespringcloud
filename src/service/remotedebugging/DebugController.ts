/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RemoteDebugging } from "@azure/arm-appplatform";
import { DialogResponses, findFreePort, IActionContext, openUrl } from "@microsoft/vscode-azext-utils";
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from "../../utils";
import { EnhancedInstance } from "../EnhancedInstance";
import { DebugProxy } from "./DebugProxy";

// tslint:disable-next-line:no-unnecessary-class
export class DebugController {
    public static async attachDebugger(context: IActionContext, instance: EnhancedInstance): Promise<void> {
        const proxyPort: number = await findFreePort();
        const proxy: DebugProxy = new DebugProxy(instance, proxyPort);
        proxy.on('error', (err: Error) => {
            proxy.dispose();
            throw err;
        });

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Window }, async (p: vscode.Progress<{}>) => {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/no-explicit-any, no-async-promise-executor
            return new Promise(async (resolve: (value: unknown) => void, reject: (e: unknown) => void): Promise<void> => {
                try {
                    let config: RemoteDebugging = await instance.deployment.getDebuggingConfig();
                    if (!config?.enabled) {
                        const confirmMsg: string = localize('confirmRemoteDebug', 'The configurations of the selected app will be changed before debugging. Would you like to continue?');
                        const result: vscode.MessageItem = await context.ui.showWarningMessage(confirmMsg, { modal: true }, DialogResponses.yes, DialogResponses.learnMore);
                        if (result === DialogResponses.learnMore) {
                            await openUrl('https://aka.ms/asa-remotedebug');
                            return;
                        } else {
                            p.report({ message: 'enabling remote debugging...' });
                            ext.outputChannel.appendLog('enabling remote debugging...');
                            config = await instance.deployment.enableDebugging();
                            if (!config.enabled || !config.port) {
                                config = await instance.deployment.getDebuggingConfig();
                            }
                            ext.outputChannel.appendLog('enabled remote debugging...');
                        }
                    }
                    p.report({ message: 'starting debug proxy...' });
                    ext.outputChannel.appendLog('starting debug proxy...');
                    proxy.on('start', resolve);
                    void proxy.start(config.port!);
                } catch (error) {
                    reject(error);
                }
            });
        });

        const instanceName: string = instance.name!;
        const configurationName: string = `Attach "${instanceName}"`;
        await vscode.debug.startDebugging(undefined, {
            type: 'java',
            name: configurationName,
            projectName: instance.deployment.app.name,
            request: 'attach',
            hostName: 'localhost',
            port: proxyPort
        });

        const terminateDebugListener: vscode.Disposable = vscode.debug.onDidTerminateDebugSession((event: vscode.DebugSession) => {
            if (event.name === configurationName) {
                if (proxy !== undefined) {
                    proxy.dispose();
                }
                terminateDebugListener.dispose();
            }
        });
    }
}
