/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Progress } from "vscode";
import { AzureWizardExecuteStep } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { EnhancedApp } from "../../../model";
import { localize } from "../../../utils";
import { IAppDeploymentWizardContext } from "./IAppDeploymentWizardContext";

export class UploadArtifactStep extends AzureWizardExecuteStep<IAppDeploymentWizardContext> {
    public priority: number = 135;
    private readonly app: EnhancedApp;
    private readonly artifactPath: string;

    constructor(app: EnhancedApp, artifactPath: string) {
        super();
        this.app = app;
        this.artifactPath = artifactPath;
    }

    public async execute(context: IAppDeploymentWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const message: string = localize('uploadingArtifact', 'Uploading artifact "{0}" to Azure...', this.artifactPath);
        ext.outputChannel.appendLog(message);
        progress.report({ message });
        context.uploadDefinition = await this.app.uploadArtifact(this.artifactPath);
        return Promise.resolve(undefined);
    }

    public shouldExecute(_context: IAppDeploymentWizardContext): boolean {
        return true;
    }
}
