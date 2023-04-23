// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureNameStep } from "@microsoft/vscode-azext-utils";
import { EnhancedApp } from "../../model/EnhancedApp";
import { EnhancedService } from "../../model/EnhancedService";
import { localize } from "../../utils";
import { IAppCreationWizardContext } from "./IAppCreationWizardContext";

export class InputAppNameStep extends AzureNameStep<IAppCreationWizardContext> {
    //refer: https://dev.azure.com/msazure/AzureDMSS/_git/AzureDMSS-PortalExtension?path=%2Fsrc%2FSpringCloudPortalExt%2FClient%2FCreateApplication%2FCreateApplicationBlade.ts&version=GBdev&line=463&lineEnd=463&lineStartColumn=25&lineEndColumn=55&lineStyle=plain&_a=contents
    private static readonly VALID_NAME_REGEX: RegExp = /^[a-z][a-z0-9-]{2,30}[a-z0-9]$/;
    private readonly service: EnhancedService;

    constructor(service: EnhancedService) {
        super();
        this.service = service;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.validateAppName = this.validateAppName.bind(this);
    }

    public async prompt(context: IAppCreationWizardContext): Promise<void> {
        const prompt: string = localize('appNamePrompt', 'Enter a globally unique name for the new Spring app.');
        context.newAppName = (await context.ui.showInputBox({ prompt, validateInput: this.validateAppName })).trim();
        return Promise.resolve(undefined);
    }

    public shouldPrompt(context: IAppCreationWizardContext): boolean {
        return !context.newAppName;
    }

    protected async isRelatedNameAvailable(_context: IAppCreationWizardContext, _name: string): Promise<boolean> {
        return false;
    }

    private async validateAppName(name: string): Promise<string | undefined> {
        name = name.trim();
        if (!name) {
            return localize('emptyName', 'The name is required.');
        }
        if (!InputAppNameStep.VALID_NAME_REGEX.test(name)) {
            return localize('invalidName', `
                    The name is invalid. It can contain only lowercase letters, numbers and hyphens.
                    The first character must be a letter.
                    The last character must be a letter or number.
                    The value must be between 4 and 32 characters long.
                `);
        } else {
            const apps: EnhancedApp[] = await this.service.getApps();
            if (!apps.every(app => app.name !== name)) {
                return localize('existAppName', "App with this name already exists.");
            }
        }
        return undefined;
    }
}
