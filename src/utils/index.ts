// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// tslint:disable-next-line:no-require-imports no-implicit-dependencies
import { TreeItemIconPath } from "@microsoft/vscode-azext-utils";
import * as path from 'path';
import { ProgressLocation, window } from "vscode";
import * as nls from 'vscode-nls';
import { ext } from "../extensionVariables";

export const localize: nls.LocalizeFunc = nls.loadMessageBundle();

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
