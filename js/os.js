/**
 * ═══════════════════════════════════════════════════════
 *  Oficina Digital — Módulo de Ordens de Serviço
 *  CRUD para /api/v1/ordens-servico (OS Service :8081)
 * ═══════════════════════════════════════════════════════
 */
const OS = (() => {
    const STATUS_LIST = [
        'RECEBIDA', 'EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO',
        'AGUARDANDO_PAGAMENTO', 'EM_EXECUCAO', 'FINALIZADA', 'ENTREGUE', 'CANCELADA'
    ];

    let _selectedCliente = null;
    let _selectedVeiculo = null;
    let _osCache = [];

    const render = () => `
        <div class="panel-header">
            <h1><span class="accent-os">●</span> Ordens de Serviço</h1>
            <span class="service-tag">os-service :8081</span>
        </div>
        <div class="panel-grid">
            <!-- Criar OS -->
            <div class="card full-width">
                <h3>➕ Criar Ordem de Serviço</h3>
                
                <div class="form-grid">
                    <!-- Seleção de Cliente -->
                    <div class="form-group full-width">
                        <label>1. Selecionar Cliente *</label>
                        <div class="input-group">
                             <input type="text" id="os-cliente-display" readonly placeholder="Nenhum cliente selecionado" style="background-color: #f0f0f0; cursor: not-allowed;">
                             <button class="btn-icon" onclick="OS.abrirModalClientes()" title="Buscar Cliente">🔍</button>
                             <button class="btn-icon" onclick="OS.limparSelecao()" title="Limpar">✕</button>
                        </div>
                        <input type="hidden" id="os-clienteId">
                    </div>

                    <!-- Seleção de Veículo (depende do cliente) -->
                    <div class="form-group full-width" id="group-veiculo" style="opacity: 0.5; pointer-events: none;">
                        <label>2. Selecionar Veículo *</label>
                        <select id="os-veiculo-select" disabled>
                            <option value="">Selecione um cliente primeiro</option>
                        </select>
                        <input type="hidden" id="os-veiculoId">
                    </div>

                    <div class="form-group full-width">
                        <label>3. Descrição do Problema *</label>
                        <textarea id="os-descricao" rows="2" placeholder="Descreva o problema do veículo..."></textarea>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="OS.criar()">Criar OS</button>
            </div>

            <!-- Modal de Clientes -->
            <div id="os-cliente-modal" class="modal-overlay" style="display: none;">
                <div class="modal">
                    <div class="modal-header">
                        <h3>Selecionar Cliente</h3>
                        <button class="btn-icon" onclick="document.getElementById('os-cliente-modal').style.display='none'">✕</button>
                    </div>
                    <div class="modal-body">
                         <input type="text" id="os-cliente-search-input" placeholder="Buscar por nome ou CPF..." onkeyup="OS.filtrarClientes(this.value)" style="margin-bottom: 10px; width: 100%;">
                         <div id="os-cliente-list" class="list-group" style="max-height: 200px; overflow-y: auto;">
                            <p class="placeholder">Carregando clientes...</p>
                         </div>
                    </div>
                </div>
            </div>

            <!-- Resultados e Filtros (Joined) -->
            <div class="card full-width">
                <div class="card-header-actions">
                    <h3>📋 Ordens de Serviço</h3>
                     <div class="search-box">
                        <input type="text" id="os-filter-input" placeholder="buscar por descrição ou placa..." onkeyup="OS.filtrarOS(this.value)">
                    </div>
                    <div class="actions">
                        <select id="os-filterStatus" onchange="OS.buscarPorStatus()" style="width: auto; padding: 5px;">
                            <option value="">Status: Todos</option>
                            ${STATUS_LIST.map(s => `<option value="${s}">${s.replace(/_/g, ' ')}</option>`).join('')}
                        </select>
                         <button class="btn btn-ghost btn-sm" onclick="OS.listarTodas()">🔄 Atualizar</button>
                    </div>
                </div>
                <div id="os-results" class="results-area">
                    <p class="placeholder">Carregando...</p>
                </div>
            </div>
            
            <!-- Hidden inputs for compatibility if needed, or remove completely if logic updated -->
            <input type="hidden" id="os-actionId"> 
            <input type="hidden" id="os-novoStatus">
        </div>
    `;

    // ── Logica de Seleção ──

    const abrirModalClientes = async () => {
        const modal = document.getElementById('os-cliente-modal');
        if (modal) modal.style.display = 'flex';

        // Carrega clientes
        const listEl = document.getElementById('os-cliente-list');
        if (listEl) listEl.innerHTML = '<div class="loading-spinner">⏳ Carregando...</div>';

        const urls = API.getUrls();
        const r = await API.http('GET', `${urls.customer}/api/v1/clientes`);
        if (r.ok && Array.isArray(r.data)) {
            window._clientesCache = r.data; // Cache temporário pra filtro
            renderListaClientes(r.data);
        } else {
            if (listEl) listEl.innerHTML = '<p class="placeholder">Erro ao carregar clientes.</p>';
        }
    };

    const renderListaClientes = (lista) => {
        const listEl = document.getElementById('os-cliente-list');
        if (!listEl) return;
        if (lista.length === 0) {
            listEl.innerHTML = '<p class="placeholder">Nenhum cliente encontrado.</p>';
            return;
        }

        listEl.innerHTML = lista.map(c => `
            <div class="list-item" onclick="OS.selecionarCliente('${c.id}', '${c.nome}', '${c.cpf}')">
                <strong>${c.nome}</strong> <small>(${c.cpf || 'Sem CPF'})</small>
            </div>
        `).join('');
    };

    const filtrarClientes = (termo) => {
        if (!window._clientesCache) return;
        const lower = termo.toLowerCase();
        const filtrados = window._clientesCache.filter(c =>
            (c.nome && c.nome.toLowerCase().includes(lower)) ||
            (c.cpf && c.cpf.includes(lower))
        );
        renderListaClientes(filtrados);
    };

    const selecionarCliente = async (id, nome, cpf) => {
        _selectedCliente = { id, nome, cpf };

        document.getElementById('os-clienteId').value = id;
        document.getElementById('os-cliente-display').value = `${nome} (${cpf})`;
        document.getElementById('os-cliente-modal').style.display = 'none';

        // Habilita seleção de veículo
        const groupVeiculo = document.getElementById('group-veiculo');
        const selectVeiculo = document.getElementById('os-veiculo-select');

        if (groupVeiculo) {
            groupVeiculo.style.opacity = '1';
            groupVeiculo.style.pointerEvents = 'auto';
        }

        if (selectVeiculo) {
            selectVeiculo.innerHTML = '<option>Carregando veículos...</option>';
            selectVeiculo.disabled = false;
        }

        // Busca veículos do cliente
        const urls = API.getUrls();
        const r = await API.http('GET', `${urls.customer}/api/v1/veiculos/cliente/${id}`);

        if (selectVeiculo) {
            if (r.ok && Array.isArray(r.data) && r.data.length > 0) {
                selectVeiculo.innerHTML = `<option value="">Selecione um veículo...</option>` +
                    r.data.map(v => `<option value="${v.id}">${v.marca} ${v.modelo} (${v.placa})</option>`).join('');

                // Listener pra salvar seleção
                selectVeiculo.onchange = (e) => {
                    document.getElementById('os-veiculoId').value = e.target.value;
                };
            } else {
                selectVeiculo.innerHTML = '<option value="">Nenhum veículo encontrado para este cliente</option>';
            }
        }
    };

    const limparSelecao = () => {
        _selectedCliente = null;
        _selectedVeiculo = null;
        document.getElementById('os-clienteId').value = '';
        document.getElementById('os-cliente-display').value = '';
        document.getElementById('os-veiculoId').value = '';

        const groupVeiculo = document.getElementById('group-veiculo');
        const selectVeiculo = document.getElementById('os-veiculo-select');

        if (groupVeiculo) {
            groupVeiculo.style.opacity = '0.5';
            groupVeiculo.style.pointerEvents = 'none';
        }
        if (selectVeiculo) {
            selectVeiculo.innerHTML = '<option value="">Selecione um cliente primeiro</option>';
            selectVeiculo.disabled = true;
        }
    };


    const renderOS = async (os) => {
        // Resolve nomes
        const clienteNome = await API.getClienteNome(os.clienteId);
        const veiculoPlaca = await API.getVeiculoPlaca(os.veiculoId);
        // Short ID handling
        // Hiding full UUID from UI, using it only for logic or debugging
        // Use 'os.id' in data attributes for actions

        let badgeClass = 'secondary';
        if (os.status === 'FINALIZADA' || os.status === 'ENTREGUE') badgeClass = 'success';
        if (os.status === 'CANCELADA') badgeClass = 'danger';
        if (os.status === 'EM_EXECUCAO') badgeClass = 'warning';

        return `
        <div class="result-card" data-id="${os.id}" title="ID: ${os.id}">
            <div class="result-header">
                <span class="badge badge-${badgeClass}">${(os.status || 'UNKNOWN').replace(/_/g, ' ')}</span>
                <span class="text-muted text-sm" style="margin-left: auto;">${API.formatDate(os.createdAt || os.dataCriacao)}</span>
            </div>
            <div class="result-grid">
                <span class="result-label">Cliente</span>
                <span class="result-value" title="${os.clienteId}">${clienteNome}</span>
                <span class="result-label">Veículo</span>
                <span class="result-value" title="${os.veiculoId}">${veiculoPlaca}</span>
                <span class="result-label">Problema</span>
                <span class="result-value" style="grid-column: span 3;">${os.descricaoProblema || '—'}</span>
            </div>
            <div class="result-actions">
                 ${os.status === 'RECEBIDA' ? `<button class="btn btn-warning btn-sm" onclick="OS.atualizarStatus('${os.id}', 'EM_DIAGNOSTICO')">▶ Diagnóstico</button>` : ''}
                 ${os.status === 'EM_DIAGNOSTICO' ? `<button class="btn btn-primary btn-sm" onclick="OS.atualizarStatus('${os.id}', 'AGUARDANDO_APROVACAO')">✋ Aguardar Aprov.</button>` : ''}
                 ${os.status === 'AGUARDANDO_APROVACAO' ? `<button class="btn btn-success btn-sm" onclick="OS.atualizarStatus('${os.id}', 'EM_EXECUCAO')">⚙️ Aprovar/Executar</button>` : ''}
                 ${os.status === 'EM_EXECUCAO' ? `<button class="btn btn-success btn-sm" onclick="OS.atualizarStatus('${os.id}', 'FINALIZADA')">✅ Finalizar</button>` : ''}
                 ${os.status === 'FINALIZADA' ? `<button class="btn btn-secondary btn-sm" onclick="OS.atualizarStatus('${os.id}', 'ENTREGUE')">🚚 Entregar</button>` : ''}
                 ${!['CANCELADA', 'ENTREGUE'].includes(os.status) ? `<button class="btn btn-danger btn-sm" onclick="OS.atualizarStatus('${os.id}', 'CANCELADA')">🚫 Cancelar</button>` : ''}
                 <button class="btn btn-secondary btn-sm" onclick="OS.copiarParaOrcamento('${os.id}')">💵 Orçamento</button>
            </div>
        </div>
        `;
    };

    const renderOSList = async (list) => {
        const items = list?.content || list || [];
        if (!Array.isArray(items) || items.length === 0)
            return '<p class="placeholder">Nenhuma OS encontrada.</p>';

        const htmlPromises = items.map(os => renderOS(os));
        const htmlItems = await Promise.all(htmlPromises);
        return htmlItems.join('');
    };

    const val = (id) => document.getElementById(id)?.value?.trim() || '';

    // ── Ações ──
    const criar = async () => {
        const clienteId = val('os-clienteId');
        const veiculoId = val('os-veiculoId');
        const descricao = val('os-descricao');

        if (!clienteId) return API.toast('Selecione um cliente', 'error');
        if (!veiculoId) return API.toast('Selecione um veículo', 'error');
        if (!descricao) return API.toast('Informe a descrição do problema', 'error');

        const urls = API.getUrls();
        const body = {
            clienteId,
            veiculoId,
            descricaoProblema: descricao,
        };
        const r = await API.http('POST', `${urls.os}/api/v1/ordens-servico`, body);
        if (r.ok) {
            API.toast('OS criada com sucesso!', 'success');
            document.getElementById('os-results').innerHTML = await renderOS(r.data);
            limparSelecao();
            document.getElementById('os-descricao').value = '';
        }
    };

    const listarTodas = async () => {
        const resultsEl = document.getElementById('os-results');
        if (resultsEl) resultsEl.innerHTML = '<div class="loading-spinner">⏳ Carregando...</div>';

        const urls = API.getUrls();
        try {
            const r = await API.http('GET', `${urls.os}/api/v1/ordens-servico`);
            // Cache results
            _osCache = Array.isArray(r.data) ? r.data : (r.data.content || []);

            // Check if there is an active filter in the input?
            const term = val('os-filter-input');
            if (term) {
                filtrarOS(term);
            } else {
                const html = await renderOSList(_osCache);
                if (resultsEl) resultsEl.innerHTML = html;
            }
        } catch (e) {
            if (resultsEl) resultsEl.innerHTML = '<p class="placeholder">Erro de conexão.</p>';
        }
    };

    const filtrarOS = (term) => {
        if (!_osCache) return;
        const lower = term.toLowerCase();
        // Client-Side filtering
        // Filter by Description, Status, Vehicle ID/Data, Client Name (if we had it in cache... we only have ID here usually)
        // To filter by Client Name properly we would need to fetch all names or have them in the OS object.
        // For now, filter by what we have: ID (hidden but searchable?), Description, Status.

        const filtered = _osCache.filter(o =>
            (o.descricaoProblema || '').toLowerCase().includes(lower) ||
            (o.status || '').toLowerCase().includes(lower) ||
            // Allow searching by partial ID even if hidden
            (o.id || '').toLowerCase().includes(lower)
        );

        // We need to render this list. renderOSList is async.
        renderOSList(filtered).then(html => {
            document.getElementById('os-results').innerHTML = html;
        });
    };

    const buscarPorStatus = async () => {
        const status = val('os-filterStatus');
        if (!status) return listarTodas(); // Shows all

        const resultsEl = document.getElementById('os-results');
        if (resultsEl) resultsEl.innerHTML = '<div class="loading-spinner">⏳ Filtrando...</div>';

        // Use cache if available/populated? Or fetch fresh?
        // Let's use cache to be consistent with "Search" box
        if (!_osCache || _osCache.length === 0) {
            const urls = API.getUrls();
            const r = await API.http('GET', `${urls.os}/api/v1/ordens-servico`);
            _osCache = Array.isArray(r.data) ? r.data : (r.data.content || []);
        }

        const filtered = _osCache.filter(o => o.status === status);
        const html = await renderOSList(filtered);
        if (resultsEl) resultsEl.innerHTML = html;
    };

    const atualizarStatus = async (idOverride, statusOverride) => {
        const id = idOverride || val('os-actionId');
        const novoStatus = statusOverride || val('os-novoStatus');
        if (!id) return API.toast('Informe o ID da OS', 'error');
        const urls = API.getUrls();
        const r = await API.http('PUT', `${urls.os}/api/v1/ordens-servico/${id}/status`, {
            novoStatus,
            observacao: 'Atualização via sistema',
            usuarioAlteracao: 'sistema-frontend',
        });
        if (r.ok) {
            API.toast(`Status atualizado para ${novoStatus}`, 'success');
            listarTodas(); // Atualiza a lista para refletir a mudança
        }
        return r;
    };

    // ── Integração com outros módulos, mantido para compatibilidade ──
    const preencherVeiculo = (veiculoId, clienteId) => {
        // Redireciona e tenta preencher se possível, mas agora com lógica de seleção é mais complexo
        // Idealmente refatoraríamos quem chama isso, mas por enquanto vamos logar
        console.warn('preencherVeiculo chamado externamente - use a UI de seleção');
        App.navigateTo('os');
    };

    const copiarParaOrcamento = (osId) => {
        App.navigateTo('billing');
        setTimeout(() => {
            // Check if billing has the new selector set up (it might be refactored next)
            // If checking for hidden input vs text input
            const el = document.getElementById('orc-osId');
            if (el) el.value = osId;
            // Se tiver lógica de display, precisaria setar também, será tratado na refatoração do billing
        }, 100);
    };

    const copiarParaExecucao = (osId) => {
        App.navigateTo('execution');
        setTimeout(() => {
            // Execucao nao tem mais input manual de OS, entao isso pode ser obsoleto
            // ou redirecionar para filtro
            const el = document.getElementById('exec-searchOsId');
            if (el) {
                el.value = osId;
                Execucao.buscarPorOsId(); // Já busca direto
            }
        }, 100);
    };

    const preencherSelecaoExterno = async (clienteId, veiculoId) => {
        // 1. Busca e seleciona o cliente (isso já carrega os veículos)
        const urls = API.getUrls();
        try {
            const rCliente = await API.http('GET', `${urls.customer}/api/v1/clientes/${clienteId}`);
            if (rCliente.ok) {
                const c = rCliente.data;
                // Precisamos do nome da pessoa, que não vem direto no cliente às vezes
                // Mas o método selecionarCliente pede (id, nome, cpf). 
                // Vamos tentar pegar do endpoint de detalhes ou assumir que o render resolve.
                // O endpoint GET /clientes/{id} normalmente retorna o wrapper completo. 
                // Se não, fazemos fetch extra. 
                // Para simplificar, vamos usar o que vier.

                let nome = c.nome || c.name || 'Cliente';
                let doc = c.cpf || c.documento || '';

                // Se o nome for vazio, tenta buscar pessoa
                if (!c.nome) {
                    const nomePessoa = await API.getPessoaNome(c.pessoaId);
                    nome = nomePessoa || 'Cliente';
                }

                await selecionarCliente(clienteId, nome, doc);

                // 2. Com o cliente selecionado e veículos carregados, seleciona o veículo
                // O selecionarCliente é async e carrega os veículos.
                const selectVeiculo = document.getElementById('os-veiculo-select');
                if (selectVeiculo) {
                    selectVeiculo.value = veiculoId;
                    // Dispara evento manual se necessário, mas aqui só setar o value do hidden
                    document.getElementById('os-veiculoId').value = veiculoId;
                }

                API.toast('Cliente e Veículo pré-selecionados!', 'success');
            }
        } catch (e) {
            console.error(e);
            API.toast('Erro ao pré-selecionar dados.', 'error');
        }
    };

    return {
        render, criar, listarTodas, buscarPorStatus, filtrarOS,
        atualizarStatus, preencherVeiculo, copiarParaOrcamento, copiarParaExecucao,
        abrirModalClientes, renderListaClientes, filtrarClientes, selecionarCliente, limparSelecao,
        preencherSelecaoExterno
    };
})();
