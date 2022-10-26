// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { RemoteDebugging } from "@azure/arm-appplatform";
import { AzureWizardExecuteStep } from "@microsoft/vscode-azext-utils";
import { Progress } from "vscode";
import { ext } from "../../../extensionVariables";
import { localize } from "../../../utils";
import { EnhancedInstance } from "../../EnhancedInstance";
import { IRemoteDebuggingContext } from "./IRemoteDebuggingContext";

export class EnableRemoteDebuggingStep extends AzureWizardExecuteStep<IRemoteDebuggingContext> {
    public priority: number = 135;
    private readonly instance: EnhancedInstance;

    constructor(instance: EnhancedInstance) {
        super();
        this.instance = instance;
    }

    public async execute(context: IRemoteDebuggingContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const message: string = localize('enableRemoteDebugging', 'Enabling remote debugging for app "{0}"...', this.instance.deployment.app.name);
        progress.report({ message });
        ext.outputChannel.appendLog(message);
        let config: RemoteDebugging = await this.instance.deployment.enableDebugging();
        if (config.enabled === undefined || config.port === undefined) {
            config = await this.instance.deployment.getDebuggingConfig();
        }
        context.config = config;
        ext.outputChannel.appendLog(localize('enableRemoteDebuggingSuccess', 'Successfully enabled remote debugging for app "{0}".', this.instance.deployment.app.name));
    }

    public shouldExecute(context: IRemoteDebuggingContext): boolean {
        return !context.config.enabled;
    }
}
