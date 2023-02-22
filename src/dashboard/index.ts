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

        const provider = new AzureSpringAppsProvider(context);
        const options: RemoteBootAppDataProviderOptions = { iconPath: new vscode.ThemeIcon("azure") };

        // register commands
        vscode.commands.registerCommand("azureSpringApps.app.showLiveInformation", async (appNode: AppTreeItem) => {
            if (!dashboardExt.isActive) {
                await dashboardExt.activate();
            }

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
                if (appData) {
                    api.connectRemoteApp(appData);
                }
            }
        });

        // APIs only available after dashboard is activated.
        await waitUntilDashboardActivated(dashboardExt, 5000);
        const api = dashboardExt.exports;
        api.registerRemoteBootAppDataProvider("Azure", provider, options);

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
        if (appData) {
            this.store.set(appData.name, appData);
            this.onDidChangeDataEmitter.fire();
        }
    }

    public toRemoteBootAppData(appNode: AppTreeItem): RemoteBootAppData | undefined {
        const app = appNode.app;
        if (app.properties?.url) {
            const uri = vscode.Uri.parse(app.properties.url);
            const host = uri.authority;
            const jmxurl = uri.with({ path: "/actuator" }).toString();
            return {
                name: app.name,
                host,
                jmxurl,
                iconPath: this.iconPathForApps
            };
        } else {
            return undefined;
        }

    }
}


async function waitUntilDashboardActivated(dashboardExt: vscode.Extension<DashboardExtensionApi>, pollingIntervalMillis: number) {
    return new Promise<void>((resolve) => {
        const id = setInterval(() => {
            if (dashboardExt.isActive) {
                clearInterval(id);
                resolve();
            }
        }, pollingIntervalMillis);
    });
}
