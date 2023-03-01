/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Copied from https://github.com/microsoft/vscode-spring-boot-dashboard/blob/679ceed8dc7a1f45d770b8db045b6e0d0680c272/src/extension.api.d.ts
 */

import { Event, ThemeIcon, Uri } from "vscode";

export interface DashboardExtensionApi {
    registerRemoteBootAppDataProvider(providerName: string, provider: RemoteBootAppDataProvider, options?: RemoteBootAppDataProviderOptions);
    connectRemoteApp: (appData: RemoteBootAppData) => void;
    disconnectRemoteApp: (appData: RemoteBootAppData) => void;
}

/**
 * Reference: https://github.com/spring-projects/sts4/blob/392d953bd94543a2f132d51d217a0a0812eec896/headless-services/spring-boot-language-server/src/main/java/org/springframework/ide/vscode/boot/java/livehover/v2/SpringProcessConnectorRemote.java#L32
 */
export interface RemoteBootAppData {
    name: string;
    group?: string;
    description?: string;

    /**
     * Icon for apps. See vscode.TreeItem.iconPath
     */
    iconPath?: string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon;

    // required data for live conncetion
    host: string;
    jmxurl: string;

}

export interface RemoteBootAppDataProviderOptions {
    /**
     * Icon for root node of the provider. See vscode.TreeItem.iconPath
     */
    iconPath?: string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon;

}

export interface RemoteBootAppDataProvider {
    onDidChangeData?: Event<void>;
    provide(): Thenable<RemoteBootAppData[]> | RemoteBootAppData[];
}
