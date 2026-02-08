import * as vscode from 'vscode';

/**
 * Generate the sidebar webview HTML with modern, beautiful UI.
 * Uses VS Code CSS variables for full theme integration.
 */
export function getSidebarHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
): string {
  const nonce = getNonce();

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
  <style nonce="${nonce}">
    /* ===== Reset & Base ===== */
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{font-size:13px}
    body{
      font-family:var(--vscode-font-family);
      color:var(--vscode-foreground);
      background:var(--vscode-sideBar-background,var(--vscode-editor-background));
      line-height:1.5;
      overflow-x:hidden;
      -webkit-font-smoothing:antialiased;
      -moz-osx-font-smoothing:grayscale;
    }

    /* ===== Scrollbar ===== */
    ::-webkit-scrollbar{width:5px;height:5px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{
      background:var(--vscode-scrollbarSlider-background);
      border-radius:4px;
    }
    ::-webkit-scrollbar-thumb:hover{background:var(--vscode-scrollbarSlider-hoverBackground)}

    /* ===== Layout ===== */
    .container{padding:0 12px 20px}

    /* ===== Header ===== */
    .header{
      position:sticky;top:0;z-index:10;
      background:var(--vscode-sideBar-background,var(--vscode-editor-background));
      padding:16px 0 12px;
      margin-bottom:6px;
    }
    .header::after{
      content:'';position:absolute;bottom:0;left:-12px;right:-12px;
      height:1px;
      background:linear-gradient(90deg,transparent,var(--vscode-widget-border,var(--vscode-panel-border,rgba(128,128,128,.2))),transparent);
    }
    .header-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
    .header h2{
      font-size:15px;font-weight:700;
      color:var(--vscode-foreground);
      display:flex;align-items:center;gap:8px;
      letter-spacing:-0.01em;
    }
    .header h2 .badge{
      font-size:10px;font-weight:700;
      background:var(--vscode-badge-background);
      color:var(--vscode-badge-foreground);
      padding:2px 7px;border-radius:10px;
      min-width:20px;text-align:center;
      line-height:1.3;
    }
    .header-actions{display:flex;gap:2px}

    /* ===== Status Bar ===== */
    .status-bar{
      display:flex;align-items:center;gap:10px;
      padding:6px 10px;
      margin-bottom:12px;
      border-radius:6px;
      background:var(--vscode-textBlockQuote-background,rgba(128,128,128,.06));
      font-size:11px;
      color:var(--vscode-descriptionForeground);
    }
    .status-dot{
      width:7px;height:7px;border-radius:50%;
      flex-shrink:0;
      animation:pulse 2s ease-in-out infinite;
    }
    .status-dot.active{background:var(--vscode-charts-green,#28a745)}
    .status-dot.inactive{background:var(--vscode-charts-yellow,#ffc107);animation:none}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

    /* ===== Icon Button ===== */
    .icon-btn{
      width:28px;height:28px;border:none;
      background:transparent;color:var(--vscode-foreground);
      border-radius:6px;cursor:pointer;
      display:inline-flex;align-items:center;justify-content:center;
      font-size:14px;transition:all .15s ease;
      position:relative;opacity:.75;
    }
    .icon-btn:hover{
      background:var(--vscode-toolbar-hoverBackground);
      opacity:1;
    }
    .icon-btn:active{
      background:var(--vscode-toolbar-activeBackground,var(--vscode-toolbar-hoverBackground));
      transform:scale(.92);
    }
    .icon-btn[data-tooltip]:hover::after{
      content:attr(data-tooltip);
      position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);
      background:var(--vscode-editorHoverWidget-background,var(--vscode-editorWidget-background));
      color:var(--vscode-editorHoverWidget-foreground,var(--vscode-foreground));
      border:1px solid var(--vscode-editorHoverWidget-border,var(--vscode-widget-border));
      padding:4px 10px;border-radius:6px;font-size:11px;white-space:nowrap;z-index:99;
      pointer-events:none;
      box-shadow:0 2px 8px rgba(0,0,0,.12);
    }

    /* ===== Quick Actions Bar ===== */
    .quick-actions{
      display:grid;grid-template-columns:1fr 1fr;gap:6px;
      margin-bottom:14px;
    }
    .quick-action-btn{
      display:flex;align-items:center;gap:7px;
      padding:9px 12px;border:none;
      background:var(--vscode-button-secondaryBackground);
      color:var(--vscode-button-secondaryForeground);
      border-radius:8px;cursor:pointer;
      font-size:11.5px;font-weight:500;font-family:inherit;
      transition:all .15s ease;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      position:relative;
    }
    .quick-action-btn:hover{
      background:var(--vscode-button-secondaryHoverBackground);
      transform:translateY(-1px);
      box-shadow:0 2px 6px rgba(0,0,0,.06);
    }
    .quick-action-btn:active{transform:translateY(0);box-shadow:none}
    .quick-action-btn .icon{font-size:14px;flex-shrink:0;opacity:.8}
    .quick-action-btn.primary{
      background:var(--vscode-button-background);
      color:var(--vscode-button-foreground);
      grid-column:1 / -1;
      font-weight:600;
      justify-content:center;
      padding:10px 12px;
    }
    .quick-action-btn.primary:hover{
      background:var(--vscode-button-hoverBackground);
      box-shadow:0 2px 10px rgba(0,0,0,.1);
    }

    /* ===== Search ===== */
    .search-wrap{position:relative;margin-bottom:14px}
    .search-wrap .search-icon{
      position:absolute;left:10px;top:50%;transform:translateY(-50%);
      font-size:13px;opacity:.4;pointer-events:none;
    }
    .search-input{
      width:100%;
      padding:7px 10px 7px 30px;
      background:var(--vscode-input-background);
      color:var(--vscode-input-foreground);
      border:1px solid var(--vscode-input-border,rgba(128,128,128,.15));
      border-radius:6px;
      font-size:12px;font-family:inherit;
      outline:none;
      transition:border-color .15s,box-shadow .15s;
    }
    .search-input:focus{
      border-color:var(--vscode-focusBorder);
      box-shadow:0 0 0 1px var(--vscode-focusBorder);
    }
    .search-input::placeholder{color:var(--vscode-input-placeholderForeground)}
    .search-clear{
      position:absolute;right:6px;top:50%;transform:translateY(-50%);
      width:20px;height:20px;border:none;
      background:transparent;color:var(--vscode-foreground);
      border-radius:4px;cursor:pointer;
      display:none;align-items:center;justify-content:center;
      font-size:12px;opacity:.5;
    }
    .search-clear:hover{opacity:1;background:var(--vscode-toolbar-hoverBackground)}
    .search-wrap.has-value .search-clear{display:inline-flex}

    /* ===== Tab Bar ===== */
    .tab-bar{
      display:flex;gap:0;
      margin-bottom:14px;
      border-bottom:1px solid var(--vscode-widget-border,var(--vscode-panel-border,rgba(128,128,128,.15)));
    }
    .tab-btn{
      flex:1;padding:7px 6px;border:none;
      background:transparent;
      color:var(--vscode-descriptionForeground);
      font-size:11px;font-weight:600;font-family:inherit;
      cursor:pointer;position:relative;
      transition:color .15s;
      text-transform:uppercase;letter-spacing:.3px;
    }
    .tab-btn:hover{color:var(--vscode-foreground)}
    .tab-btn.active{color:var(--vscode-foreground)}
    .tab-btn.active::after{
      content:'';position:absolute;bottom:-1px;left:10%;right:10%;
      height:2px;border-radius:1px;
      background:var(--vscode-focusBorder,var(--vscode-button-background));
    }
    .tab-content{display:none}
    .tab-content.active{display:block}

    /* ===== Section Label ===== */
    .section-label{
      display:flex;align-items:center;gap:8px;
      font-size:10px;font-weight:700;
      text-transform:uppercase;letter-spacing:.8px;
      color:var(--vscode-descriptionForeground);
      padding:8px 0 6px;
      opacity:.7;
    }
    .section-label::after{
      content:'';flex:1;height:1px;
      background:var(--vscode-widget-border,var(--vscode-panel-border,rgba(128,128,128,.15)));
    }

    /* ===== Provider Card ===== */
    .provider-card{
      background:var(--vscode-editor-background);
      border:1px solid var(--vscode-widget-border,var(--vscode-panel-border,rgba(128,128,128,.12)));
      border-radius:10px;
      margin-bottom:8px;
      overflow:hidden;
      transition:all .2s ease;
    }
    .provider-card:hover{
      border-color:var(--vscode-focusBorder);
      box-shadow:0 2px 12px rgba(0,0,0,.06);
    }
    .provider-card.expanded{
      box-shadow:0 2px 16px rgba(0,0,0,.08);
    }
    .provider-card-header{
      display:flex;align-items:center;gap:10px;
      padding:10px 12px;
      cursor:pointer;user-select:none;
      transition:background .12s;
    }
    .provider-card-header:hover{
      background:var(--vscode-list-hoverBackground);
    }

    /* Provider icon with gradient */
    .provider-icon{
      width:34px;height:34px;
      border-radius:8px;
      display:flex;align-items:center;justify-content:center;
      font-size:13px;font-weight:800;
      flex-shrink:0;
      color:#fff;
      letter-spacing:-0.5px;
      position:relative;
      overflow:hidden;
    }
    .provider-icon::after{
      content:'';position:absolute;inset:0;
      background:linear-gradient(135deg,rgba(255,255,255,.2),transparent 60%);
      border-radius:inherit;
    }

    .provider-info{flex:1;min-width:0}
    .provider-name{
      font-size:13px;font-weight:600;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      letter-spacing:-0.01em;
    }
    .provider-meta{
      display:flex;align-items:center;gap:6px;
      font-size:11px;
      color:var(--vscode-descriptionForeground);
      margin-top:3px;
    }
    .provider-type-badge{
      font-size:9.5px;font-weight:600;
      padding:2px 6px;
      border-radius:4px;
      background:var(--vscode-badge-background);
      color:var(--vscode-badge-foreground);
      text-transform:uppercase;
      letter-spacing:.3px;
    }
    .model-count-label{
      display:inline-flex;align-items:center;gap:3px;
      opacity:.75;
    }
    .model-count-label svg{width:12px;height:12px;fill:currentColor;opacity:.6}

    .provider-expand{
      font-size:11px;
      color:var(--vscode-descriptionForeground);
      transition:transform .25s ease;
      opacity:.5;
    }
    .provider-card.expanded .provider-expand{transform:rotate(90deg)}

    /* Card actions (shown on hover) */
    .provider-actions{
      display:flex;gap:1px;
      opacity:0;transition:opacity .15s;
    }
    .provider-card-header:hover .provider-actions{opacity:1}

    /* ===== Provider Detail Panel ===== */
    .provider-detail{
      max-height:0;overflow:hidden;
      transition:max-height .3s cubic-bezier(.4,0,.2,1);
    }
    .provider-card.expanded .provider-detail{max-height:2000px}
    .provider-detail-inner{
      padding:2px 14px 14px;
      border-top:1px solid var(--vscode-widget-border,var(--vscode-panel-border,rgba(128,128,128,.08)));
    }

    /* Detail info rows */
    .detail-row{
      display:flex;align-items:flex-start;gap:8px;
      padding:5px 0;
      font-size:12px;
    }
    .detail-label{
      flex-shrink:0;width:72px;
      color:var(--vscode-descriptionForeground);
      font-weight:600;
      font-size:11px;
      text-transform:uppercase;
      letter-spacing:.3px;
      padding-top:1px;
    }
    .detail-value{
      flex:1;min-width:0;
      word-break:break-all;
    }
    .detail-value.url{
      color:var(--vscode-textLink-foreground);
      font-size:11px;
      font-family:var(--vscode-editor-font-family,monospace);
    }

    /* ===== Model List inside card ===== */
    .model-section-title{
      font-size:11px;font-weight:700;
      color:var(--vscode-descriptionForeground);
      margin:12px 0 8px;
      display:flex;align-items:center;gap:6px;
      text-transform:uppercase;
      letter-spacing:.3px;
    }
    .model-chip-list{display:flex;flex-wrap:wrap;gap:5px}
    .model-chip{
      display:inline-flex;align-items:center;gap:4px;
      padding:4px 10px;
      background:var(--vscode-badge-background);
      color:var(--vscode-badge-foreground);
      border-radius:12px;
      font-size:11px;font-weight:500;
      cursor:default;
      transition:all .15s ease;
      max-width:200px;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .model-chip:hover{
      opacity:.85;
      transform:translateY(-1px);
    }
    .model-chip .dot{
      width:6px;height:6px;border-radius:50%;
      flex-shrink:0;
    }
    .model-chip.more-chip{
      opacity:.6;font-style:italic;
      background:transparent;
      border:1px dashed var(--vscode-widget-border,var(--vscode-panel-border,rgba(128,128,128,.3)));
      color:var(--vscode-descriptionForeground);
    }

    /* Detail action buttons */
    .detail-actions{
      display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;
    }
    .detail-action-btn{
      display:flex;align-items:center;gap:5px;
      padding:6px 12px;border:none;
      background:var(--vscode-button-secondaryBackground);
      color:var(--vscode-button-secondaryForeground);
      border-radius:6px;cursor:pointer;
      font-size:11px;font-weight:500;font-family:inherit;
      transition:all .15s ease;
    }
    .detail-action-btn:hover{
      background:var(--vscode-button-secondaryHoverBackground);
      transform:translateY(-0.5px);
    }
    .detail-action-btn:active{transform:translateY(0)}
    .detail-action-btn.danger{
      color:var(--vscode-errorForeground,#f44);
    }
    .detail-action-btn.danger:hover{
      background:var(--vscode-inputValidation-errorBackground,rgba(255,60,60,.12));
    }

    /* ===== Empty State ===== */
    .empty-state{
      text-align:center;padding:40px 20px;
    }
    .empty-illustration{
      width:80px;height:80px;
      margin:0 auto 16px;
      border-radius:20px;
      background:var(--vscode-textBlockQuote-background,rgba(128,128,128,.06));
      display:flex;align-items:center;justify-content:center;
      font-size:36px;
      opacity:.5;
    }
    .empty-title{
      font-size:15px;font-weight:700;
      margin-bottom:8px;
      letter-spacing:-0.01em;
    }
    .empty-desc{
      font-size:12px;
      color:var(--vscode-descriptionForeground);
      margin-bottom:20px;
      line-height:1.6;
    }
    .empty-action{
      display:inline-flex;align-items:center;gap:7px;
      padding:9px 20px;border:none;
      background:var(--vscode-button-background);
      color:var(--vscode-button-foreground);
      border-radius:8px;cursor:pointer;
      font-size:12px;font-weight:600;font-family:inherit;
      transition:all .15s ease;
    }
    .empty-action:hover{
      background:var(--vscode-button-hoverBackground);
      transform:translateY(-1px);
      box-shadow:0 3px 12px rgba(0,0,0,.1);
    }
    .empty-action:active{transform:translateY(0)}

    /* ===== Loading ===== */
    .loading{
      display:flex;align-items:center;justify-content:center;
      padding:40px;gap:10px;
      color:var(--vscode-descriptionForeground);
      font-size:12px;
    }
    .spinner{
      width:18px;height:18px;
      border:2px solid var(--vscode-progressBar-background);
      border-top-color:transparent;
      border-radius:50%;
      animation:spin .7s linear infinite;
    }
    @keyframes spin{to{transform:rotate(360deg)}}

    /* ===== Auth badge ===== */
    .auth-badge{
      display:inline-flex;align-items:center;gap:4px;
      font-size:10px;font-weight:600;
      padding:2px 7px;
      border-radius:4px;
    }
    .auth-badge.configured{
      background:rgba(40,167,69,.12);
      color:var(--vscode-charts-green,#28a745);
    }
    .auth-badge.missing{
      background:rgba(255,193,7,.12);
      color:var(--vscode-charts-yellow,#ffc107);
    }

    /* ===== Stats Row ===== */
    .stats-row{
      display:flex;gap:6px;margin-bottom:14px;
    }
    .stat-card{
      flex:1;
      padding:10px 8px;
      background:var(--vscode-textBlockQuote-background,rgba(128,128,128,.04));
      border-radius:8px;
      text-align:center;
      border:1px solid var(--vscode-widget-border,var(--vscode-panel-border,rgba(128,128,128,.08)));
    }
    .stat-value{
      font-size:18px;font-weight:700;
      line-height:1.2;
      color:var(--vscode-foreground);
    }
    .stat-label{
      font-size:9px;font-weight:600;
      text-transform:uppercase;
      letter-spacing:.5px;
      color:var(--vscode-descriptionForeground);
      margin-top:2px;
      opacity:.7;
    }

    /* ===== Animations ===== */
    @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    @keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
    .fade-in{animation:fadeIn .25s ease}
    .slide-in{animation:slideIn .2s ease}

    /* Stagger children */
    .provider-card:nth-child(1){animation-delay:0s}
    .provider-card:nth-child(2){animation-delay:.03s}
    .provider-card:nth-child(3){animation-delay:.06s}
    .provider-card:nth-child(4){animation-delay:.09s}
    .provider-card:nth-child(5){animation-delay:.12s}
    .provider-card:nth-child(6){animation-delay:.15s}

    /* ===== Footer ===== */
    .footer{
      text-align:center;
      padding:20px 0 8px;
      font-size:10px;
      color:var(--vscode-descriptionForeground);
      opacity:.4;
      letter-spacing:.3px;
    }
    .footer a{color:var(--vscode-textLink-foreground);text-decoration:none}
    .footer a:hover{text-decoration:underline}

    /* ===== No Results ===== */
    .no-results{
      text-align:center;padding:24px 16px;
      color:var(--vscode-descriptionForeground);
      font-size:12px;
    }
    .no-results-icon{font-size:24px;opacity:.3;margin-bottom:8px}
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-top">
        <h2>
          Providers
          <span class="badge" id="providerCount">0</span>
        </h2>
        <div class="header-actions">
          <button class="icon-btn" data-tooltip="Refresh Models" onclick="postMessage('refreshOfficialModels')">&#x21BB;</button>
          <button class="icon-btn" data-tooltip="Settings" onclick="postMessage('openSettings')">&#x2699;</button>
        </div>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="stats-row" id="statsRow" style="display:none">
      <div class="stat-card">
        <div class="stat-value" id="statProviders">0</div>
        <div class="stat-label">Providers</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="statModels">0</div>
        <div class="stat-label">Models</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="statAuthed">0</div>
        <div class="stat-label">Authed</div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <button class="quick-action-btn primary" onclick="postMessage('addFromWellKnown')">
        <span class="icon">&#x2B;</span>
        Add Provider
      </button>
      <button class="quick-action-btn" onclick="postMessage('addManual')">
        <span class="icon">&#x270E;</span>
        Manual
      </button>
      <button class="quick-action-btn" onclick="postMessage('importConfig')">
        <span class="icon">&#x2B07;</span>
        Import
      </button>
    </div>

    <!-- Search -->
    <div class="search-wrap" id="searchWrap">
      <span class="search-icon">&#x1F50D;</span>
      <input class="search-input" id="searchInput" type="text" placeholder="Search providers or models..." />
      <button class="search-clear" id="searchClear" onclick="clearSearch()">&#x2715;</button>
    </div>

    <!-- Provider List -->
    <div id="providerList"></div>

    <!-- Footer -->
    <div class="footer">Unify Chat Provider</div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let providers = [];
    let expandedCards = new Set();

    function postMessage(command, data) {
      vscode.postMessage({ command, ...data });
    }

    // --- Provider color mapping ---
    const PROVIDER_COLORS = {
      'anthropic':              ['#D97706','#B45309'],
      'claude-code':            ['#D97706','#B45309'],
      'openai-chat-completion': ['#10A37F','#0D8C6B'],
      'openai-responses':       ['#10A37F','#0D8C6B'],
      'openai-codex':           ['#10A37F','#0D8C6B'],
      'google-ai-studio':       ['#4285F4','#3367D6'],
      'google-vertex-ai':       ['#4285F4','#3367D6'],
      'google-antigravity':     ['#4285F4','#3367D6'],
      'google-gemini-cli':      ['#4285F4','#3367D6'],
      'github-copilot':         ['#8B5CF6','#7C3AED'],
      'ollama':                 ['#0F766E','#0D6560'],
      'qwen-code':              ['#6366F1','#4F46E5'],
    };
    const PROVIDER_ICONS = {
      'anthropic':              'A',
      'claude-code':            'C',
      'openai-chat-completion': 'O',
      'openai-responses':       'O',
      'openai-codex':           'CX',
      'google-ai-studio':       'G',
      'google-vertex-ai':       'V',
      'google-antigravity':     'AG',
      'google-gemini-cli':      'GC',
      'github-copilot':         'GH',
      'ollama':                 'OL',
      'qwen-code':              'Q',
    };

    function getColor(type) {
      const c = PROVIDER_COLORS[type];
      return c ? c[0] : '#6B7280';
    }
    function getGradient(type) {
      const c = PROVIDER_COLORS[type];
      if (!c) return 'linear-gradient(135deg,#6B7280,#4B5563)';
      return 'linear-gradient(135deg,' + c[0] + ',' + c[1] + ')';
    }
    function getIcon(type) { return PROVIDER_ICONS[type] || '?'; }

    function getAuthLabel(provider) {
      if (!provider.auth) return { label: 'No Auth', status: 'missing' };
      const m = provider.auth.method;
      if (m === 'none') return { label: 'None', status: 'configured' };
      if (m === 'api-key') {
        const hasKey = !!provider.auth.apiKey;
        return { label: 'API Key', status: hasKey ? 'configured' : 'missing' };
      }
      return { label: m.replace(/-/g,' '), status: 'configured' };
    }

    function getModelName(m) {
      if (typeof m === 'string') return m;
      return m.name || m.id;
    }

    // --- Stats update ---
    function updateStats(list) {
      const statsRow = document.getElementById('statsRow');
      if (list.length === 0) {
        statsRow.style.display = 'none';
        return;
      }
      statsRow.style.display = 'flex';
      document.getElementById('statProviders').textContent = String(list.length);

      let totalModels = 0;
      let authedCount = 0;
      list.forEach(function(p) {
        totalModels += (p.models || []).length + (p.officialModelCount || 0);
        const auth = getAuthLabel(p);
        if (auth.status === 'configured') authedCount++;
      });
      document.getElementById('statModels').textContent = String(totalModels);
      document.getElementById('statAuthed').textContent = String(authedCount);
    }

    function renderProviders(list) {
      const el = document.getElementById('providerList');
      const countEl = document.getElementById('providerCount');
      countEl.textContent = String(list.length);
      updateStats(providers);

      if (!providers.length) {
        el.innerHTML =
          '<div class="empty-state fade-in">' +
            '<div class="empty-illustration">&#x1F680;</div>' +
            '<div class="empty-title">Get Started</div>' +
            '<div class="empty-desc">Add an API provider to start using<br>AI models in VS Code Chat.</div>' +
            '<button class="empty-action" onclick="postMessage(\'addFromWellKnown\')">' +
              '<span>&#x2B;</span> Add Your First Provider' +
            '</button>' +
          '</div>';
        return;
      }

      if (!list.length) {
        el.innerHTML =
          '<div class="no-results fade-in">' +
            '<div class="no-results-icon">&#x1F50E;</div>' +
            '<div>No matching providers found</div>' +
          '</div>';
        return;
      }

      // Group by category (General vs Experimental)
      const general = [];
      const experimental = [];
      const expTypes = new Set(['claude-code','google-antigravity','google-gemini-cli','github-copilot','qwen-code','openai-codex']);
      list.forEach(function(p) {
        if (expTypes.has(p.type)) experimental.push(p);
        else general.push(p);
      });

      let html = '';

      if (general.length) {
        if (experimental.length) {
          html += '<div class="section-label">General</div>';
        }
        general.forEach(function(p) { html += renderCard(p); });
      }
      if (experimental.length) {
        html += '<div class="section-label">Experimental</div>';
        experimental.forEach(function(p) { html += renderCard(p); });
      }

      el.innerHTML = html;
    }

    function renderCard(p) {
      const expanded = expandedCards.has(p.name);
      const auth = getAuthLabel(p);
      const modelCount = (p.models || []).length;
      const autoFetch = p.autoFetchOfficialModels ? ' + auto' : '';
      const officialCount = (p.officialModelCount || 0);

      const MAX_CHIPS = 6;
      let modelsHtml = '';
      if (p.models && p.models.length) {
        modelsHtml = '<div class="model-chip-list">';
        const displayModels = p.models.slice(0, MAX_CHIPS);
        displayModels.forEach(function(m) {
          const name = getModelName(m);
          modelsHtml +=
            '<span class="model-chip" title="' + escHtml(name) + '">' +
              '<span class="dot" style="background:' + getColor(p.type) + '"></span>' +
              escHtml(name) +
            '</span>';
        });
        if (p.models.length > MAX_CHIPS) {
          modelsHtml +=
            '<span class="model-chip more-chip">+' + (p.models.length - MAX_CHIPS) + ' more</span>';
        }
        modelsHtml += '</div>';
      } else {
        modelsHtml = '<div style="font-size:11px;color:var(--vscode-descriptionForeground);padding:4px 0;opacity:.7">' +
          'No models configured' + (p.autoFetchOfficialModels ? ' (auto-fetch enabled)' : '') + '</div>';
      }

      return (
        '<div class="provider-card fade-in' + (expanded ? ' expanded' : '') + '" data-name="' + escHtml(p.name) + '">' +
          '<div class="provider-card-header" onclick="toggleCard(\'' + escJs(p.name) + '\')">' +
            '<div class="provider-icon" style="background:' + getGradient(p.type) + '">' + escHtml(getIcon(p.type)) + '</div>' +
            '<div class="provider-info">' +
              '<div class="provider-name">' + escHtml(p.name) + '</div>' +
              '<div class="provider-meta">' +
                '<span class="provider-type-badge">' + escHtml(formatType(p.type)) + '</span>' +
                '<span class="model-count-label">' + modelCount + ' model' + (modelCount !== 1 ? 's' : '') + autoFetch + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="provider-actions">' +
              '<button class="icon-btn" data-tooltip="Edit" onclick="event.stopPropagation();postMessage(\'editProvider\',{name:\'' + escJs(p.name) + '\'})">&#x270E;</button>' +
              '<button class="icon-btn" data-tooltip="Duplicate" onclick="event.stopPropagation();postMessage(\'duplicateProvider\',{name:\'' + escJs(p.name) + '\'})">&#x2398;</button>' +
              '<button class="icon-btn" data-tooltip="Export" onclick="event.stopPropagation();postMessage(\'exportProvider\',{name:\'' + escJs(p.name) + '\'})">&#x21E7;</button>' +
              '<button class="icon-btn" data-tooltip="Delete" onclick="event.stopPropagation();postMessage(\'deleteProvider\',{name:\'' + escJs(p.name) + '\'})">&#x2715;</button>' +
            '</div>' +
            '<span class="provider-expand">&#x25B6;</span>' +
          '</div>' +
          '<div class="provider-detail">' +
            '<div class="provider-detail-inner">' +
              '<div class="detail-row">' +
                '<span class="detail-label">Base URL</span>' +
                '<span class="detail-value url">' + escHtml(p.baseUrl) + '</span>' +
              '</div>' +
              '<div class="detail-row">' +
                '<span class="detail-label">Auth</span>' +
                '<span class="detail-value">' +
                  '<span class="auth-badge ' + auth.status + '">' +
                    (auth.status === 'configured' ? '&#x2714; ' : '&#x26A0; ') + auth.label +
                  '</span>' +
                '</span>' +
              '</div>' +
              (p.autoFetchOfficialModels ?
                '<div class="detail-row">' +
                  '<span class="detail-label">Auto</span>' +
                  '<span class="detail-value"><span class="auth-badge configured">&#x2714; Auto-fetch (' + officialCount + ' models)</span></span>' +
                '</div>' : '') +
              '<div class="model-section-title">Models (' + modelCount + ')</div>' +
              modelsHtml +
              '<div class="detail-actions">' +
                '<button class="detail-action-btn" onclick="postMessage(\'manageModels\',{name:\'' + escJs(p.name) + '\'})">&#x2699; Manage</button>' +
                '<button class="detail-action-btn" onclick="postMessage(\'editProvider\',{name:\'' + escJs(p.name) + '\'})">&#x270E; Edit</button>' +
                '<button class="detail-action-btn" onclick="postMessage(\'exportProvider\',{name:\'' + escJs(p.name) + '\'})">&#x21E7; Export</button>' +
                '<button class="detail-action-btn danger" onclick="postMessage(\'deleteProvider\',{name:\'' + escJs(p.name) + '\'})">&#x2715; Delete</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }

    function formatType(type) {
      const map = {
        'openai-chat-completion': 'OpenAI',
        'openai-responses': 'OpenAI Resp',
        'openai-codex': 'Codex',
        'anthropic': 'Anthropic',
        'claude-code': 'Claude Code',
        'google-ai-studio': 'AI Studio',
        'google-vertex-ai': 'Vertex AI',
        'google-antigravity': 'Antigravity',
        'google-gemini-cli': 'Gemini CLI',
        'github-copilot': 'Copilot',
        'ollama': 'Ollama',
        'qwen-code': 'Qwen Code',
      };
      return map[type] || type;
    }

    function toggleCard(name) {
      if (expandedCards.has(name)) expandedCards.delete(name);
      else expandedCards.add(name);
      applyFilter();
    }

    function applyFilter() {
      const q = (document.getElementById('searchInput').value || '').toLowerCase().trim();
      const wrap = document.getElementById('searchWrap');
      if (q) {
        wrap.classList.add('has-value');
      } else {
        wrap.classList.remove('has-value');
      }

      let filtered = providers;
      if (q) {
        filtered = providers.filter(function(p) {
          if (p.name.toLowerCase().includes(q)) return true;
          if (p.type.toLowerCase().includes(q)) return true;
          if (p.baseUrl.toLowerCase().includes(q)) return true;
          if (p.models && p.models.some(function(m) { return getModelName(m).toLowerCase().includes(q); })) return true;
          return false;
        });
      }
      renderProviders(filtered);
    }

    function clearSearch() {
      document.getElementById('searchInput').value = '';
      applyFilter();
      document.getElementById('searchInput').focus();
    }

    // Search input handler
    document.getElementById('searchInput').addEventListener('input', applyFilter);

    // Listen for messages from extension
    window.addEventListener('message', function(event) {
      const msg = event.data;
      switch (msg.type) {
        case 'updateProviders':
          providers = msg.providers || [];
          applyFilter();
          break;
      }
    });

    // Escape helpers
    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function escJs(s) {
      return String(s).replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\\\'");
    }

    // Request initial data
    postMessage('ready');
  </script>
</body>
</html>`;
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
