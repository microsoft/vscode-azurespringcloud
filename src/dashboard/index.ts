import * as vscode from "vscode";
import { AppTreeItem } from "../tree/AppTreeItem";
import { DashboardExtensionApi, RemoteBootAppData, RemoteBootAppDataProvider, RemoteBootAppDataProviderOptions } from "./api";

let inited: boolean = false;

export async function init(context: vscode.ExtensionContext) {
    if (inited) {
        return;
    }

    const dashboardExt = vscode.extensions.getExtension<DashboardExtensionApi>("vscjava.vscode-spring-boot-dashboard");
    if (dashboardExt) {
        await vscode.commands.executeCommand("setContext", "spring.dashboard:enabled", true);

        const api = await dashboardExt.activate(); // TODO: passively get API instead of forcing to activate it?
        const provider = new AzureSpringAppsProvider(context);
        const options: RemoteBootAppDataProviderOptions = { iconPath: new vscode.ThemeIcon("azure") };
        api.registerRemoteBootAppDataProvider("Azure", provider, options);

        vscode.commands.registerCommand("azureSpringApps.app.showLiveInformation", async (appNode: AppTreeItem) => {
            const app = appNode.app;
            let endpoint: string | undefined = await app.getPublicEndpoint();
            if (!endpoint || endpoint.toLowerCase() === 'none') {
                const choice = await vscode.window.showWarningMessage(`App "${app.name}" is not publicly accessible. Do you want to assign it a public endpoint?`, { modal: true }, "YES");
                if (!choice) {
                    return;
                }
                await vscode.commands.executeCommand("azureSpringApps.app.assignEndpoint", appNode);
                endpoint = await app.getPublicEndpoint();
            }
            if (endpoint) {
                provider.addAppData(appNode);
                vscode.commands.executeCommand("spring.apps.focus");
                // connect right now
                const appData = provider.toRemoteBootAppData(appNode);
                api.connectRemoteApp(appData);
            }
        });

        inited = true;
    } else {
        // TODO: ask user consent to install dashboard extension?
    }
}

class AzureSpringAppsProvider implements RemoteBootAppDataProvider {

    store: Map<string, RemoteBootAppData>;

    iconPathForApps: { light: string | vscode.Uri; dark: string | vscode.Uri };
    onDidChangeDataEmitter: vscode.EventEmitter<void>;

    onDidChangeData: vscode.Event<void>;
    constructor(context: vscode.ExtensionContext) {
        this.store = new Map();
        this.iconPathForApps = {
            dark: vscode.Uri.joinPath(context.extensionUri, "resources", "dark", "app.svg"),
            light: vscode.Uri.joinPath(context.extensionUri, "resources", "light", "app.svg"),
        };
        this.onDidChangeDataEmitter = new vscode.EventEmitter<void>();
        this.onDidChangeData = this.onDidChangeDataEmitter.event;
    }

    provide(): RemoteBootAppData[] | Thenable<RemoteBootAppData[]> {
        return Array.from(this.store.values());
    }

    public addAppData(appNode: AppTreeItem) {
        const appData = this.toRemoteBootAppData(appNode);
        this.store.set(appData.name, appData);
        this.onDidChangeDataEmitter.fire();
    }

    public toRemoteBootAppData(appNode: AppTreeItem): RemoteBootAppData {
        const app = appNode.app;

        return {
            name: app.name,
            host: app.service.properties?.fqdn ?? app.service.name,
            jmxurl: app.properties?.url + "/actuator",
            iconPath: this.iconPathForApps
        };
    }
}
