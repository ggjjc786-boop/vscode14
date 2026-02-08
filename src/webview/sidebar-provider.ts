import * as vscode from 'vscode';
import { ConfigStore } from '../config-store';
import { SecretStore } from '../secret';
import { getSidebarHtml } from './get-html';
import { officialModelsManager } from '../official-models-manager';
import type { EventedUriHandler } from '../uri-handler';
import type { ProviderConfig, ModelConfig } from '../types';
import {
  addProvider,
  addProviderFromConfig,
  addProviderFromWellKnownList,
  exportAllProviders,
  importProviders,
  manageProviders,
} from '../ui';

export const SIDEBAR_VIEW_ID = 'unifyChatProvider.sidebarView';

interface WebviewProviderData {
  name: string;
  type: string;
  baseUrl: string;
  models: ModelConfig[];
  auth?: { method: string; apiKey?: string };
  autoFetchOfficialModels?: boolean;
  officialModelCount?: number;
}

/**
 * Sidebar WebviewView provider for the Unify Chat Provider extension.
 * Renders a beautiful provider management UI in the sidebar.
 */
export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = SIDEBAR_VIEW_ID;

  private _view?: vscode.WebviewView;
  private _disposables: vscode.Disposable[] = [];

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _configStore: ConfigStore,
    private readonly _secretStore: SecretStore,
    private readonly _uriHandler?: EventedUriHandler,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = getSidebarHtml(
      webviewView.webview,
      this._extensionUri,
    );

    // Handle messages from webview
    this._disposables.push(
      webviewView.webview.onDidReceiveMessage((msg) =>
        this._handleMessage(msg),
      ),
    );

    // Refresh when config changes
    this._disposables.push(
      this._configStore.onDidChange(() => {
        this._sendProviders();
      }),
    );

    // Refresh when official models update
    this._disposables.push(
      officialModelsManager.onDidUpdate(() => {
        this._sendProviders();
      }),
    );

    // Clean up
    webviewView.onDidDispose(() => {
      for (const d of this._disposables) {
        d.dispose();
      }
      this._disposables = [];
    });
  }

  /**
   * Push the latest provider data to the webview.
   */
  private _sendProviders(): void {
    if (!this._view) return;

    const endpoints = this._configStore.endpoints;
    const providerData: WebviewProviderData[] = endpoints.map((p) =>
      this._mapProvider(p),
    );

    this._view.webview.postMessage({
      type: 'updateProviders',
      providers: providerData,
    });
  }

  private _mapProvider(p: ProviderConfig): WebviewProviderData {
    let officialModelCount = 0;
    if (p.autoFetchOfficialModels) {
      const fetchState = officialModelsManager.getProviderState(p.name);
      if (fetchState?.models) {
        officialModelCount = fetchState.models.length;
      }
    }

    return {
      name: p.name,
      type: p.type,
      baseUrl: p.baseUrl,
      models: p.models,
      auth: p.auth ? { method: p.auth.method, apiKey: 'apiKey' in p.auth ? (p.auth.apiKey ? '***' : undefined) : undefined } : undefined,
      autoFetchOfficialModels: p.autoFetchOfficialModels,
      officialModelCount,
    };
  }

  /**
   * Handle messages from the webview.
   */
  private async _handleMessage(msg: { command: string; name?: string }): Promise<void> {
    switch (msg.command) {
      case 'ready':
      case 'refresh':
        this._sendProviders();
        break;

      case 'addFromWellKnown':
        await addProviderFromWellKnownList(
          this._configStore,
          this._secretStore,
          this._uriHandler,
        );
        break;

      case 'addManual':
        await addProvider(
          this._configStore,
          this._secretStore,
          this._uriHandler,
        );
        break;

      case 'importConfig':
        await addProviderFromConfig(
          this._configStore,
          this._secretStore,
          this._uriHandler,
        );
        break;

      case 'importFromApps':
        await importProviders(
          this._configStore,
          this._secretStore,
          this._uriHandler,
        );
        break;

      case 'exportAll':
        await exportAllProviders(
          this._configStore,
          this._secretStore,
          this._uriHandler,
        );
        break;

      case 'editProvider':
        if (msg.name) {
          await this._editProvider(msg.name);
        }
        break;

      case 'manageModels':
        if (msg.name) {
          await this._editProvider(msg.name);
        }
        break;

      case 'deleteProvider':
        if (msg.name) {
          await this._deleteProvider(msg.name);
        }
        break;

      case 'duplicateProvider':
        if (msg.name) {
          await this._duplicateProvider(msg.name);
        }
        break;

      case 'exportProvider':
        if (msg.name) {
          await this._exportSingleProvider(msg.name);
        }
        break;

      case 'manageProviders':
        await manageProviders(
          this._configStore,
          this._secretStore,
          this._uriHandler,
        );
        break;

      case 'openSettings':
        await vscode.commands.executeCommand(
          'workbench.action.openSettings',
          'unifyChatProvider',
        );
        break;

      case 'refreshOfficialModels':
        await vscode.commands.executeCommand(
          'unifyChatProvider.refreshAllProvidersOfficialModels',
        );
        break;
    }
  }

  private async _editProvider(name: string): Promise<void> {
    // Use the manage providers command which opens the QuickPick UI
    // The user can then navigate to the specific provider
    await manageProviders(
      this._configStore,
      this._secretStore,
      this._uriHandler,
    );
  }

  private async _deleteProvider(name: string): Promise<void> {
    const answer = await vscode.window.showWarningMessage(
      `Delete provider "${name}"?`,
      { modal: true },
      'Delete',
    );
    if (answer === 'Delete') {
      await this._configStore.removeProvider(name);
      vscode.window.showInformationMessage(`Provider "${name}" deleted.`);
    }
  }

  private async _duplicateProvider(name: string): Promise<void> {
    const provider = this._configStore.getProvider(name);
    if (!provider) return;

    const newName = `${name} (Copy)`;
    let uniqueName = newName;
    let counter = 2;
    while (this._configStore.getProvider(uniqueName)) {
      uniqueName = `${name} (Copy ${counter})`;
      counter++;
    }

    const clone: ProviderConfig = { ...provider, name: uniqueName };
    await this._configStore.upsertProvider(clone);
    vscode.window.showInformationMessage(`Provider duplicated as "${uniqueName}".`);
  }

  private async _exportSingleProvider(name: string): Promise<void> {
    const provider = this._configStore.getProvider(name);
    if (!provider) return;

    // Export via clipboard as Base64 JSON
    const json = JSON.stringify([provider], null, 2);
    const b64 = Buffer.from(json).toString('base64');
    await vscode.env.clipboard.writeText(b64);
    vscode.window.showInformationMessage(
      `Provider "${name}" configuration copied to clipboard (Base64).`,
    );
  }

  /**
   * Refresh the sidebar view externally.
   */
  refresh(): void {
    this._sendProviders();
  }
}
