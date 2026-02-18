/**
 * ═══════════════════════════════════════════════════════
 *  Oficina Digital — Módulo de Execução
 *  CRUD para /api/v1/execucoes-os (Execution Service :8083)
 * ═══════════════════════════════════════════════════════
 */
const Execucao = (() => {
    const STATUS_EXEC = ['AGUARDANDO_INICIO', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'];
    let _execCache = [];
    let _approvedCache = [];

    const render = () => `
        <div class="panel-header">
            <h1><span class="accent-execution">●</span> Execução de Serviços</h1>
            <span class="service-tag">execution-service :8083</span>
        </div>
        <div class="panel-grid">
            
            <!-- LISTA DE ORÇAMENTOS APROVADOS (Execuções Pendentes) -->
            <div class="card full-width">
                <div class="card-header-actions">
                    <h3>🆕 Orçamentos Aprovados (Aguardando Execução)</h3>
                    <button class="btn btn-ghost btn-sm" onclick="Execucao.listarOrcamentosAprovados()">🔄 Atualizar</button>
                </div>
                
                <div class="form-grid" style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                     <div class="form-group" style="flex: 2;">
                        <label>Mecânico Responsável para novas execuções *</label>
                        <input type="text" id="exec-mecanico" placeholder="Nome do mecânico responsável...">
                    </div>
                </div>

                <div id="exec-approved-list" class="results-area horizontal-scroll">
                    <p class="placeholder">Carregando orçamentos aprovados...</p>
                </div>
            </div>

            <!-- LISTA DE EXECUÇÕES (Histórico e Ativas) -->
            <div class="card full-width">
                <div class="card-header-actions">
                    <h3>🔧 Histórico de Execuções</h3>
                    <div class="search-box">
                        <input type="text" id="exec-filter-input" placeholder="Filtrar por ID, OS, Mecânico..." onkeyup="Execucao.filtrarExecucoes(this.value)">
                    </div>
                    <div class="actions">
                        <select id="exec-filterStatus" onchange="Execucao.filtrarPorStatus()" style="width: auto; padding: 5px;">
                            <option value="">Status: Todos</option>
                            ${STATUS_EXEC.map(s => `<option value="${s}">${s.replace(/_/g, ' ')}</option>`).join('')}
                        </select>
                        <button class="btn btn-ghost btn-sm" onclick="Execucao.listarExecucoes()">🔄 Atualizar</button>
                    </div>
                </div>
                <div id="exec-results" class="results-area">
                    <p class="placeholder">Carregando execuções...</p>
                </div>
            </div>
            
            <!-- Hidden inputs/modals for actions if needed -->
            <input type="hidden" id="exec-actionId">
        </div>
    `;

    // Hook para carregar a lista ao iniciar o painel
    setTimeout(() => {
        if (document.getElementById('exec-approved-list')) listarOrcamentosAprovados();
    }, 500);

    const val = (id) => document.getElementById(id)?.value?.trim() || '';

    const badge = (status) => `<span class="badge badge-${status || 'UNKNOWN'}">${(status || '—').replace(/_/g, ' ')}</span>`;

    const renderExecucao = async (exec) => {
        if (!exec) return '<p class="placeholder">Nenhum dado.</p>';

        const shortId = API.formatId(exec.id);
        const shortOsId = API.formatId(exec.osId || exec.ordemServicoId);
        const shortOrcId = API.formatId(exec.orcamentoId);

        return `
            <div class="result-card">
                <div class="result-header">
                    <span class="result-id" onclick="navigator.clipboard.writeText('${exec.id}');API.toast('ID copiado!','success')" title="Copiar ID">${shortId}</span>
                    ${badge(exec.status)}
                    <span class="text-muted text-sm" style="margin-left: auto;">${API.formatDate(exec.dataInicio || exec.createdAt)}</span>
                </div>
                <div class="result-grid">
                    <span class="result-label">OS / Orç.</span>
                    <span class="result-value">OS: ${shortOsId} / Orc: ${shortOrcId}</span>
                    <span class="result-label">Mecânico</span>
                    <span class="result-value">${exec.mecanicoResponsavel || exec.mecanico || '—'}</span>
                    <span class="result-label">Início</span>
                    <span class="result-value">${API.formatDate(exec.dataInicio)}</span>
                    <span class="result-label">Fim</span>
                    <span class="result-value">${API.formatDate(exec.dataFim)}</span>
                </div>
                <div class="result-actions">
                    ${exec.status === 'AGUARDANDO_INICIO' ? `<button class="btn btn-success btn-sm" onclick="Execucao.iniciar('${exec.id}')">▶️ Iniciar</button>` : ''}
                    ${exec.status === 'EM_ANDAMENTO' ? `<button class="btn btn-accent btn-sm" onclick="Execucao.finalizar('${exec.id}')">✅ Finalizar</button>` : ''}
                    ${['AGUARDANDO_INICIO', 'EM_ANDAMENTO'].includes(exec.status) ? `<button class="btn btn-danger btn-sm" onclick="Execucao.cancelar('${exec.id}')">❌ Cancelar</button>` : ''}
                     <button class="btn btn-ghost btn-sm" onclick="Execucao.deletar('${exec.id}')">🗑</button>
                </div>
            </div>
        `;
    };

    const renderApprovedBudget = async (orc) => {
        const shortId = API.formatId(orc.id);
        const shortOsId = API.formatId(orc.osId);

        // Tenta resolver nomes para ficar mais amigável (opcional, pode demorar)
        // const clienteNome = await API.getClienteNome(...); // OS service precisaria expor endpoint para pegar OS e então Cliente...
        // Por enquanto, mostra IDs e Valor.

        return `
            <div class="result-card" style="border-left: 4px solid var(--accent-success);">
                <div class="result-header">
                    <span class="result-id" title="Orçamento ID">${shortId}</span>
                    <span class="badge badge-APPROVED">APROVADO</span>
                </div>
                <div class="result-grid">
                    <span class="result-label">OS ID</span>
                    <span class="result-value" title="${orc.osId}">${shortOsId}</span>
                    <span class="result-label">Valor</span>
                    <span class="result-value font-bold">${API.formatMoney(orc.valorTotal)}</span>
                    <span class="result-label">Itens</span>
                    <span class="result-value">${(orc.itens || []).length} itens</span>
                    <span class="result-label">Aprovado em</span>
                    <span class="result-value">${API.formatDate(orc.dataAprovacao || orc.dataAtualizacao)}</span>
                </div>
                <div class="result-actions">
                     <button class="btn btn-primary btn-sm" onclick="Execucao.criar('${orc.osId}', '${orc.id}')">⚡ Criar Execução</button>
                </div>
            </div>
         `;
    };

    const renderExecList = async (list) => {
        const items = list?.content || list || [];
        if (!Array.isArray(items) || items.length === 0)
            return '<p class="placeholder">Nenhuma execução encontrada.</p>';

        const promises = items.map(renderExecucao);
        const htmlItems = await Promise.all(promises);
        return htmlItems.join('');
    };

    const renderApprovedList = async (list) => {
        if (!Array.isArray(list) || list.length === 0)
            return '<p class="placeholder">Nenhum orçamento aprovado disponível.</p>';

        // Filter client-side just in case, though we will filter after fetch
        const promises = list.map(renderApprovedBudget);
        const htmlItems = await Promise.all(promises);
        return htmlItems.join('');
    };


    // ── Ações ──

    // ── Listagens e Filtros ──

    const listarOrcamentosAprovados = async () => {
        const container = document.getElementById('exec-approved-list');
        if (container) container.innerHTML = '<div class="loading-spinner">⏳ Buscando orçamentos...</div>';

        const urls = API.getUrls();
        try {
            const r = await API.http('GET', `${urls.billing}/api/v1/orcamentos`);
            if (r.ok && Array.isArray(r.data)) {
                _approvedCache = r.data.filter(orc => orc.status === 'APROVADO');
                const html = await renderApprovedList(_approvedCache);
                if (container) container.innerHTML = html;
            } else {
                if (container) container.innerHTML = '<p class="placeholder">Nenhum orçamento aprovado encontrado.</p>';
            }
        } catch (e) {
            if (container) container.innerHTML = '<p class="placeholder">Erro ao buscar orçamentos.</p>';
        }
    };

    const listarExecucoes = async () => {
        const resEl = document.getElementById('exec-results');
        if (resEl) resEl.innerHTML = '<div class="loading-spinner">⏳ Carregando...</div>';

        const urls = API.getUrls();
        try {
            const r = await API.http('GET', `${urls.execution}/api/v1/execucoes-os`);
            if (r.ok) {
                _execCache = Array.isArray(r.data) ? r.data : (r.data.content || []);
                const html = await renderExecList(_execCache);
                if (resEl) resEl.innerHTML = html;
                filtrarExecucoes(); // Re-apply current filter if any
            } else {
                if (resEl) resEl.innerHTML = `<div class="result-card"><p style="color:var(--error)">❌ Erro ao listar: ${r.status}</p></div>`;
            }
        } catch (e) {
            if (resEl) resEl.innerHTML = '<p class="placeholder">Erro de conexão.</p>';
        }
    };

    const filtrarExecucoes = (term) => {
        term = term || val('exec-filter-input');
        const statusFilter = val('exec-filterStatus');

        let filtered = _execCache || [];

        if (statusFilter) {
            filtered = filtered.filter(e => e.status === statusFilter);
        }

        if (term) {
            const lower = term.toLowerCase();
            filtered = filtered.filter(e =>
                (e.mecanicoResponsavel || '').toLowerCase().includes(lower) ||
                (e.id || '').toLowerCase().includes(lower) ||
                (e.osId || '').toLowerCase().includes(lower)
            );
        }

        renderExecList(filtered).then(html => {
            const resEl = document.getElementById('exec-results');
            if (resEl) resEl.innerHTML = html;
        });
    };

    const filtrarPorStatus = () => {
        filtrarExecucoes();
    };

    // ── Actions ──

    const criar = async (osId, orcamentoId) => {
        if (!osId || !orcamentoId) return API.toast('Dados inválidos', 'error');
        const mecanico = val('exec-mecanico');
        if (!mecanico) {
            document.getElementById('exec-mecanico')?.focus();
            return API.toast('Informe o Mecânico Responsável acima', 'warning');
        }

        const urls = API.getUrls();
        const body = {
            osId: osId,
            orcamentoId: orcamentoId,
            mecanicoResponsavel: mecanico,
        };
        const r = await API.http('POST', `${urls.execution}/api/v1/execucoes-os`, body);
        if (r.ok) {
            API.toast('Execução criada com sucesso!', 'success');
            listarExecucoes();
            listarOrcamentosAprovados();
        } else {
            API.toast('Erro ao criar execução', 'error');
        }
    };

    const iniciar = async (id) => {
        if (!id) return;
        const urls = API.getUrls();
        const r = await API.http('PUT', `${urls.execution}/api/v1/execucoes-os/${id}/iniciar`);
        if (r.ok) {
            API.toast('Execução iniciada!', 'success');
            listarExecucoes();
        } else {
            API.toast('Erro ao iniciar', 'error');
        }
    };

    const finalizar = async (id) => {
        if (!id) return;
        const obs = prompt('Observações finais (opcional):') || '';
        const urls = API.getUrls();
        let url = `${urls.execution}/api/v1/execucoes-os/${id}/finalizar`;
        if (obs) url += `?observacoes=${encodeURIComponent(obs)}`;

        const r = await API.http('PUT', url);
        if (r.ok) {
            API.toast('Execução finalizada!', 'success');
            listarExecucoes();
        }
    };

    const cancelar = async (id) => {
        if (!id) return;
        if (!confirm('Tem certeza que deseja cancelar esta execução?')) return;

        const motivo = prompt('Motivo do cancelamento:') || 'Cancelado pelo usuário';
        const urls = API.getUrls();
        let url = `${urls.execution}/api/v1/execucoes-os/${id}/cancelar`;
        if (motivo) url += `?motivo=${encodeURIComponent(motivo)}`;

        const r = await API.http('PUT', url);
        if (r.ok) {
            API.toast('Execução cancelada.', 'success');
            listarExecucoes();
        }
    };

    const deletar = async (id) => {
        if (!id) return;
        if (!confirm('EXCLUIR PERMANENTEMENTE?')) return;
        const urls = API.getUrls();
        const r = await API.http('DELETE', `${urls.execution}/api/v1/execucoes-os/${id}`);
        if (r.ok) {
            API.toast('Execução excluída.', 'success');
            listarExecucoes();
        }
    };

    return {
        render, listarOrcamentosAprovados, listarExecucoes,
        filtrarExecucoes, filtrarPorStatus,
        criar, iniciar, finalizar, cancelar, deletar
    };
})();
