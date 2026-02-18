/**
 * ═══════════════════════════════════════════════════════
 *  Oficina Digital — API Client Module
 *  Gerencia configuração de URLs, HTTP requests, logging
 *  e Helpers para resolução de IDs (Cache)
 * ═══════════════════════════════════════════════════════
 */
const API = (() => {
    const GATEWAY_URL = 'http://localhost:8080';

    const DEFAULT_URLS = {
        os: GATEWAY_URL,
        billing: GATEWAY_URL,
        execution: GATEWAY_URL,
        customer: GATEWAY_URL,
        catalog: GATEWAY_URL,
        people: GATEWAY_URL,
    };

    const DIRECT_URLS = {
        os: 'http://localhost:8081',
        billing: 'http://localhost:8082',
        execution: 'http://localhost:8083',
        customer: 'http://localhost:8084',
        catalog: 'http://localhost:8085',
        people: 'http://localhost:8086',
    };

    // Cache simples em memória para evitar requests repetidos de nomes
    const cache = new Map();
    let consoleCount = 0;

    // ── Configuração ──
    const getUrls = () => {
        try {
            const stored = JSON.parse(localStorage.getItem('oficina-urls'));
            return { ...DEFAULT_URLS, ...stored };
        } catch {
            return { ...DEFAULT_URLS };
        }
    };

    const setUrls = (urls) => {
        localStorage.setItem('oficina-urls', JSON.stringify(urls));
    };

    const resetUrls = () => {
        localStorage.removeItem('oficina-urls');
    };

    // ── Utilitários ──
    const uuid = () => crypto.randomUUID();

    const formatId = (id) => {
        if (!id) return '—';
        return id.substring(0, 8);
    };

    const formatDate = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

    const formatMoney = (v) =>
        v != null
            ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : '—';

    // ── Toast Notifications ──
    const toast = (msg, type = 'info') => {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.innerHTML = `<span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span><span>${msg}</span>`;
        container.appendChild(el);
        setTimeout(() => {
            el.classList.add('toast-exit');
            setTimeout(() => el.remove(), 300);
        }, 4000);
    };

    // ── HTTP Client ──
    const http = async (method, url, body = null) => {
        const start = performance.now();
        const headers = { 'Content-Type': 'application/json' };

        // Injetar Bearer token se autenticado
        if (typeof AuthModule !== 'undefined' && AuthModule.isAuthenticated()) {
            const token = AuthModule.getToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }

        const opts = { method, headers };
        if (body && method !== 'GET') opts.body = JSON.stringify(body);

        let res, data = null, error = null;
        try {
            res = await fetch(url, opts);
            const text = await res.text();
            try { data = JSON.parse(text); } catch { data = text; }
        } catch (e) {
            error = e;
        }

        const elapsed = Math.round(performance.now() - start);
        logConsole(method, url, res?.status, elapsed, error, body, data);

        if (error) {
            toast(`Erro de conexão: ${error.message}`, 'error');
            throw error; // Re-throw para chamador tratar se quiser
        }

        // Log de erro de API (exceto 404 que às vezes é esperado)
        if (!res.ok && res.status !== 404) {
            const msg = typeof data === 'object'
                ? (data.message || data.error || JSON.stringify(data))
                : data;
            toast(`${res.status}: ${msg}`, 'error');
        }

        return { status: res.status, data, ok: res.ok };
    };

    // ── Resolvers (Cache + Fetch) ──

    const resolveName = async (service, endpoint, id, field = 'nome') => {
        if (!id) return '—';
        const cacheKey = `${service}:${endpoint}:${id}`;
        if (cache.get(cacheKey)) return cache.get(cacheKey);

        const urls = getUrls();
        // Ex: http://localhost:8084/api/v1/clientes/123
        const url = `${urls[service]}/api/v1/${endpoint}/${id}`;

        try {
            // Nota: usamos fetch direto para não gerar spam no console e toasts
            const headers = {};
            if (typeof AuthModule !== 'undefined' && AuthModule.isAuthenticated()) {
                headers['Authorization'] = `Bearer ${AuthModule.getToken()}`;
            }
            const res = await fetch(url, { headers });
            if (res.ok) {
                const data = await res.json();
                const result = data[field] || id; // Fallback pro ID
                cache.set(cacheKey, result);
                return result;
            }
        } catch (e) {
            console.warn(`Falha ao resolver ${endpoint} ${id}`, e);
        }
        return formatId(id); // Retorna ID curto se falhar
    };

    const getClienteNome = (id) => resolveName('customer', 'clientes', id, 'nome');
    const getVeiculoPlaca = (id) => resolveName('customer', 'veiculos', id, 'placa');
    const getPessoaNome = (id) => resolveName('people', 'pessoas', id, 'nome');
    const getServicoDesc = (id) => resolveName('catalog', 'servicos', id, 'descricao');
    const getPecaNome = (id) => resolveName('catalog', 'pecas', id, 'nome');

    // ── Console HTTP Logging ──
    const logConsole = (method, url, status, ms, error, reqBody, resData) => {
        const entries = document.getElementById('consoleEntries');
        if (!entries) return;
        if (entries.querySelector('.placeholder')) entries.innerHTML = '';

        const statusClass = error ? 's5xx' : status < 300 ? 's2xx' : status < 500 ? 's4xx' : 's5xx';
        const pathOnly = url.replace(/https?:\/\/[^/]+/, '');

        const entry = document.createElement('div');
        entry.className = 'console-entry';
        entry.innerHTML = `
            <span class="console-method method-${method}">${method}</span>
            <span class="console-status ${statusClass}">${error ? 'ERR' : status}</span>
            <span class="console-url" title="${url}">${pathOnly}</span>
            <span class="console-time">${ms}ms</span>
        `;
        entries.prepend(entry);
        consoleCount++;
        const countEl = document.getElementById('consoleCount');
        if (countEl) countEl.textContent = consoleCount;
    };

    const clearConsole = () => {
        const entries = document.getElementById('consoleEntries');
        if (entries) entries.innerHTML = '<p class="placeholder">As requisições HTTP aparecerão aqui.</p>';
        consoleCount = 0;
        const countEl = document.getElementById('consoleCount');
        if (countEl) countEl.textContent = '0';
    };

    const toggleConsole = () => {
        const consoleEl = document.getElementById('httpConsole');
        const main = document.querySelector('.main-content');
        if (consoleEl) consoleEl.classList.toggle('collapsed');
        if (main) main.classList.toggle('console-hidden');
    };

    return {
        DEFAULT_URLS, DIRECT_URLS, GATEWAY_URL,
        getUrls, setUrls, resetUrls,
        uuid, formatId, formatDate, formatMoney,
        toast, http,
        getClienteNome, getVeiculoPlaca, getPessoaNome, getServicoDesc, getPecaNome,
        clearConsole, toggleConsole,
    };
})();
