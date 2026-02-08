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
  const configStore = new ConfigStore();
  const secretStore = new SecretStore(context.secrets);

  // Register URI handler (import-config + OAuth callbacks)
  const uriHandler = registerUriHandler(
    context,
    configStore,
    secretStore,
  );

  // Register sidebar webview provider FIRST (must succeed for UI to show)
  const sidebarProvider = new SidebarProvider(
    context.extensionUri,
    configStore,
    secretStore,
    uriHandler,
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SIDEBAR_VIEW_ID, sidebarProvider),
  );

  // Register focus sidebar command
  context.subscriptions.push(
    vscode.commands.registerCommand('unifyChatProvider.focusSidebar', () => {
      vscode.commands.executeCommand(`${SIDEBAR_VIEW_ID}.focus`);
    }),
  );

  // Register commands (these are safe and should always work)
  registerCommands(context, configStore, secretStore, uriHandler);

  // Initialize auth system
  const authManager = new AuthManager(configStore, secretStore, uriHandler);
  context.subscriptions.push(authManager);

  try {
    await migrateProviderTypes(configStore);
    await migrateApiKeyToAuth(configStore);
  } catch (e) {
    console.warn('[UCP] Migration failed:', e);
  }

  const chatProvider = new UnifyChatService(configStore, secretStore, authManager);

  try {
    // Initialize official models manager
    await officialModelsManager.initialize(context, secretStore, authManager);
    context.subscriptions.push(officialModelsManager);
  } catch (e) {
    console.warn('[UCP] Official models manager init failed:', e);
  }

  try {
    // Register the language model chat provider (proposed API, may not be available)
    const providerRegistration = vscode.lm.registerLanguageModelChatProvider(
      VENDOR_ID,
      chatProvider,
    );
    context.subscriptions.push(providerRegistration);
  } catch (e) {
    console.warn('[UCP] Language model chat provider registration failed (proposed API may not be available):', e);
  }
  context.subscriptions.push(chatProvider);

  // Trigger initial model cache refresh
  try {
    chatProvider.handleConfigurationChange();
  } catch (e) {
    console.warn('[UCP] Initial config change handling failed:', e);
  }

  registerSecretStorageMaintenance(context, configStore, secretStore);
  runSecretStorageMaintenanceOnStartup(configStore, secretStore);

  // Re-register provider when configuration changes to pick up new models
  context.subscriptions.push(
    configStore.onDidChange(() => {
      try {
        chatProvider.handleConfigurationChange();
      } catch (_e) { /* ignore */ }
      enqueueMaintenance(async () => {
        await cleanupUnusedSecrets(secretStore);
      });
    }),
  );

  // Re-register provider when official models are updated
  context.subscriptions.push(
    officialModelsManager.onDidUpdate(() => {
      try {
        chatProvider.handleConfigurationChange();
      } catch (_e) { /* ignore */ }
    }),
  );

  // Clean up config store on deactivation
  context.subscriptions.push(configStore);
}

export function registerCommands(
  context: vscode.ExtensionContext,
  configStore: ConfigStore,
  secretStore: SecretStore,
  uriHandler: EventedUriHandler,
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
