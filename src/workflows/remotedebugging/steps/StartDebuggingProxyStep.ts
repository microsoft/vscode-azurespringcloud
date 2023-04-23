// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureWizardExecuteStep, findFreePort } from "@microsoft/vscode-azext-utils";
import { Progress, window } from "vscode";
import { ext } from "../../../extensionVariables";
import { EnhancedInstance } from "../../../model/EnhancedInstance";
import { localize } from "../../../utils";
import { DebugProxy } from "../DebugProxy";
import { IRemoteDebuggingContext } from "./IRemoteDebuggingContext";

export class StartDebuggingProxyStep extends AzureWizardExecuteStep<IRemoteDebuggingContext> {
    public priority: number = 140;
    private readonly instance: EnhancedInstance;

    constructor(instance: EnhancedInstance) {
        super();
        this.instance = instance;
    }

    public async execute(context: IRemoteDebuggingContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const proxyPort: number = await findFreePort();
        const message: string = localize('startDebuggingProxy', 'Starting debugging proxy at port "{0}"...', proxyPort);
        ext.outputChannel.appendLog(message);
        progress.report({ message });

        const proxy: DebugProxy = new DebugProxy(this.instance, proxyPort);
        proxy.on('error', (err: Error) => {
            proxy.dispose();
            void window.showErrorMessage(err.message);
        });
        await new Promise((resolve, _reject) => {
            proxy.on('start', resolve);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            proxy.start(context.config.port!);
        });
        context.proxy = proxy;
        ext.outputChannel.appendLog(localize('startDebuggingProxySuccess', 'Successfully started debugging proxy at port "{0}".', proxyPort));
    }

    public shouldExecute(_context: IRemoteDebuggingContext): boolean {
        return true;
    }
}
