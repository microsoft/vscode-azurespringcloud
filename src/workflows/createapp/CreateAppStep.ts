// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureWizardExecuteStep } from "@microsoft/vscode-azext-utils";
import { Progress } from "vscode";
import { EnhancedService } from "../../model/EnhancedService";
import { localize, nonNullProp } from "../../utils";
import { IAppCreationWizardContext } from "./IAppCreationWizardContext";

export class CreateAppStep extends AzureWizardExecuteStep<IAppCreationWizardContext> {
    public priority: number = 135;
    private readonly service: EnhancedService;

    constructor(service: EnhancedService) {
        super();
        this.service = service;
    }

    public async execute(context: IAppCreationWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const message: string = localize('creatingNewApp', 'Creating and provisioning new app "{0}"...', context.newAppName);
        progress.report({ message });
        const appName: string = nonNullProp(context, 'newAppName');
        context.newApp = await this.service.createApp(appName);
        return Promise.resolve(undefined);
    }

    public shouldExecute(_context: IAppCreationWizardContext): boolean {
        return true;
    }
}
