import { RuntimeVersion } from "@azure/arm-appplatform/esm/models";
import { Progress } from "vscode";
import { AzureWizardExecuteStep } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { EnhancedApp, EnhancedService } from "../../../model";
import { AppService } from "../../../service/AppService";
import { localize, nonNullProp } from "../../../utils";
import { IAppCreationWizardContext } from "./IAppCreationWizardContext";

export class CreateAppDeploymentStep extends AzureWizardExecuteStep<IAppCreationWizardContext> {

    // tslint:disable-next-line: no-unexternalized-strings
    public priority: number = 140;
    private readonly service: EnhancedService;

    constructor(service: EnhancedService) {
        super();
        this.service = service;
    }

    public async execute(context: IAppCreationWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {

        const message: string = localize('creatingNewAppDeployment', 'Creating default deployment...');
        ext.outputChannel.appendLog(message);
        progress.report({ message });

        const appRuntime: RuntimeVersion = nonNullProp(context, 'newAppRuntime');

        const app: EnhancedApp = this.service.enhanceApp(context.newApp!);
        context.newDeployment = await app.createDeployment(AppService.DEFAULT_DEPLOYMENT, appRuntime);
        await app.startDeployment(AppService.DEFAULT_DEPLOYMENT);
        return Promise.resolve(undefined);
    }

    public shouldExecute(_context: IAppCreationWizardContext): boolean {
        return true;
    }
}
