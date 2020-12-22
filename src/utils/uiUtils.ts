/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from "vscode";

// tslint:disable-next-line:export-name
export async function generalErrorHandler(commandName: string, error: Error): Promise<void> {
    await window.showErrorMessage(`Command "${commandName}" fails. ${error.message}`);
    throw error;
}
