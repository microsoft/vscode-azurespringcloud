/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DialogResponses, findFreePort, IActionContext, openUrl } from "@microsoft/vscode-azext-utils";
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from "../../utils";
import { EnhancedInstance } from "../EnhancedInstance";
import { DebugProxy } from "./DebugProxy";

// tslint:disable-next-line:no-unnecessary-class
export class DebugController {
    public static async attachDebugger(context: IActionContext, instance: EnhancedInstance): Promise<void> {
        const portNumber: number = await findFreePort();
        const proxy: DebugProxy = new DebugProxy(instance, portNumber);
        proxy.on('error', (err: Error) => {
            proxy.dispose();
            throw err;
        });

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Window }, async (p: vscode.Progress<{}>) => {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/no-explicit-any, no-async-promise-executor
            return new Promise(async (resolve: (value: unknown) => void, reject: (e: unknown) => void): Promise<void> => {
                try {
                    const confirmMsg: string = localize('confirmRemoteDebug', 'The configurations of the selected app will be changed before debugging. Would you like to continue?');
                    const result: vscode.MessageItem = await context.ui.showWarningMessage(confirmMsg, { modal: true }, DialogResponses.yes, DialogResponses.learnMore);
                    if (result === DialogResponses.learnMore) {
                        await openUrl('https://aka.ms/azfunc-remotedebug');
                        return;
                    } else {
                        // await instance.deployment.enableDebugging(portNumber)
                    }

                    p.report({ message: 'starting debug proxy...' });
                    ext.outputChannel.appendLog('starting debug proxy...');
                    proxy.on('start', resolve);
                    await proxy.start();
                } catch (error) {
                    reject(error);
                }
            });
        });

        const sessionId: string = instance.name ?? Date.now().toString();

        await vscode.debug.startDebugging(undefined, {
            name: sessionId,
            type: 'java',
            request: 'attach',
            hostName: 'localhost',
            port: portNumber
        });

        const terminateDebugListener: vscode.Disposable = vscode.debug.onDidTerminateDebugSession((event: vscode.DebugSession) => {
            if (event.name === sessionId) {
                if (proxy !== undefined) {
                    proxy.dispose();
                }
                terminateDebugListener.dispose();
            }
        });
    }
}
