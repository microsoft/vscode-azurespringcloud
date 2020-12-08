/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { TreeItemIconPath } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';

export namespace TreeUtils {
    export function getIconPath(iconName: string): TreeItemIconPath {
        return path.join(getResourcesPath(), `${iconName}.svg`);
    }

    export function getPngIconPath(iconName: string): TreeItemIconPath {
        return path.join(getResourcesPath(), `${iconName}.png`);
    }

    export function getThemedIconPath(iconName: string): TreeItemIconPath {
        return {
            light: path.join(getResourcesPath(), 'light', `${iconName}.svg`),
            dark: path.join(getResourcesPath(), 'dark', `${iconName}.svg`)
        };
    }

    function getResourcesPath(): string {
        return ext.context.asAbsolutePath('resources');
    }
}