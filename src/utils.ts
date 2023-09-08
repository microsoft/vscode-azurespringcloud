// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// tslint:disable-next-line:no-require-imports no-implicit-dependencies
import { OpenInPortalOptions } from "@microsoft/vscode-azext-azureutils";
import { IGenericTreeItemOptions, TreeItemIconPath } from "@microsoft/vscode-azext-utils";
import { AppResourceFilter } from "@microsoft/vscode-azext-utils/hostapi";
import { AzureSubscription } from "@microsoft/vscode-azureresources-api";
import * as fs from "fs";
import * as path from 'path';
import * as vscode from 'vscode';
import { ExtensionContext, ProgressLocation, window } from 'vscode';
import * as nls from 'vscode-nls';
import { ext } from "./extensionVariables";
import { ResourceItemBase } from './tree/SpringAppsBranchDataProvider';

let EXTENSION_PUBLISHER: string;
let EXTENSION_NAME: string;
let EXTENSION_VERSION: string;
let EXTENSION_AI_KEY: string;

export const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export const springAppsFilter: AppResourceFilter = {
    type: 'microsoft.appplatform/spring'
};

export function wait(delay: number): Promise<void> {
    return new Promise(res => setTimeout(res, delay));
}

export interface GenericItemOptions extends IGenericTreeItemOptions {
    commandArgs?: unknown[];
}

export function createGenericItem(options: GenericItemOptions): ResourceItemBase {
    let commandArgs = options.commandArgs;
    const item = {
        id: options.id,
        getTreeItem(): vscode.TreeItem {
            return {
                ...options,
                command: options.commandId ? {
                    title: '',
                    command: options.commandId,
                    arguments: commandArgs,
                } : undefined,
            }
        },
        refresh(): Promise<void> { return Promise.resolve(undefined); }
    };

    commandArgs ??= [item];

    return item;
}

export async function runInBackground(doing: string, done: string | null, task: () => Promise<void>): Promise<void> {
    await window.withProgress({ location: ProgressLocation.Notification, title: doing }, async (): Promise<void> => {
        await task();
        done && void window.showInformationMessage(done);
    });
}

/**
 * Retrieves a property by name from an object and checks that it's not null and not undefined.  It is strongly typed
 * for the property and will give a compile error if the given name is not a property of the source.
 */
export function nonNullProp<TSource, TKey extends keyof TSource>(source: TSource, name: TKey): NonNullable<TSource[TKey]> {
    const value: NonNullable<TSource[TKey]> = <NonNullable<TSource[TKey]>>source[name];
    return nonNullValue(value, <string>name);
}

/**
 * Validates that a given value is not null and not undefined.
 */
export function nonNullValue<T>(value: T | undefined, propertyNameOrMessage?: string): T {
    if (value === null || value === undefined) {
        throw new Error(
            // tslint:disable-next-line:prefer-template
            'Internal error: Expected value to be neither null nor undefined'
            + (propertyNameOrMessage ? `: ${propertyNameOrMessage}` : ''));
    }

    return value;
}

export function getThemedIconPath(iconName: string): TreeItemIconPath {
    const resources: string = ext.context.asAbsolutePath('resources');
    return {
        light: path.join(resources, 'light', `${iconName}.svg`),
        dark: path.join(resources, 'dark', `${iconName}.svg`)
    };
}

export function showError(commandName: string, error: Error): void {
    void window.showErrorMessage(`Command "${commandName}" fails. ${error.message}`);
}

export function createPortalUrl(subscription: AzureSubscription, id: string, options?: OpenInPortalOptions): vscode.Uri {
    const queryPrefix: string = (options && options.queryPrefix) ? `?${options.queryPrefix}` : '';
    const url: string = `${subscription.environment.portalUrl}/${queryPrefix}#@${subscription.tenantId}/resource${id}`;

    return vscode.Uri.parse(url);
}

export async function loadPackageInfo(context: ExtensionContext): Promise<void> {
    const raw = await fs.promises.readFile(context.asAbsolutePath("./package.json"), { encoding: 'utf-8' });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { publisher, name, version, aiKey } = JSON.parse(raw);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    EXTENSION_AI_KEY = aiKey;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    EXTENSION_PUBLISHER = publisher;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    EXTENSION_NAME = name;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    EXTENSION_VERSION = version;
}

export function getExtensionId(): string {
    return `${EXTENSION_PUBLISHER}.${EXTENSION_NAME}`;
}

export function getExtensionVersion(): string {
    return EXTENSION_VERSION;
}

export function getAiKey(): string {
    return EXTENSION_AI_KEY;
}

