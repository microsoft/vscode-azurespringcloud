import { Progress } from "vscode";
import { AzureWizardExecuteStep } from "vscode-azureextensionui";
import { EnhancedApp, EnhancedService } from "../../../model";
import { AppService } from "../../../service/AppService";
import { localize } from "../../../utils";
import { IAppCreationWizardContext } from "./IAppCreationWizardContext";

export class UpdateAppStep extends AzureWizardExecuteStep<IAppCreationWizardContext> {

    // tslint:disable-next-line: no-unexternalized-strings
    public priority: number = 145;
    private readonly service: EnhancedService;

    constructor(service: EnhancedService) {
        super();
        this.service = service;
    }

    public async execute(context: IAppCreationWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const message: string = localize('updatingNewApp', 'Activating deployment of "{0}"...', context.newApp?.name);
        progress.report({ message });

        const app: EnhancedApp = this.service.enhanceApp(context.newApp!);
        await app.setActiveDeployment(context.newDeployment?.name ?? AppService.DEFAULT_DEPLOYMENT);
        return Promise.resolve(undefined);
    }

    public shouldExecute(_context: IAppCreationWizardContext): boolean {
        return true;
    }
}
