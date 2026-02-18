/**
 * ═══════════════════════════════════════════════════════
 *  Oficina Digital — Módulo de Configurações
 *  Gerencia URLs dos microserviços
 * ═══════════════════════════════════════════════════════
 */
const SettingsModule = (() => {

    const render = () => {
        const urls = API.getUrls();
        return `
        <div class="panel-header">
            <h1><span class="accent-settings">●</span> Configurações</h1>
            <span class="service-tag">API Gateway & Service Discovery</span>
        </div>
        <div class="panel-grid">
            <div class="card">
                <h3>🌐 URLs da API</h3>
                <p class="form-hint">Configure os endereços dos microserviços (ou Gateway).</p>
                <div class="form-grid">
                    <div class="form-group">
                        <label>OS Service</label>
                        <input type="text" id="cfg-os-url" value="${urls.os}">
                    </div>
                    <div class="form-group">
                        <label>Billing Service</label>
                        <input type="text" id="cfg-billing-url" value="${urls.billing}">
                    </div>
                    <div class="form-group">
                        <label>Execution Service</label>
                        <input type="text" id="cfg-execution-url" value="${urls.execution}">
                    </div>
                    <div class="form-group">
                        <label>Customer Service</label>
                        <input type="text" id="cfg-customer-url" value="${urls.customer}">
                    </div>
                    <div class="form-group">
                        <label>Catalog Service</label>
                        <input type="text" id="cfg-catalog-url" value="${urls.catalog}">
                    </div>
                    <div class="form-group">
                        <label>People Service</label>
                        <input type="text" id="cfg-people-url" value="${urls.people}">
                    </div>
                </div>
                <div class="btn-row">
                    <button class="btn btn-primary" onclick="SettingsModule.save()">💾 Salvar Configurações</button>
                    <button class="btn btn-ghost" onclick="SettingsModule.reset()">🔄 Restaurar Padrões</button>
                </div>
            </div>

            <div class="card">
                <h3>🩺 Health Check</h3>
                <p class="form-hint">Verifica se os serviços estão online (via Actuator).</p>
                <div class="health-list">
                    <div class="health-item" id="health-os">
                        <span>OS Service</span>
                        <span class="health-status">...</span>
                    </div>
                    <div class="health-item" id="health-billing">
                        <span>Billing Service</span>
                        <span class="health-status">...</span>
                    </div>
                    <div class="health-item" id="health-execution">
                        <span>Execution Service</span>
                        <span class="health-status">...</span>
                    </div>
                    <div class="health-item" id="health-customer">
                        <span>Customer Service</span>
                        <span class="health-status">...</span>
                    </div>
                     <div class="health-item" id="health-catalog">
                        <span>Catalog Service</span>
                        <span class="health-status">...</span>
                    </div>
                     <div class="health-item" id="health-people">
                        <span>People Service</span>
                        <span class="health-status">...</span>
                    </div>
                </div>
                <button class="btn btn-secondary" onclick="SettingsModule.healthCheck()">💓 Verificar Status</button>
            </div>
        </div>
        `;
    };

    const val = (id) => document.getElementById(id)?.value?.trim() || '';

    const save = () => {
        const urls = {
            os: val('cfg-os-url'),
            billing: val('cfg-billing-url'),
            execution: val('cfg-execution-url'),
            customer: val('cfg-customer-url'),
            catalog: val('cfg-catalog-url'),
            people: val('cfg-people-url'),
        };
        API.setUrls(urls);
        API.toast('Configurações salvas!', 'success');
    };

    const reset = () => {
        API.resetUrls();
        // Re-render para atualizar valores
        document.getElementById('contentArea').innerHTML = render();
        API.toast('URLs resetadas para padrão.', 'info');
    };

    const healthCheck = async () => {
        const urls = API.getUrls();
        const checks = [
            { key: 'os', url: `${urls.os}/actuator/health`, el: 'health-os' },
            { key: 'billing', url: `${urls.billing}/actuator/health`, el: 'health-billing' },
            { key: 'execution', url: `${urls.execution}/actuator/health`, el: 'health-execution' },
            { key: 'customer', url: `${urls.customer}/actuator/health`, el: 'health-customer' },
            { key: 'catalog', url: `${urls.catalog}/actuator/health`, el: 'health-catalog' },
            { key: 'people', url: `${urls.people}/actuator/health`, el: 'health-people' },
        ];

        for (const check of checks) {
            const el = document.getElementById(check.el);
            if (!el) continue;
            const statusEl = el.querySelector('.health-status');
            el.classList.remove('up', 'down');
            statusEl.textContent = '🔄 ...';

            try {
                const res = await fetch(check.url, { signal: AbortSignal.timeout(5000) });
                if (res.ok) {
                    el.classList.add('up');
                    statusEl.textContent = '✅ UP';
                } else {
                    el.classList.add('down');
                    statusEl.textContent = `❌ ${res.status}`;
                }
            } catch {
                el.classList.add('down');
                statusEl.textContent = '❌ Offline';
            }
        }
    };

    return { render, save, reset, healthCheck };
})();
