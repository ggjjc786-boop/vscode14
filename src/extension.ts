import * as vscode from 'vscode';
import { ConfigStore } from './config-store';
import {
  SecretStore,
  migrateApiKeyToAuth,
  migrateProviderTypes,
  migrateApiKeyStorage,
  cleanupUnusedSecrets,
} from './secret';
import { UnifyChatService } from './service';
import {
  addProvider,
  addProviderFromConfig,
  addProviderFromWellKnownList,
  exportAllProviders,
  importProviders,
  manageProviders,
  removeProvider,
} from './ui';
import { officialModelsManager } from './official-models-manager';
import { registerUriHandler, type EventedUriHandler } from './uri-handler';
import { t } from './i18n';
import {
  AuthManager,
} from './auth';
import { SidebarProvider, SIDEBAR_VIEW_ID } from './webview/sidebar-provider';

const VENDOR_ID = 'unify-chat-provider';
const CONFIG_NAMESPACE = 'unifyChatProvider';

/**
 * Extension activation
 */
export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  // Step 1: Create core stores (minimal, should never fail)
  let configStore: ConfigStore;
  let secretStore: SecretStore;
  try {
    configStore = new ConfigStore();
    secretStore = new SecretStore(context.secrets);
  } catch (e) {
    vscode.window.showErrorMessage(`[UCP] Failed to initialize stores: ${e}`);
    return;
  }

  // Step 2: Register sidebar IMMEDIATELY (highest priority)
  try {
    const sidebarProvider = new SidebarProvider(
      context.extensionUri,
      configStore,
      secretStore,
    );
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(SIDEBAR_VIEW_ID, sidebarProvider),
    );
  } catch (e) {
    vscode.window.showErrorMessage(`[UCP] Failed to register sidebar: ${e}`);
  }

  // Step 3: Register focus sidebar command
  try {
    context.subscriptions.push(
      vscode.commands.registerCommand('unifyChatProvider.focusSidebar', () => {
        vscode.commands.executeCommand(`${SIDEBAR_VIEW_ID}.focus`);
      }),
    );
  } catch (_e) { /* ignore */ }

  // Step 4: URI handler (needed for commands)
  let uriHandler: EventedUriHandler | undefined;
  try {
    uriHandler = registerUriHandler(context, configStore, secretStore);
  } catch (e) {
    console.warn('[UCP] URI handler registration failed:', e);
  }

  // Step 5: Register commands
  try {
    registerCommands(context, configStore, secretStore, uriHandler);
  } catch (e) {
    console.warn('[UCP] Command registration failed:', e);
  }

  // Step 6: Auth, migration, and LLM provider (may fail with proposed APIs)
  try {
    const authManager = new AuthManager(configStore, secretStore, uriHandler);
    context.subscriptions.push(authManager);

    try {
      await migrateProviderTypes(configStore);
      await migrateApiKeyToAuth(configStore);
    } catch (e) {
      console.warn('[UCP] Migration failed:', e);
    }

    const chatProvider = new UnifyChatService(configStore, secretStore, authManager);
    context.subscriptions.push(chatProvider);

    try {
      await officialModelsManager.initialize(context, secretStore, authManager);
      context.subscriptions.push(officialModelsManager);
    } catch (e) {
      console.warn('[UCP] Official models manager init failed:', e);
    }

    try {
      if (typeof vscode.lm?.registerLanguageModelChatProvider === 'function') {
        const providerRegistration = vscode.lm.registerLanguageModelChatProvider(
          VENDOR_ID,
          chatProvider,
        );
        context.subscriptions.push(providerRegistration);
      }
    } catch (e) {
      console.warn('[UCP] Language model chat provider registration skipped:', e);
    }

    try {
      chatProvider.handleConfigurationChange();
    } catch (_e) { /* ignore */ }

    registerSecretStorageMaintenance(context, configStore, secretStore);
    runSecretStorageMaintenanceOnStartup(configStore, secretStore);

    context.subscriptions.push(
      configStore.onDidChange(() => {
        try { chatProvider.handleConfigurationChange(); } catch (_e) { /* ignore */ }
        enqueueMaintenance(async () => {
          await cleanupUnusedSecrets(secretStore);
        });
      }),
    );

    context.subscriptions.push(
      officialModelsManager.onDidUpdate(() => {
        try { chatProvider.handleConfigurationChange(); } catch (_e) { /* ignore */ }
      }),
    );
  } catch (e) {
    console.warn('[UCP] Advanced features init failed (sidebar still works):', e);
  }

  context.subscriptions.push(configStore);
}

