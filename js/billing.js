/**
 * ═══════════════════════════════════════════════════════
 *  Oficina Digital — Módulo de Faturamento
 *  Orçamentos e Pagamentos (Billing Service :8082)
 * ═══════════════════════════════════════════════════════
 */
const Billing = (() => {
    let _orcCache = [];
    let _pagCache = [];
    let _lastOrcId = null;
    let _lastPagId = null;

    // render ... (kept as is in file, updated previously)

    const switchTab = (tab) => {
        document.querySelectorAll('#contentArea .sub-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`#contentArea .sub-tab[data-subtab="${tab}"]`)?.classList.add('active');
        document.querySelectorAll('#contentArea .sub-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`subtab-${tab}`)?.classList.add('active');

        if (tab === 'orcamentos') listarOrcamentos();
        if (tab === 'pagamentos') listarPagamentos();
    };

    const val = (id) => document.getElementById(id)?.value?.trim() || '';

    // ── Renderizadores ──
    const renderOrcamento = async (orc) => {
        if (!orc) return '<p class="placeholder">Nenhum dado.</p>';
        const orcStatusStr = String(orc.status || 'UNKNOWN');
        const itensHtml = (orc.itens || [])
            .map(i => `<span class="result-value">• ${i.descricao} — ${API.formatMoney(i.valor)} x${i.quantidade || 1}</span>`)
            .join('');

        return `
            <div class="result-card" data-id="${orc.id}" title="ID: ${orc.id}">
                <div class="result-header">
                    <span class="badge badge-${orcStatusStr}">${orcStatusStr.replace(/_/g, ' ')}</span>
                    <span class="text-muted text-sm" style="margin-left: auto;">${API.formatDate(orc.dataCriacao || orc.createdAt)}</span>
                </div>
                <div class="result-grid">
                    <span class="result-label">Valor Total</span>
                    <span class="result-value font-bold">${API.formatMoney(orc.valorTotal)}</span>
                    <span class="result-label">Observação</span>
                    <span class="result-value" style="grid-column: span 3;">${orc.observacao || '—'}</span>
                </div>
                ${itensHtml ? `<div class="result-items">${itensHtml}</div>` : ''}
                <div class="result-actions">
                    ${orcStatusStr === 'PENDENTE' ? `
                        <button class="btn btn-success btn-sm" onclick="Billing.aprovarOrcamentoPorId('${orc.id}')">✅ Aprovar</button>
                        <button class="btn btn-warning btn-sm" onclick="Billing.rejeitarOrcamentoPorId('${orc.id}')">❌ Rejeitar</button>
                        <button class="btn btn-danger btn-sm" onclick="Billing.cancelarOrcamentoPorId('${orc.id}')">🗑 Cancelar</button>
                    ` : ''}
                    ${orcStatusStr === 'APROVADO' ? `<button class="btn btn-secondary btn-sm" onclick="Billing.criarPagamentoPara('${orc.id}','${orc.osId}','${orc.valorTotal}')">💳 Pagar</button>` : ''}
                </div>
            </div>
        `;
    };

    const renderPagamento = async (pag) => {
        if (!pag) return '<p class="placeholder">Nenhum dado.</p>';

        const hasLink = pag.initPoint;
        const statusEmoji = {
            'PENDENTE': '⏳',
            'PROCESSANDO': '🔄',
            'CONFIRMADO': '✅',
            'ESTORNADO': '↩️',
            'CANCELADO': '❌',
        };
        const statusStr = String(pag.status || 'UNKNOWN');
        const emoji = statusEmoji[statusStr] || '❓';
        const formaStr = String(pag.formaPagamento || '—');

        return `
            <div class="result-card" data-id="${pag.id}">
                <div class="result-header">
                    <span class="badge badge-${statusStr}">${emoji} ${statusStr.replace(/_/g, ' ')}</span>
                    <span class="text-muted text-sm" style="margin-left: auto;">${API.formatDate(pag.dataCriacao || pag.createdAt)}</span>
                </div>
                <div class="result-grid">
                    <span class="result-label">Valor</span>
                    <span class="result-value font-bold">${API.formatMoney(pag.valor)}</span>
                    <span class="result-label">Forma</span>
                    <span class="result-value">${formaStr.replace(/_/g, ' ')}</span>
                    <span class="result-label">Email</span>
                    <span class="result-value">${pag.payerEmail || '—'}</span>
                    ${pag.dataPagamento ? `
                        <span class="result-label">Pago em</span>
                        <span class="result-value">${API.formatDate(pag.dataPagamento)}</span>
                    ` : ''}
                </div>
                ${hasLink ? `
                    <div style="margin-top:12px; padding:12px; background:rgba(0,122,255,0.1); border-radius:8px; border:1px solid rgba(0,122,255,0.3);">
                        <strong style="color:#007aff;">🔗 Link MP:</strong>
                        <div style="margin-top:8px;">
                            <button class="btn btn-accent btn-sm" onclick="navigator.clipboard.writeText('${pag.initPoint}');API.toast('Link copiado!','success')">📋 Copiar</button>
                            <button class="btn btn-primary btn-sm" onclick="window.open('${pag.initPoint}','_blank')">🌐 Abrir</button>
                        </div>
                    </div>
                ` : ''}
                <div class="result-actions" style="margin-top:12px;">
                    <button class="btn btn-accent btn-sm" onclick="Billing.checarPagamentoPorId('${pag.id}')">🔄 Checar MP</button>
                    ${pag.status === 'PENDENTE' || pag.status === 'PROCESSANDO' ? `
                        <button class="btn btn-success btn-sm" onclick="Billing.confirmarPagamentoPorId('${pag.id}')">✅ Confirmar</button>
                        <button class="btn btn-danger btn-sm" onclick="Billing.cancelarPagamentoPorId('${pag.id}')">🗑 Cancelar</button>
                    ` : ''}
                    ${pag.status === 'CONFIRMADO' ? `<button class="btn btn-warning btn-sm" onclick="Billing.estornarPagamentoPorId('${pag.id}')">↩️ Estornar</button>` : ''}
                </div>
            </div>
        `;
    };

    const renderList = async (list, renderFn) => {
        if (!Array.isArray(list) || list.length === 0) return '<p class="placeholder">Nenhum registro encontrado.</p>';
        const promises = list.map(item => renderFn(item));
        const htmlItems = await Promise.all(promises);
        return htmlItems.join('');
    };

    // ── Ações de Orçamento ──
    const addItem = () => {
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
    };

    const criarOrcamento = async () => {
        const urls = API.getUrls();
        const rows = document.querySelectorAll('#orc-items .item-row');
        const itens = [];
        rows.forEach(row => {
            const desc = row.querySelector('.item-desc').value.trim();
            const valor = parseFloat(row.querySelector('.item-valor').value) || 0;
            const qty = parseInt(row.querySelector('.item-qty').value) || 1;
            if (desc && valor > 0) itens.push({ descricao: desc, valor, quantidade: qty });
        });
        if (itens.length === 0) {
            itens.push({ descricao: 'Serviço de teste', valor: 150.00, quantidade: 1 });
        }
        const body = {
            osId: val('orc-osId') || API.uuid(),
            itens,
            observacao: val('orc-observacao') || null,
        };
        const r = await API.http('POST', `${urls.billing}/api/v1/orcamentos`, body);
        if (r.ok) API.toast('Orçamento criado!', 'success');
        document.getElementById('orc-results').innerHTML = await renderOrcamento(r.data);
    };

    // ── Listar / Filtrar Orçamentos ──
    const listarOrcamentos = async () => {
        const resEl = document.getElementById('orc-results');
        if (resEl) resEl.innerHTML = '<div class="loading-spinner">⏳ Carregando...</div>';

        const urls = API.getUrls();
        try {
            // Cache logic
            const r = await API.http('GET', `${urls.billing}/api/v1/orcamentos`);
            if (r.ok) {
                _orcCache = Array.isArray(r.data) ? r.data : (r.data.content || []);
                const term = val('orc-filter-input');
                if (term) {
                    filtrarOrcamentos(term);
                } else {
                    const html = await renderList(_orcCache, renderOrcamento);
                    if (resEl) resEl.innerHTML = html;
                }
            } else {
                if (resEl) resEl.innerHTML = `<div class="result-card"><p style="color:var(--error)">❌ Erro ao listar: ${r.status}</p></div>`;
            }
        } catch (e) {
            console.error(e);
            if (resEl) resEl.innerHTML = '<p class="placeholder">Erro de conexão.</p>';
        }
    };

    const filtrarOrcamentos = (term) => {
        if (!_orcCache) return;
        const lower = term.toLowerCase();
        const filtered = _orcCache.filter(o =>
            (o.observacao || '').toLowerCase().includes(lower) ||
            (o.status || '').toLowerCase().includes(lower) ||
            (o.id || '').toLowerCase().includes(lower)
        );
        renderList(filtered, renderOrcamento).then(html => {
            document.getElementById('orc-results').innerHTML = html;
        });
    };

    // ── Actions by ID (Orcamento) ──
    const aprovarOrcamentoPorId = async (id) => {
        const urls = API.getUrls();
        const r = await API.http('PUT', `${urls.billing}/api/v1/orcamentos/${id}/aprovar`);
        if (r.ok) {
            API.toast('Orçamento aprovado!', 'success');
            listarOrcamentos(); // Refresh list to update status
        }
        return r;
    };

    const rejeitarOrcamentoPorId = async (id) => {
        const urls = API.getUrls();
        const motivo = prompt('Motivo da rejeição (opcional):') || '';
        const r = await API.http('PUT', `${urls.billing}/api/v1/orcamentos/${id}/rejeitar?motivo=${encodeURIComponent(motivo)}`);
        if (r.ok) {
            API.toast('Orçamento rejeitado.', 'success');
            listarOrcamentos();
        }
    };

    const cancelarOrcamentoPorId = async (id) => {
        if (!confirm('Tem certeza que deseja cancelar este orçamento?')) return;
        const urls = API.getUrls();
        const r = await API.http('DELETE', `${urls.billing}/api/v1/orcamentos/${id}`);
        if (r.ok) {
            API.toast('Orçamento cancelado.', 'success');
            listarOrcamentos();
        }
    };

    // ── Ações de Pagamento ──
    const registrarPagamento = async () => {
        const urls = API.getUrls();
        const body = {
            orcamentoId: val('pag-orcamentoId') || API.uuid(),
            osId: val('pag-osId') || API.uuid(),
            valor: parseFloat(val('pag-valor')) || 100.00,
            formaPagamento: val('pag-forma') || 'PIX',
            comprovante: null,
            payerEmail: val('pag-email') || 'test@example.com',
        };
        const r = await API.http('POST', `${urls.billing}/api/v1/pagamentos`, body);
        if (r.ok) {
            API.toast('Link de pagamento gerado!', 'success');
            listarPagamentos();
        } else {
            const errMsg = r.data?.message || r.data?.error || `Erro ${r.status}`;
            API.toast(`Falha: ${errMsg}`, 'error');
        }
        return r;
    };

    // ── Listar / Filtrar Pagamentos ──
    const listarPagamentos = async () => {
        const resEl = document.getElementById('pag-results');
        if (resEl) resEl.innerHTML = '<div class="loading-spinner">⏳ Carregando...</div>';

        const urls = API.getUrls();
        try {
            const r = await API.http('GET', `${urls.billing}/api/v1/pagamentos`);
            if (r.ok) {
                _pagCache = Array.isArray(r.data) ? r.data : (r.data.content || []);
                const term = val('pag-filter-input');
                if (term) {
                    filtrarPagamentos(term);
                } else {
                    const html = await renderList(_pagCache, renderPagamento);
                    if (resEl) resEl.innerHTML = html;
                }
            } else {
                if (resEl) resEl.innerHTML = `<div class="result-card"><p style="color:var(--error)">❌ Erro ao listar: ${r.status}</p></div>`;
            }
        } catch (e) {
            if (resEl) resEl.innerHTML = '<p class="placeholder">Erro de conexão.</p>';
        }
    };

    const filtrarPagamentos = (term) => {
        if (!_pagCache) return;
        const lower = term.toLowerCase();
        const filtered = _pagCache.filter(p =>
            (p.payerEmail || '').toLowerCase().includes(lower) ||
            (p.status || '').toLowerCase().includes(lower) ||
            (p.id || '').toLowerCase().includes(lower)
        );
        renderList(filtered, renderPagamento).then(html => {
            document.getElementById('pag-results').innerHTML = html;
        });
    };

    // ── Actions by ID (Pagamento) ──
    const checarPagamentoPorId = async (id) => {
        const urls = API.getUrls();
        const r = await API.http('GET', `${urls.billing}/api/v1/pagamentos/${id}/checar`);
        if (r.ok) {
            const status = r.data?.status;
            if (status === 'CONFIRMADO') API.toast('✅ Pagamento CONFIRMADO!', 'success');
            else if (status === 'PROCESSANDO') API.toast('🔄 Pagamento em processamento...', 'info');
            else if (status === 'PENDENTE') API.toast('⏳ Cliente ainda não pagou.', 'info');
            else API.toast(`Status: ${status}`, 'info');
            listarPagamentos(); // Refresh
        } else {
            API.toast(`Erro: ${r.data?.message}`, 'error');
        }
        return r;
    };

    const confirmingPagamentoPorId = async (id) => { // Renamed to avoid conflict if any? No, let's use standard name
        const urls = API.getUrls();
        const r = await API.http('PUT', `${urls.billing}/api/v1/pagamentos/${id}/confirmar`);
        if (r.ok) {
            API.toast('Pagamento confirmado!', 'success');
            listarPagamentos();
        } else {
            API.toast('Erro ao confirmar', 'error');
        }
        return r;
    };

    // Alias for compatibility with HTML Update
    const confirmarPagamentoPorId = confirmingPagamentoPorId;


    const estornarPagamentoPorId = async (id) => {
        const urls = API.getUrls();
        const motivo = prompt('Motivo do estorno:') || '';
        let url = `${urls.billing}/api/v1/pagamentos/${id}/estornar`;
        if (motivo) url += `?motivo=${encodeURIComponent(motivo)}`;
        const r = await API.http('PUT', url);
        if (r.ok) {
            API.toast('Pagamento estornado.', 'success');
            listarPagamentos();
        } else {
            API.toast('Erro ao estornar', 'error');
        }
    };

    const cancelarPagamentoPorId = async (id) => {
        if (!confirm('Cancelar pagamento?')) return;
        const urls = API.getUrls();
        const r = await API.http('DELETE', `${urls.billing}/api/v1/pagamentos/${id}`);
        if (r.ok) {
            API.toast('Pagamento cancelado.', 'success');
            listarPagamentos();
        }
    };

    // ── Integração ──
    const criarPagamentoPara = (orcId, osId, valor) => {
        switchTab('pagamentos');
        setTimeout(() => {
            const elO = document.getElementById('pag-orcamentoId');
            const elS = document.getElementById('pag-osId');
            const elV = document.getElementById('pag-valor');
            if (elO) elO.value = orcId;
            if (elS && osId !== 'undefined') elS.value = osId;
            if (elV && valor !== 'undefined' && valor !== 'null') elV.value = valor;
        }, 100);
    };

    return {
        render, switchTab, addItem,
        criarOrcamento, listarOrcamentos, filtrarOrcamentos,
        aprovarOrcamentoPorId, rejeitarOrcamentoPorId, cancelarOrcamentoPorId,
        registrarPagamento, listarPagamentos, filtrarPagamentos,
        checarPagamentoPorId, confirmarPagamentoPorId, estornarPagamentoPorId, cancelarPagamentoPorId,
        criarPagamentoPara,
    };
})();
