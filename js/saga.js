/**
 * ═══════════════════════════════════════════════════════
 *  Oficina Digital — Módulo Saga Flow
 *  Fluxo completo Cross-Service para testar o padrão SAGA
 * ═══════════════════════════════════════════════════════
 */
const Saga = (() => {
    let _state = {};

    const render = () => `
        <div class="panel-header">
            <h1><span class="accent-saga">●</span> Saga Flow</h1>
            <span class="service-tag">cross-service</span>
        </div>
        <div class="card full-width">
            <p class="saga-description">
                O fluxo SAGA executa automaticamente todo o ciclo de vida de uma OS:
                <strong>Criar OS → Orçamento → Aprovação → Pagamento → Execução → Entrega</strong>.
                Cada etapa comunica com o microserviço correspondente via eventos Kafka.
            </p>
            <div class="saga-flow">
                <div class="saga-step" id="saga-step-1">
                    <div class="saga-icon">📋</div>
                    <div class="saga-label">1. Criar OS</div>
                    <div class="saga-desc">OS Service</div>
                    <div class="saga-status">⏳ Pendente</div>
                </div>
                <div class="saga-arrow">→</div>
                <div class="saga-step" id="saga-step-2">
                    <div class="saga-icon">💵</div>
                    <div class="saga-label">2. Orçamento</div>
                    <div class="saga-desc">Billing Service</div>
                    <div class="saga-status">⏳ Pendente</div>
                </div>
                <div class="saga-arrow">→</div>
                <div class="saga-step" id="saga-step-3">
                    <div class="saga-icon">✅</div>
                    <div class="saga-label">3. Aprovação</div>
                    <div class="saga-desc">Billing Service</div>
                    <div class="saga-status">⏳ Pendente</div>
                </div>
                <div class="saga-arrow">→</div>
                <div class="saga-step" id="saga-step-4">
                    <div class="saga-icon">💳</div>
                    <div class="saga-label">4. Pagamento</div>
                    <div class="saga-desc">Billing Service</div>
                    <div class="saga-status">⏳ Pendente</div>
                </div>
                <div class="saga-arrow">→</div>
                <div class="saga-step" id="saga-step-5">
                    <div class="saga-icon">🔧</div>
                    <div class="saga-label">5. Execução</div>
                    <div class="saga-desc">Execution Service</div>
                    <div class="saga-status">⏳ Pendente</div>
                </div>
                <div class="saga-arrow">→</div>
                <div class="saga-step" id="saga-step-6">
                    <div class="saga-icon">🏁</div>
                    <div class="saga-label">6. Entrega</div>
                    <div class="saga-desc">OS Service</div>
                    <div class="saga-status">⏳ Pendente</div>
                </div>
            </div>
            <div class="saga-controls">
                <button class="btn btn-primary btn-large" onclick="Saga.executarFluxoCompleto()">🚀 Executar Fluxo Completo</button>
                <button class="btn btn-ghost" onclick="Saga.resetar()">🔄 Resetar</button>
            </div>

            <!-- Saga Context -->
            <div class="saga-context" id="saga-context" style="display:none;">
                <h4>📎 IDs do Fluxo Atual</h4>
                <div class="saga-ids" id="saga-ids"></div>
            </div>

            <div id="saga-log" class="saga-log">
                <p class="placeholder">Execute o fluxo para ver os logs aqui.</p>
            </div>
        </div>
    `;

    const _logEntry = (msg, type = 'info') => {
        const log = document.getElementById('saga-log');
        if (!log) return;
        if (log.querySelector('.placeholder')) log.innerHTML = '';
        const entry = document.createElement('div');
        entry.className = `saga-log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    };

    const _setStep = (n, state) => {
        const step = document.getElementById(`saga-step-${n}`);
        if (!step) return;
        step.classList.remove('active', 'done', 'error');
        if (state) step.classList.add(state);
        const statusEl = step.querySelector('.saga-status');
        if (state === 'active') statusEl.textContent = '🔄 Executando...';
        else if (state === 'done') statusEl.textContent = '✅ Concluído';
        else if (state === 'error') statusEl.textContent = '❌ Erro';
        else statusEl.textContent = '⏳ Pendente';
    };

    const _updateContext = () => {
        const ctx = document.getElementById('saga-context');
        const ids = document.getElementById('saga-ids');
        if (!ctx || !ids) return;
        if (Object.keys(_state).length === 0) {
            ctx.style.display = 'none';
            return;
        }
        ctx.style.display = 'block';
        ids.innerHTML = Object.entries(_state).map(([k, v]) =>
            `<div class="saga-id-item">
                <span class="saga-id-label">${k}:</span>
                <span class="saga-id-value" onclick="navigator.clipboard.writeText('${v}');API.toast('Copiado!','success')" title="Clique para copiar ID Completo: ${v}">${API.formatId(v)}</span>
            </div>`
        ).join('');
    };

    const resetar = () => {
        _state = {};
        for (let i = 1; i <= 6; i++) _setStep(i, null);
        const log = document.getElementById('saga-log');
        if (log) log.innerHTML = '<p class="placeholder">Execute o fluxo para ver os logs aqui.</p>';
        const ctx = document.getElementById('saga-context');
        if (ctx) ctx.style.display = 'none';
        API.toast('Saga resetado.', 'info');
    };

    const executarFluxoCompleto = async () => {
        resetar();
        const urls = API.getUrls();
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        try {
            // Step 1: Criar OS
            _setStep(1, 'active');
            _logEntry('📋 Criando Ordem de Serviço...', 'info');
            const osBody = {
                clienteId: API.uuid(),
                veiculoId: API.uuid(),
                descricaoProblema: 'Fluxo completo SAGA — teste end-to-end',
            };
            const osRes = await API.http('POST', `${urls.os}/api/v1/ordens-servico`, osBody);
            if (!osRes.ok) throw new Error('Falha ao criar OS');
            _state.osId = osRes.data.id;
            _logEntry(`✅ OS criada: ${API.formatId(osRes.data.id)}`, 'success');
            _updateContext();
            _setStep(1, 'done');
            await sleep(800);

            // Step 2: Criar Orçamento
            _setStep(2, 'active');
            _logEntry('💵 Criando Orçamento...', 'info');
            const orcBody = {
                osId: _state.osId,
                itens: [
                    { descricao: 'Troca de óleo + filtro', valor: 120.00, quantidade: 1 },
                    { descricao: 'Filtro de ar', valor: 80.00, quantidade: 1 },
                    { descricao: 'Mão de obra - revisão', valor: 200.00, quantidade: 1 },
                ],
                observacao: 'Orçamento gerado pelo Saga Flow',
            };
            const orcRes = await API.http('POST', `${urls.billing}/api/v1/orcamentos`, orcBody);
            if (!orcRes.ok) throw new Error('Falha ao criar orçamento');
            _state.orcamentoId = orcRes.data.id;
            _logEntry(`✅ Orçamento criado: ${API.formatId(orcRes.data.id)} — Total: ${API.formatMoney(orcRes.data.valorTotal)}`, 'success');
            _updateContext();
            _setStep(2, 'done');
            await sleep(800);

            // Step 3: Aprovar Orçamento
            _setStep(3, 'active');
            _logEntry('✅ Aprovando orçamento...', 'info');
            const aprRes = await API.http('PUT', `${urls.billing}/api/v1/orcamentos/${_state.orcamentoId}/aprovar`);
            if (!aprRes.ok) throw new Error('Falha ao aprovar orçamento');
            _logEntry('✅ Orçamento aprovado! Evento ORCAMENTO_APROVADO publicado no Kafka.', 'success');
            _setStep(3, 'done');
            await sleep(800);

            // Step 4: Registrar e Confirmar Pagamento
            _setStep(4, 'active');
            _logEntry('💳 Registrando pagamento...', 'info');
            const pagBody = {
                orcamentoId: _state.orcamentoId,
                osId: _state.osId,
                valor: orcRes.data.valorTotal || 400.00,
                formaPagamento: 'PIX',
                comprovante: null,
                payerEmail: 'saga-test@oficina.com',
            };
            const pagRes = await API.http('POST', `${urls.billing}/api/v1/pagamentos`, pagBody);
            if (!pagRes.ok) throw new Error('Falha ao registrar pagamento');
            _state.pagamentoId = pagRes.data.id;
            _logEntry(`✅ Pagamento registrado: ${API.formatId(pagRes.data.id)}`, 'success');
            _updateContext();

            _logEntry('💳 Confirmando pagamento...', 'info');
            const confRes = await API.http('PUT', `${urls.billing}/api/v1/pagamentos/${_state.pagamentoId}/confirmar`);
            if (!confRes.ok) throw new Error('Falha ao confirmar pagamento');
            _logEntry('✅ Pagamento confirmado! Evento PAGAMENTO_CONFIRMADO publicado.', 'success');
            _setStep(4, 'done');
            await sleep(800);

            // Step 5: Criar, Iniciar e Finalizar Execução
            _setStep(5, 'active');
            _logEntry('🔧 Criando execução do serviço...', 'info');
            const execBody = {
                osId: _state.osId,
                orcamentoId: _state.orcamentoId,
                mecanicoResponsavel: 'João Silva (Saga Automático)',
            };
            const execRes = await API.http('POST', `${urls.execution}/api/v1/execucoes-os`, execBody);
            if (!execRes.ok) throw new Error('Falha ao criar execução');
            _state.execucaoId = execRes.data.id;
            _logEntry(`✅ Execução criada: ${API.formatId(execRes.data.id)}`, 'success');
            _updateContext();

            _logEntry('▶️ Iniciando execução...', 'info');
            const iniRes = await API.http('PUT', `${urls.execution}/api/v1/execucoes-os/${_state.execucaoId}/iniciar`);
            if (!iniRes.ok) throw new Error('Falha ao iniciar execução');
            _logEntry('✅ Execução iniciada! Mecânico trabalhando...', 'success');
            await sleep(500);

            _logEntry('🏁 Finalizando execução...', 'info');
            const finRes = await API.http('PUT', `${urls.execution}/api/v1/execucoes-os/${_state.execucaoId}/finalizar`);
            if (!finRes.ok) throw new Error('Falha ao finalizar execução');
            _logEntry('✅ Execução finalizada! Evento EXECUCAO_CONCLUIDA publicado.', 'success');
            _setStep(5, 'done');
            await sleep(800);

            // Step 6: Marcar OS como Finalizada e Entregue
            _setStep(6, 'active');
            _logEntry('📋 Finalizando Ordem de Serviço...', 'info');
            await API.http('PUT', `${urls.os}/api/v1/ordens-servico/${_state.osId}/status`, {
                novoStatus: 'FINALIZADA',
                observacao: 'Finalização via Saga Flow',
                usuarioAlteracao: 'saga-system',
            });
            _logEntry('✅ OS marcada como FINALIZADA!', 'success');
            await sleep(500);

            _logEntry('🚗 Entregando veículo ao cliente...', 'info');
            await API.http('PUT', `${urls.os}/api/v1/ordens-servico/${_state.osId}/status`, {
                novoStatus: 'ENTREGUE',
                observacao: 'Entrega via Saga Flow',
                usuarioAlteracao: 'saga-system',
            });
            _logEntry('🏁 Veículo entregue! Fluxo SAGA completo! ✅', 'success');
            _setStep(6, 'done');

            _logEntry('', 'info');
            _logEntry('═══════════════════════════════════════════', 'success');
            _logEntry('  🎉 SAGA FLOW COMPLETO COM SUCESSO!', 'success');
            _logEntry(`  OS: ${API.formatId(_state.osId)}`, 'success');
            _logEntry(`  Orçamento: ${API.formatId(_state.orcamentoId)}`, 'success');
            _logEntry(`  Pagamento: ${API.formatId(_state.pagamentoId)}`, 'success');
            _logEntry(`  Execução: ${API.formatId(_state.execucaoId)}`, 'success');
            _logEntry('═══════════════════════════════════════════', 'success');

            API.toast('🎉 Fluxo SAGA completo com sucesso!', 'success');
        } catch (err) {
            _logEntry(`❌ ERRO: ${err.message}`, 'error');
            _logEntry('O fluxo foi interrompido. Verifique o HTTP Console para detalhes.', 'error');
            API.toast('Saga interrompido por erro. Veja o log.', 'error');
        }
    };

    return { render, resetar, executarFluxoCompleto };
})();