export function registerCommands(
  context: vscode.ExtensionContext,
  configStore: ConfigStore,
  secretStore: SecretStore,
  uriHandler?: EventedUriHandler,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('unifyChatProvider.addProvider', () =>
      addProvider(configStore, secretStore, uriHandler),
    ),

    vscode.commands.registerCommand('unifyChatProvider.removeProvider', () =>
      removeProvider(configStore, secretStore, uriHandler),
    ),
    vscode.commands.registerCommand('unifyChatProvider.importConfig', () =>
      addProviderFromConfig(configStore, secretStore, uriHandler),
    ),
    vscode.commands.registerCommand(
      'unifyChatProvider.addProviderFromWellKnownProviderList',
      () => addProviderFromWellKnownList(configStore, secretStore, uriHandler),
    ),
    vscode.commands.registerCommand(
      'unifyChatProvider.importConfigFromOtherApplications',
      () => importProviders(configStore, secretStore, uriHandler),
    ),
    vscode.commands.registerCommand('unifyChatProvider.exportConfig', () =>
      exportAllProviders(configStore, secretStore, uriHandler),
    ),
    vscode.commands.registerCommand('unifyChatProvider.manageProviders', () =>
      manageProviders(configStore, secretStore, uriHandler),
    ),
    vscode.commands.registerCommand(
      'unifyChatProvider.refreshAllProvidersOfficialModels',
      async () => {
        const providers = configStore.endpoints;
        const enabledCount = providers.filter(
          (p) => p.autoFetchOfficialModels,
        ).length;
        if (enabledCount === 0) {
          vscode.window.showInformationMessage(
            t('No providers have auto-fetch official models enabled.'),
          );
          return;
        }
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: t('Refreshing official models...'),
            cancellable: false,
          },
          async () => {
            await officialModelsManager.refreshAll(providers);
          },
        );
        vscode.window.showInformationMessage(
          t('Refreshed official models for {0} provider(s).', enabledCount),
        );
      },
    ),
  );
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  // Cleanup handled by disposables
}

let maintenanceQueue: Promise<void> = Promise.resolve();

function enqueueMaintenance(work: () => Promise<void>): void {
  const run = async (): Promise<void> => {
    try {
      await work();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(
        t('Failed to maintain secret storage: {0}', message),
        { modal: true },
      );
    }
  };
  maintenanceQueue = maintenanceQueue.then(run, run);
}

function registerSecretStorageMaintenance(
  context: vscode.ExtensionContext,
  configStore: ConfigStore,
  secretStore: SecretStore,
): void {
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        !e.affectsConfiguration(`${CONFIG_NAMESPACE}.storeApiKeyInSettings`)
      ) {
        return;
      }
      enqueueMaintenance(async () => {
        await migrateApiKeyStorage({
          configStore,
          secretStore,
          storeApiKeyInSettings: configStore.storeApiKeyInSettings,
          showProgress: true,
        });
        await cleanupUnusedSecrets(secretStore);
      });
    }),
  );
}

function runSecretStorageMaintenanceOnStartup(
  configStore: ConfigStore,
  secretStore: SecretStore,
): void {
  enqueueMaintenance(async () => {
    await migrateApiKeyStorage({
      configStore,
      secretStore,
      storeApiKeyInSettings: configStore.storeApiKeyInSettings,
      showProgress: false,
    });
    await cleanupUnusedSecrets(secretStore);
  });
}
