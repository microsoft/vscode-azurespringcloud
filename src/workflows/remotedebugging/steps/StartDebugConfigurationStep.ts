// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureWizardExecuteStep } from "@microsoft/vscode-azext-utils";
import { debug, DebugSession, Disposable, Progress } from "vscode";
import { ext } from "../../../extensionVariables";
import { EnhancedInstance } from "../../../model/EnhancedInstance";
import { localize } from "../../../utils";
import { IRemoteDebuggingContext } from "./IRemoteDebuggingContext";

export class StartDebugConfigurationStep extends AzureWizardExecuteStep<IRemoteDebuggingContext> {
    public priority: number = 145;
    private readonly instance: EnhancedInstance;

    constructor(instance: EnhancedInstance) {
        super();
        this.instance = instance;
    }

    public async execute(context: IRemoteDebuggingContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const message: string = localize('startDebugger', 'Attaching debugger to instance "{0}"...', this.instance.name);
        ext.outputChannel.appendLog(message);
        progress.report({ message });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const instanceName: string = this.instance.name!;
        const configurationName: string = `Attach "${instanceName}"`;
        const started: boolean = await debug.startDebugging(undefined, {
            type: 'java',
            name: configurationName,
            projectName: this.instance.deployment.app.name,
            request: 'attach',
            hostName: 'localhost',
            port: context.proxy?.port
        });
        if (started) {
            context.configurationName = configurationName;
            ext.outputChannel.appendLog(localize('startDebuggerSuccess', 'Successfully attached debugger to instance "{0}".', this.instance.name));
        } else {
            throw new Error(`Failed to attach debugger to instance "${this.instance.name}".`);
        }
        this.disposeProxyAtTermination(context);
    }

    public shouldExecute(_context: IRemoteDebuggingContext): boolean {
        return true;
    }

    private disposeProxyAtTermination(context: IRemoteDebuggingContext): void {
        const listener: Disposable = debug.onDidTerminateDebugSession((event: DebugSession) => {
            if (event.name === context.configurationName) {
                if (context.proxy !== undefined) {
                    context.proxy.dispose();
                }
                listener.dispose();
            }
        });
    }
}
