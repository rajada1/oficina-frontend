/* ═══════════════════════════════════════════════════════
   Oficina Digital — Test Console Application
   ═══════════════════════════════════════════════════════ */

const App = (() => {
    // ──── Configuration ────
    const DEFAULT_URLS = {
        os: 'http://localhost:8081',
        billing: 'http://localhost:8082',
        execution: 'http://localhost:8083',
    };

    const getUrls = () => {
        try {
            return JSON.parse(localStorage.getItem('oficina-urls')) || { ...DEFAULT_URLS };
        } catch {
            return { ...DEFAULT_URLS };
        }
    };

    let consoleCount = 0;

    // ──── Utility Functions ────
    const uuid = () => crypto.randomUUID();

    const toast = (msg, type = 'info') => {
        const container = document.getElementById('toastContainer');
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.textContent = msg;
        container.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    };

    const badge = (status) =>
        `<span class="badge badge-${status || 'UNKNOWN'}">${status || '—'}</span>`;

    const formatDate = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

    const formatMoney = (v) =>
        v != null
            ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : '—';

    const val = (id) => document.getElementById(id)?.value?.trim() || '';

    // ──── HTTP Client with Console Logging ────
    const http = async (method, url, body = null) => {
        const start = performance.now();
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body && method !== 'GET') opts.body = JSON.stringify(body);

        let res, data, error;
        try {
            res = await fetch(url, opts);
            const text = await res.text();
            try { data = JSON.parse(text); } catch { data = text; }
        } catch (e) {
            error = e;
        }

        const elapsed = Math.round(performance.now() - start);
        logConsole(method, url, res?.status, elapsed, error);

        if (error) {
            toast(`Erro de conexão: ${error.message}`, 'error');
            throw error;
        }
        if (!res.ok) {
            const msg = typeof data === 'object' ? (data.message || data.error || JSON.stringify(data)) : data;
            toast(`${res.status}: ${msg}`, 'error');
        }
        return { status: res.status, data, ok: res.ok };
    };

    const logConsole = (method, url, status, ms, error) => {
        const entries = document.getElementById('consoleEntries');
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
        document.getElementById('consoleCount').textContent = consoleCount;
    };

    // ──── Renderers ────
    const renderOS = (os) => {
        if (!os) return '<p class="placeholder">Nenhum dado.</p>';
        return `
      <div class="result-card">
        <div class="result-header">
          <span class="result-id" onclick="navigator.clipboard.writeText('${os.id}')" title="Clique para copiar">${os.id}</span>
          ${badge(os.status)}
        </div>
        <div class="result-grid">
          <span class="result-label">Cliente ID</span>
          <span class="result-value">${os.clienteId || '—'}</span>
          <span class="result-label">Veículo ID</span>
          <span class="result-value">${os.veiculoId || '—'}</span>
          <span class="result-label">Problema</span>
          <span class="result-value">${os.descricaoProblema || '—'}</span>
          <span class="result-label">Criado em</span>
          <span class="result-value">${formatDate(os.dataCriacao || os.createdAt)}</span>
        </div>
      </div>
    `;
    };

    const renderOSList = (list) => {
        const items = list?.content || list || [];
        if (!Array.isArray(items) || items.length === 0)
            return '<p class="placeholder">Nenhuma OS encontrada.</p>';
        return items.map(renderOS).join('');
    };

    const renderOrcamento = (orc) => {
        if (!orc) return '<p class="placeholder">Nenhum dado.</p>';
        const itensHtml = (orc.itens || [])
            .map(
                (i) =>
                    `<span class="result-value">• ${i.descricao} — ${formatMoney(i.valor)} x${i.quantidade || 1}</span>`
            )
            .join('');
        return `
      <div class="result-card">
        <div class="result-header">
          <span class="result-id" onclick="navigator.clipboard.writeText('${orc.id}')" title="Copiar ID">${orc.id}</span>
          ${badge(orc.status)}
        </div>
        <div class="result-grid">
          <span class="result-label">OS ID</span>
          <span class="result-value">${orc.osId || '—'}</span>
          <span class="result-label">Valor Total</span>
          <span class="result-value">${formatMoney(orc.valorTotal)}</span>
          <span class="result-label">Observação</span>
          <span class="result-value">${orc.observacao || '—'}</span>
          <span class="result-label">Criado em</span>
          <span class="result-value">${formatDate(orc.dataCriacao || orc.createdAt)}</span>
        </div>
        ${itensHtml ? `<div style="margin-top:8px;">${itensHtml}</div>` : ''}
      </div>
    `;
    };

    const renderPagamento = (pag) => {
        if (!pag) return '<p class="placeholder">Nenhum dado.</p>';
        return `
      <div class="result-card">
        <div class="result-header">
          <span class="result-id" onclick="navigator.clipboard.writeText('${pag.id}')" title="Copiar ID">${pag.id}</span>
          ${badge(pag.status)}
        </div>
        <div class="result-grid">
          <span class="result-label">Orçamento ID</span>
          <span class="result-value">${pag.orcamentoId || '—'}</span>
          <span class="result-label">OS ID</span>
          <span class="result-value">${pag.osId || '—'}</span>
          <span class="result-label">Valor</span>
          <span class="result-value">${formatMoney(pag.valor)}</span>
          <span class="result-label">Forma</span>
          <span class="result-value">${pag.formaPagamento || '—'}</span>
          <span class="result-label">Mercado Pago ID</span>
          <span class="result-value">${pag.mercadoPagoPaymentId || pag.externalPaymentId || '—'}</span>
          <span class="result-label">Criado em</span>
          <span class="result-value">${formatDate(pag.dataCriacao || pag.createdAt)}</span>
        </div>
      </div>
    `;
    };

    const renderExecucao = (exec) => {
        if (!exec) return '<p class="placeholder">Nenhum dado.</p>';
        return `
      <div class="result-card">
        <div class="result-header">
          <span class="result-id" onclick="navigator.clipboard.writeText('${exec.id}')" title="Copiar ID">${exec.id}</span>
          ${badge(exec.status)}
        </div>
        <div class="result-grid">
          <span class="result-label">OS ID</span>
          <span class="result-value">${exec.osId || exec.ordemServicoId || '—'}</span>
          <span class="result-label">Orçamento ID</span>
          <span class="result-value">${exec.orcamentoId || '—'}</span>
          <span class="result-label">Mecânico</span>
          <span class="result-value">${exec.mecanicoResponsavel || exec.mecanico || '—'}</span>
          <span class="result-label">Início</span>
          <span class="result-value">${formatDate(exec.dataInicio)}</span>
          <span class="result-label">Fim</span>
          <span class="result-value">${formatDate(exec.dataFim)}</span>
        </div>
      </div>
    `;
    };

    const renderExecList = (list) => {
        const items = list?.content || list || [];
        if (!Array.isArray(items) || items.length === 0)
            return '<p class="placeholder">Nenhuma execução encontrada.</p>';
        return items.map(renderExecucao).join('');
    };

    // ──── Navigation ────
    const initNav = () => {
        document.querySelectorAll('.nav-item[data-panel]').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
                const panel = document.getElementById(`panel-${btn.dataset.panel}`);
                if (panel) panel.classList.add('active');
            });
        });
    };

    // ──── OS Service Module ────
    const OS = {
        generateUUID(inputId) {
            document.getElementById(inputId).value = uuid();
        },

        async criar() {
            const urls = getUrls();
            const body = {
                clienteId: val('os-clienteId') || uuid(),
                veiculoId: val('os-veiculoId') || uuid(),
                descricaoProblema: val('os-descricao') || 'Problema genérico para teste',
            };
            const r = await http('POST', `${urls.os}/api/v1/ordens-servico`, body);
            if (r.ok) toast('OS criada com sucesso!', 'success');
            document.getElementById('os-results').innerHTML = renderOS(r.data);
        },

        async buscarPorId() {
            const id = val('os-searchId');
            if (!id) return toast('Informe o ID da OS', 'error');
            const urls = getUrls();
            const r = await http('GET', `${urls.os}/api/v1/ordens-servico/${id}`);
            document.getElementById('os-results').innerHTML = renderOS(r.data);
        },

        async listarTodas() {
            const urls = getUrls();
            const r = await http('GET', `${urls.os}/api/v1/ordens-servico`);
            document.getElementById('os-results').innerHTML = renderOSList(r.data);
        },

        async buscarPorStatus() {
            const status = val('os-filterStatus');
            if (!status) return toast('Selecione um status', 'error');
            const urls = getUrls();
            const r = await http('GET', `${urls.os}/api/v1/ordens-servico/status/${status}`);
            document.getElementById('os-results').innerHTML = renderOSList(r.data);
        },

        async atualizarStatus(id, novoStatus) {
            if (!id) return toast('Informe o ID da OS', 'error');
            const urls = getUrls();
            const r = await http('PUT', `${urls.os}/api/v1/ordens-servico/${id}/status`, {
                novoStatus,
                observacao: 'Atualização via console de teste',
                usuarioAlteracao: 'test-console',
            });
            if (r.ok) toast(`Status atualizado para ${novoStatus}`, 'success');
            return r;
        },
    };

    // ──── Billing Service Module ────
    const Billing = {
        switchTab(tab) {
            document.querySelectorAll('.sub-tab').forEach((t) => t.classList.remove('active'));
            document.querySelector(`.sub-tab[data-subtab="${tab}"]`).classList.add('active');
            document.querySelectorAll('.sub-panel').forEach((p) => p.classList.remove('active'));
            document.getElementById(`subtab-${tab}`).classList.add('active');
        },

        addItem() {
            const container = document.getElementById('orc-items');
            const row = document.createElement('div');
            row.className = 'item-row';
            row.innerHTML = `
        <input type="text" placeholder="Descrição" class="item-desc">
        <input type="number" placeholder="Valor" class="item-valor" step="0.01">
        <input type="number" placeholder="Qtd" class="item-qty" value="1" min="1">
        <button class="btn-icon btn-remove" onclick="this.parentElement.remove()">✕</button>
      `;
            container.appendChild(row);
        },

        async criarOrcamento() {
            const urls = getUrls();
            const rows = document.querySelectorAll('#orc-items .item-row');
            const itens = [];
            rows.forEach((row) => {
                const desc = row.querySelector('.item-desc').value.trim();
                const valor = parseFloat(row.querySelector('.item-valor').value) || 0;
                const qty = parseInt(row.querySelector('.item-qty').value) || 1;
                if (desc && valor > 0) itens.push({ descricao: desc, valor, quantidade: qty });
            });
            if (itens.length === 0) {
                itens.push({ descricao: 'Serviço de teste', valor: 150.0, quantidade: 1 });
            }
            const body = {
                osId: val('orc-osId') || uuid(),
                itens,
                observacao: val('orc-observacao') || null,
            };
            const r = await http('POST', `${urls.billing}/api/v1/orcamentos`, body);
            if (r.ok) toast('Orçamento criado!', 'success');
            document.getElementById('orc-results').innerHTML = renderOrcamento(r.data);
        },

        _lastOrcId: null,

        async buscarOrcamento() {
            const id = val('orc-searchId');
            if (!id) return toast('Informe o ID do orçamento', 'error');
            const urls = getUrls();
            const r = await http('GET', `${urls.billing}/api/v1/orcamentos/${id}`);
            document.getElementById('orc-results').innerHTML = renderOrcamento(r.data);
            if (r.ok) {
                Billing._lastOrcId = id;
                document.getElementById('orc-actions').style.display = 'flex';
            }
        },

        async aprovarOrcamento() {
            const id = val('orc-searchId') || Billing._lastOrcId;
            if (!id) return toast('Busque um orçamento primeiro', 'error');
            const urls = getUrls();
            const r = await http('PUT', `${urls.billing}/api/v1/orcamentos/${id}/aprovar`);
            if (r.ok) toast('Orçamento aprovado!', 'success');
            document.getElementById('orc-results').innerHTML = renderOrcamento(r.data);
        },

        async rejeitarOrcamento() {
            const id = val('orc-searchId') || Billing._lastOrcId;
            if (!id) return toast('Busque um orçamento primeiro', 'error');
            const urls = getUrls();
            const motivo = prompt('Motivo da rejeição (opcional):') || '';
            const r = await http('PUT', `${urls.billing}/api/v1/orcamentos/${id}/rejeitar?motivo=${encodeURIComponent(motivo)}`);
            if (r.ok) toast('Orçamento rejeitado.', 'success');
            document.getElementById('orc-results').innerHTML = renderOrcamento(r.data);
        },

        async cancelarOrcamento() {
            const id = val('orc-searchId') || Billing._lastOrcId;
            if (!id) return toast('Busque um orçamento primeiro', 'error');
            const urls = getUrls();
            const r = await http('DELETE', `${urls.billing}/api/v1/orcamentos/${id}`);
            if (r.ok) toast('Orçamento cancelado.', 'success');
            document.getElementById('orc-results').innerHTML = '<p class="placeholder">Orçamento cancelado.</p>';
        },

        async registrarPagamento() {
            const urls = getUrls();
            const body = {
                orcamentoId: val('pag-orcamentoId') || uuid(),
                osId: val('pag-osId') || uuid(),
                valor: parseFloat(val('pag-valor')) || 100.0,
                formaPagamento: val('pag-forma') || 'PIX',
                comprovante: null,
                payerEmail: val('pag-email') || 'test@example.com',
            };
            const r = await http('POST', `${urls.billing}/api/v1/pagamentos`, body);
            if (r.ok) toast('Pagamento registrado!', 'success');
            document.getElementById('pag-results').innerHTML = renderPagamento(r.data);
        },

        async confirmarPagamento() {
            const id = val('pag-actionId');
            if (!id) return toast('Informe o ID do pagamento', 'error');
            const urls = getUrls();
            const r = await http('PUT', `${urls.billing}/api/v1/pagamentos/${id}/confirmar`);
            if (r.ok) toast('Pagamento confirmado!', 'success');
            document.getElementById('pag-results').innerHTML = renderPagamento(r.data);
        },

        async estornarPagamento() {
            const id = val('pag-actionId');
            if (!id) return toast('Informe o ID do pagamento', 'error');
            const urls = getUrls();
            const motivo = val('pag-motivo');
            let url = `${urls.billing}/api/v1/pagamentos/${id}/estornar`;
            if (motivo) url += `?motivo=${encodeURIComponent(motivo)}`;
            const r = await http('PUT', url);
            if (r.ok) toast('Pagamento estornado.', 'success');
            document.getElementById('pag-results').innerHTML = renderPagamento(r.data);
        },

        async cancelarPagamento() {
            const id = val('pag-actionId');
            if (!id) return toast('Informe o ID do pagamento', 'error');
            const urls = getUrls();
            const r = await http('DELETE', `${urls.billing}/api/v1/pagamentos/${id}`);
            if (r.ok) toast('Pagamento cancelado.', 'success');
            document.getElementById('pag-results').innerHTML = '<p class="placeholder">Pagamento cancelado.</p>';
        },

        async simularWebhook() {
            const paymentId = val('webhook-paymentId');
            if (!paymentId) return toast('Informe o Payment ID do Mercado Pago', 'error');
            const urls = getUrls();
            const body = {
                action: 'payment.updated',
                type: 'payment',
                data: { id: paymentId },
            };
            const r = await http('POST', `${urls.billing}/api/v1/pagamentos/webhook`, body);
            if (r.ok) toast('Webhook simulado com sucesso!', 'success');
            document.getElementById('pag-results').innerHTML =
                '<div class="result-card"><div class="result-grid"><span class="result-label">Webhook</span><span class="result-value">Enviado ✅</span><span class="result-label">Payment ID</span><span class="result-value">' +
                paymentId +
                '</span></div></div>';
        },
    };

    // ──── Execution Service Module ────
    const Execution = {
        async criar() {
            const urls = getUrls();
            const body = {
                osId: val('exec-osId') || uuid(),
                orcamentoId: val('exec-orcamentoId') || uuid(),
                mecanicoResponsavel: val('exec-mecanico') || 'Mecânico Teste',
            };
            const r = await http('POST', `${urls.execution}/api/v1/execucoes-os`, body);
            if (r.ok) toast('Execução criada!', 'success');
            document.getElementById('exec-results').innerHTML = renderExecucao(r.data);
        },

        async buscarPorId() {
            const id = val('exec-searchId');
            if (!id) return toast('Informe o ID da execução', 'error');
            const urls = getUrls();
            const r = await http('GET', `${urls.execution}/api/v1/execucoes-os/${id}`);
            document.getElementById('exec-results').innerHTML = renderExecucao(r.data);
        },

        async buscarPorOsId() {
            const osId = val('exec-searchOsId');
            if (!osId) return toast('Informe o OS ID', 'error');
            const urls = getUrls();
            const r = await http('GET', `${urls.execution}/api/v1/execucoes-os/os/${osId}`);
            document.getElementById('exec-results').innerHTML = renderExecList(r.data);
        },

        async listarTodas() {
            const urls = getUrls();
            const r = await http('GET', `${urls.execution}/api/v1/execucoes-os`);
            document.getElementById('exec-results').innerHTML = renderExecList(r.data);
        },

        async buscarPorStatus() {
            const status = val('exec-filterStatus');
            if (!status) return toast('Selecione um status', 'error');
            const urls = getUrls();
            const r = await http('GET', `${urls.execution}/api/v1/execucoes-os/status/${status}`);
            document.getElementById('exec-results').innerHTML = renderExecList(r.data);
        },

        async buscarPorMecanico() {
            const nome = val('exec-searchMecanico');
            if (!nome) return toast('Informe o nome do mecânico', 'error');
            const urls = getUrls();
            const r = await http('GET', `${urls.execution}/api/v1/execucoes-os/mecanico/${encodeURIComponent(nome)}`);
            document.getElementById('exec-results').innerHTML = renderExecList(r.data);
        },

        async iniciar() {
            const id = val('exec-actionId');
            if (!id) return toast('Informe o ID da execução', 'error');
            const urls = getUrls();
            const r = await http('PUT', `${urls.execution}/api/v1/execucoes-os/${id}/iniciar`);
            if (r.ok) toast('Execução iniciada!', 'success');
            document.getElementById('exec-results').innerHTML = renderExecucao(r.data);
        },

        async finalizar() {
            const id = val('exec-actionId');
            if (!id) return toast('Informe o ID da execução', 'error');
            const urls = getUrls();
            const obs = val('exec-obs');
            let url = `${urls.execution}/api/v1/execucoes-os/${id}/finalizar`;
            if (obs) url += `?observacoes=${encodeURIComponent(obs)}`;
            const r = await http('PUT', url);
            if (r.ok) toast('Execução finalizada!', 'success');
            document.getElementById('exec-results').innerHTML = renderExecucao(r.data);
        },

        async cancelar() {
            const id = val('exec-actionId');
            if (!id) return toast('Informe o ID da execução', 'error');
            const urls = getUrls();
            const motivo = val('exec-obs');
            let url = `${urls.execution}/api/v1/execucoes-os/${id}/cancelar`;
            if (motivo) url += `?motivo=${encodeURIComponent(motivo)}`;
            const r = await http('PUT', url);
            if (r.ok) toast('Execução cancelada.', 'success');
            document.getElementById('exec-results').innerHTML = renderExecucao(r.data);
        },

        async deletar() {
            const id = val('exec-actionId');
            if (!id) return toast('Informe o ID da execução', 'error');
            const urls = getUrls();
            const r = await http('DELETE', `${urls.execution}/api/v1/execucoes-os/${id}`);
            if (r.ok) toast('Execução deletada.', 'success');
            document.getElementById('exec-results').innerHTML = '<p class="placeholder">Execução deletada.</p>';
        },
    };

    // ──── Saga Flow Module ────
    const Saga = {
        _state: {},

        _logEntry(msg, type = 'info') {
            const log = document.getElementById('saga-log');
            if (log.querySelector('.placeholder')) log.innerHTML = '';
            const entry = document.createElement('div');
            entry.className = `saga-log-entry ${type}`;
            entry.textContent = `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`;
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;
        },

        _setStep(n, state) {
            const step = document.getElementById(`saga-step-${n}`);
            step.classList.remove('active', 'done', 'error');
            if (state) step.classList.add(state);
            const statusEl = step.querySelector('.saga-status');
            if (state === 'active') statusEl.textContent = '🔄 Executando...';
            else if (state === 'done') statusEl.textContent = '✅ Concluído';
            else if (state === 'error') statusEl.textContent = '❌ Erro';
            else statusEl.textContent = '⏳ Pendente';
        },

        resetar() {
            Saga._state = {};
            for (let i = 1; i <= 6; i++) Saga._setStep(i, null);
            document.getElementById('saga-log').innerHTML =
                '<p class="placeholder">Execute o fluxo para ver os logs aqui.</p>';
            toast('Saga resetado.', 'info');
        },

        async executarFluxoCompleto() {
            Saga.resetar();
            const urls = getUrls();
            const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

            try {
                // Step 1: Criar OS
                Saga._setStep(1, 'active');
                Saga._logEntry('Criando Ordem de Serviço...', 'info');
                const osBody = {
                    clienteId: uuid(),
                    veiculoId: uuid(),
                    descricaoProblema: 'Fluxo completo de teste via Saga',
                };
                const osRes = await http('POST', `${urls.os}/api/v1/ordens-servico`, osBody);
                if (!osRes.ok) throw new Error('Falha ao criar OS');
                Saga._state.osId = osRes.data.id;
                Saga._logEntry(`OS criada: ${osRes.data.id}`, 'success');
                Saga._setStep(1, 'done');
                await sleep(500);

                // Step 2: Criar Orçamento
                Saga._setStep(2, 'active');
                Saga._logEntry('Criando Orçamento...', 'info');
                const orcBody = {
                    osId: Saga._state.osId,
                    itens: [
                        { descricao: 'Troca de óleo', valor: 120.0, quantidade: 1 },
                        { descricao: 'Filtro de ar', valor: 80.0, quantidade: 1 },
                    ],
                    observacao: 'Orçamento gerado pelo fluxo Saga',
                };
                const orcRes = await http('POST', `${urls.billing}/api/v1/orcamentos`, orcBody);
                if (!orcRes.ok) throw new Error('Falha ao criar orçamento');
                Saga._state.orcId = orcRes.data.id;
                Saga._logEntry(`Orçamento criado: ${orcRes.data.id} — Total: ${formatMoney(orcRes.data.valorTotal)}`, 'success');
                Saga._setStep(2, 'done');
                await sleep(500);

                // Step 3: Aprovar Orçamento
                Saga._setStep(3, 'active');
                Saga._logEntry('Aprovando orçamento...', 'info');
                const aprRes = await http('PUT', `${urls.billing}/api/v1/orcamentos/${Saga._state.orcId}/aprovar`);
                if (!aprRes.ok) throw new Error('Falha ao aprovar orçamento');
                Saga._logEntry('Orçamento aprovado!', 'success');
                Saga._setStep(3, 'done');
                await sleep(500);

                // Step 4: Registrar Pagamento
                Saga._setStep(4, 'active');
                Saga._logEntry('Registrando pagamento...', 'info');
                const pagBody = {
                    orcamentoId: Saga._state.orcId,
                    osId: Saga._state.osId,
                    valor: orcRes.data.valorTotal || 200.0,
                    formaPagamento: 'PIX',
                    comprovante: null,
                    payerEmail: 'saga-test@oficina.com',
                };
                const pagRes = await http('POST', `${urls.billing}/api/v1/pagamentos`, pagBody);
                if (!pagRes.ok) throw new Error('Falha ao registrar pagamento');
                Saga._state.pagId = pagRes.data.id;
                Saga._logEntry(`Pagamento registrado: ${pagRes.data.id}`, 'success');

                // Confirmar pagamento
                Saga._logEntry('Confirmando pagamento...', 'info');
                const confRes = await http('PUT', `${urls.billing}/api/v1/pagamentos/${Saga._state.pagId}/confirmar`);
                if (!confRes.ok) throw new Error('Falha ao confirmar pagamento');
                Saga._logEntry('Pagamento confirmado!', 'success');
                Saga._setStep(4, 'done');
                await sleep(500);

                // Step 5: Criar e Executar
                Saga._setStep(5, 'active');
                Saga._logEntry('Criando execução...', 'info');
                const execBody = {
                    osId: Saga._state.osId,
                    orcamentoId: Saga._state.orcId,
                    mecanicoResponsavel: 'João Silva (Saga)',
                };
                const execRes = await http('POST', `${urls.execution}/api/v1/execucoes-os`, execBody);
                if (!execRes.ok) throw new Error('Falha ao criar execução');
                Saga._state.execId = execRes.data.id;
                Saga._logEntry(`Execução criada: ${execRes.data.id}`, 'success');

                Saga._logEntry('Iniciando execução...', 'info');
                const iniRes = await http('PUT', `${urls.execution}/api/v1/execucoes-os/${Saga._state.execId}/iniciar`);
                if (!iniRes.ok) throw new Error('Falha ao iniciar execução');
                Saga._logEntry('Execução iniciada!', 'success');

                Saga._logEntry('Finalizando execução...', 'info');
                const finRes = await http('PUT', `${urls.execution}/api/v1/execucoes-os/${Saga._state.execId}/finalizar`);
                if (!finRes.ok) throw new Error('Falha ao finalizar execução');
                Saga._logEntry('Execução finalizada!', 'success');
                Saga._setStep(5, 'done');
                await sleep(500);

                // Step 6: Entrega (atualizar status da OS)
                Saga._setStep(6, 'active');
                Saga._logEntry('Finalizando OS...', 'info');
                await OS.atualizarStatus(Saga._state.osId, 'FINALIZADA');
                Saga._logEntry('OS finalizada!', 'success');
                await sleep(300);
                Saga._logEntry('Entregando veículo...', 'info');
                await OS.atualizarStatus(Saga._state.osId, 'ENTREGUE');
                Saga._logEntry('Veículo entregue! Fluxo completo concluído ✅', 'success');
                Saga._setStep(6, 'done');

                toast('🎉 Fluxo Saga completo!', 'success');
            } catch (err) {
                Saga._logEntry(`ERRO: ${err.message}`, 'error');
                toast('Saga interrompido por erro. Veja o log.', 'error');
            }
        },
    };

    // ──── Settings Module ────
    const Settings = {
        init() {
            const urls = getUrls();
            document.getElementById('cfg-os-url').value = urls.os;
            document.getElementById('cfg-billing-url').value = urls.billing;
            document.getElementById('cfg-execution-url').value = urls.execution;
        },

        save() {
            const urls = {
                os: val('cfg-os-url') || DEFAULT_URLS.os,
                billing: val('cfg-billing-url') || DEFAULT_URLS.billing,
                execution: val('cfg-execution-url') || DEFAULT_URLS.execution,
            };
            localStorage.setItem('oficina-urls', JSON.stringify(urls));
            toast('Configurações salvas!', 'success');
        },

        reset() {
            localStorage.removeItem('oficina-urls');
            Settings.init();
            toast('URLs resetadas para padrão.', 'info');
        },

        async healthCheck() {
            const urls = getUrls();
            const checks = [
                { key: 'os', url: `${urls.os}/actuator/health`, el: 'health-os' },
                { key: 'billing', url: `${urls.billing}/actuator/health`, el: 'health-billing' },
                { key: 'execution', url: `${urls.execution}/actuator/health`, el: 'health-execution' },
            ];

            for (const check of checks) {
                const el = document.getElementById(check.el);
                const statusEl = el.querySelector('.health-status');
                el.classList.remove('up', 'down');
                statusEl.textContent = '...';

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
        },
    };

    // ──── Console Module ────
    const Console = {
        toggle() {
            const console = document.getElementById('httpConsole');
            const main = document.querySelector('.main-content');
            console.classList.toggle('collapsed');
            main.classList.toggle('console-hidden');
        },

        clear() {
            document.getElementById('consoleEntries').innerHTML =
                '<p class="placeholder">As requisições HTTP aparecerão aqui.</p>';
            consoleCount = 0;
            document.getElementById('consoleCount').textContent = '0';
        },
    };

    // ──── Init ────
    document.addEventListener('DOMContentLoaded', () => {
        initNav();
        Settings.init();
        // Toggle console on sidebar button click
        document.getElementById('toggleConsole').addEventListener('click', Console.toggle);
    });

    return { OS, Billing, Execution, Saga, Settings, Console };
})();
