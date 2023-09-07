/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createSubscriptionContext } from "@microsoft/vscode-azext-utils";
import { EventEmitter } from 'events';
import { createServer, Server, Socket } from 'net';
import * as websocket from 'websocket';
import { ext } from '../../extensionVariables';
import { EnhancedDeployment } from '../../model/EnhancedDeployment';
import { EnhancedInstance } from '../../model/EnhancedInstance';

export class DebugProxy extends EventEmitter {
    public readonly port: number;
    private readonly _instance: EnhancedInstance;

    private _server: Server | undefined;
    private _wsclient: websocket.client | undefined;
    private _wsconnection: websocket.connection | undefined;
    private _messagesRead: number = 0;

    constructor(instance: EnhancedInstance, port: number) {
        super();
        this.port = port;
        this._instance = instance;
        this._server = createServer();
    }

    public start(serverPort: number): void {
        if (!this._server) {
            this.emit('error', new Error('Proxy server is not started.'));
        } else {
            this._server.on('connection', (socket: Socket) => {
                if (this._wsclient) {
                    ext.outputChannel.appendLog(`[Proxy Server] The server is already connected. Rejected connection from "${socket.remoteAddress}:${socket.remotePort}"`);
                    this.emit('error', new Error(`[Proxy Server] The server is already connected. Rejected connection from "${socket.remoteAddress}:${socket.remotePort}"`));
                    socket.destroy();
                } else {
                    ext.outputChannel.appendLog(`[Proxy Server] client connected ${socket.remoteAddress}:${socket.remotePort}`);
                    socket.pause();

                    this._wsclient = new websocket.client();

                    this._wsclient.on('connect', (connection: websocket.connection) => {
                        ext.outputChannel.appendLog('[WebSocket] client connected');
                        this._wsconnection = connection;

                        connection.on('close', () => {
                            ext.outputChannel.appendLog('[WebSocket] client closed');
                            this.dispose();
                            socket.destroy();
                            this.emit('end');
                        });

                        connection.on('error', (err: Error) => {
                            ext.outputChannel.appendLog(`[WebSocket] ${err}`);
                            this.dispose();
                            socket.destroy();
                            this.emit('error', err);
                        });

                        connection.on('message', (msg: websocket.Message) => {
                            this._messagesRead = this._messagesRead + 1;
                            if (this._messagesRead > 2 && 'binaryData' in msg) {
                                const channel: number = msg.binaryData.readUInt8(0);
                                const data: Buffer = msg.binaryData.slice(1);
                                if (channel === 1) {
                                    const err: Error = new Error(data.toString());
                                    ext.outputChannel.appendLog(`[WebSocket] Received an error: ${err}`);
                                    this.dispose();
                                    socket.destroy();
                                    this.emit('error', err);
                                } else {
                                    // ext.outputChannel.appendLog(`[WebSocket] Received: ${data.toString()}`);
                                    socket.write(data);
                                }
                            }
                        });
                        socket.resume();
                    });

                    this._wsclient.on('connectFailed', (err: Error) => {
                        ext.outputChannel.appendLog(`[WebSocket] ${err}`);
                        this.dispose();
                        socket.destroy();
                        this.emit('error', err);
                    });

                    socket.on('data', (data: Buffer) => {
                        if (this._wsconnection) {
                            const channel: Buffer = Buffer.from([0]);
                            // ext.outputChannel.appendLog(`[Proxy Server] Sent: ${data.toString()}`);
                            this._wsconnection.send(Buffer.concat([channel, data]));
                        }
                    });

                    socket.on('end', () => {
                        ext.outputChannel.appendLog(`[Proxy Server] client disconnected ${socket.remoteAddress}:${socket.remotePort}`);
                        this.dispose();
                        this.emit('end');
                    });

                    socket.on('error', (err: Error) => {
                        ext.outputChannel.appendLog(`[Proxy Server] ${err}`);
                        this.dispose();
                        socket.destroy();
                        this.emit('error', err);
                    });

                    void this.connect(serverPort);
                }
            });

            this._server.on('listening', () => {
                ext.outputChannel.appendLog(`[Proxy Server] start listening at ${this.port}`);
                this.emit('start');
            });

            this._server.listen({
                host: 'localhost',
                port: this.port,
                backlog: 1
            });
        }
    }

    public dispose(): void {
        if (this._wsconnection) {
            this._wsconnection.close();
            this._wsconnection = undefined;
        }
        if (this._wsclient) {
            this._wsclient.abort();
            this._wsclient = undefined;
        }
        if (this._server) {
            this._server.close();
            this._server = undefined;
        }
    }

    private async connect(serverPort: number): Promise<void> {
        const deployment: EnhancedDeployment = this._instance.deployment;
        const subContext = createSubscriptionContext(deployment.app.service.subscription);
        const credential: { token: string } = <{ token: string }>await subContext.credentials.getToken();
        const appName: string = deployment.app.name;
        const deploymentName: string = deployment.name;
        const instanceName: string = this._instance.name ?? 'unknown-instance';
        const fqdn: string = (await deployment.app.properties)?.fqdn ?? 'unknown-host';
        const url: string = `wss://${fqdn}/api/remoteDebugging/apps/${appName}/deployments/${deploymentName}/instances/${instanceName}?port=${serverPort}`;
        ext.outputChannel.appendLog(`[Proxy Server] connecting server "${url}"`);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._wsclient!.connect(
            url,
            undefined,
            undefined,
            {
                Upgrade: 'websocket',
                Connection: 'Upgrade',
                Authorization: `Bearer ${credential.token}`
            }
        );
        ext.outputChannel.appendLog(`[Proxy Server] connected server "${url}"`);
    }
}
