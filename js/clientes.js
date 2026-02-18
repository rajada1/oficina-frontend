const Clientes = (() => {
    let _selectedClienteId = null;
    let _cliCache = [];
    let _veiCache = []; // Cache for vehicles of selected client

    const render = () => `
        <div class="panel-header">
            <h1><span class="accent-customer">●</span> Clientes & Veículos</h1>
            <span class="service-tag">customer-service :8084</span>
        </div>

        <!-- Sub-tabs -->
        <div class="sub-tabs">
            <button class="sub-tab active" data-subtab="clientes" onclick="Clientes.switchTab('clientes')">👤 Clientes</button>
            <button class="sub-tab" data-subtab="veiculos" onclick="Clientes.switchTab('veiculos')">🚗 Veículos</button>
        </div>

        <!-- Clientes Sub-Panel -->
        <div class="sub-panel active" id="subtab-clientes">
            <div class="panel-grid">
                <!-- Modal de Pessoas -->
                <div id="cli-pessoa-modal" class="modal-overlay" style="display: none;">
                    <div class="modal">
                        <div class="modal-header">
                            <h3>Selecionar Pessoa Física/Jurídica</h3>
                            <button class="btn-icon" onclick="document.getElementById('cli-pessoa-modal').style.display='none'">✕</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <input type="text" id="cli-pessoa-search-term" placeholder="Filtrar por nome ou CPF/CNPJ..." onkeyup="Clientes.filtrarPessoas(this.value)">
                            </div>
                            <div id="cli-pessoa-list" class="list-group" style="max-height: 250px; overflow-y: auto;">
                                <p class="placeholder">Carregando pessoas...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h3>➕ Registrar Cliente</h3>
                    <p class="form-hint">Selecione uma Pessoa cadastrada para torná-la Cliente.</p>
                    <div class="form-grid">
                        <div class="form-group full-width">
                            <label>Selecionar Pessoa *</label>
                            <div class="input-group">
                                <input type="text" id="cliente-pessoa-display" readonly placeholder="Nenhuma pessoa selecionada" style="background-color: #f0f0f0; cursor: not-allowed;">
                                <button class="btn-icon" onclick="Clientes.abrirModalPessoas()" title="Buscar Pessoa">🔍</button>
                                <button class="btn-icon" onclick="Clientes.limparSelecaoPessoa()" title="Limpar">✕</button>
                            </div>
                            <input type="hidden" id="cliente-pessoaId">
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="Clientes.criar()">Registrar Cliente</button>
                </div>

                <div class="card full-width">
                    <div class="card-header-actions">
                        <h3>📋 Clientes</h3>
                        <div class="search-box">
                            <input type="text" id="cliente-filter-input" placeholder="Filtrar por Nome, Email ou ID..." onkeyup="Clientes.filtrarClientesMain(this.value)">
                        </div>
                        <button class="btn btn-ghost btn-sm" onclick="Clientes.listarTodos()">🔄 Atualizar</button>
                    </div>
                    <div id="clientes-results" class="results-area">
                        <p class="placeholder">Nenhum resultado ainda.</p>
                    </div>
                </div>
            </div>
        </div>

                <div class="card full-width">
                    <div class="card-header-actions">
                        <h3>📋 Clientes</h3>
                        <button class="btn btn-ghost btn-sm" onclick="Clientes.listarTodos()">🔄 Atualizar</button>
                    </div>
                    <div id="clientes-results" class="results-area">
                        <p class="placeholder">Nenhum resultado ainda.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Veículos Sub-Panel -->
        <div class="sub-panel" id="subtab-veiculos">
            <div class="panel-grid">
                
                <!-- Modal de Clientes (para Veículo) -->
                <div id="vei-cliente-modal" class="modal-overlay" style="display: none;">
                    <div class="modal">
                        <div class="modal-header">
                            <h3>Selecionar Cliente Proprietário</h3>
                            <button class="btn-icon" onclick="document.getElementById('vei-cliente-modal').style.display='none'">✕</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <input type="text" id="vei-cliente-search-term" placeholder="Filtrar por nome..." onkeyup="Clientes.filtrarClientesModal(this.value)">
                            </div>
                            <div id="vei-cliente-list" class="list-group" style="max-height: 250px; overflow-y: auto;">
                                <p class="placeholder">Carregando clientes...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h3>➕ Registrar Veículo</h3>
                    <div class="form-grid">
                        <div class="form-group full-width">
                            <label>Cliente Proprietário *</label>
                            <div class="input-group">
                                <input type="text" id="veiculo-cliente-display" readonly placeholder="Nenhum cliente selecionado" style="background-color: #f0f0f0; cursor: not-allowed;">
                                <button class="btn-icon" onclick="Clientes.abrirModalClientes()" title="Buscar Cliente">🔍</button>
                                <button class="btn-icon" onclick="Clientes.limparSelecaoCliente()" title="Limpar">✕</button>
                            </div>
                            <input type="hidden" id="veiculo-clienteId">
                        </div>
                        
                        <div class="form-group">
                            <label>Placa *</label>
                            <input type="text" id="veiculo-placa" placeholder="ABC-1234">
                        </div>
                        <div class="form-group">
                            <label>Marca *</label>
                            <input type="text" id="veiculo-marca" placeholder="Ex: Toyota">
                        </div>
                        <div class="form-group">
                            <label>Modelo *</label>
                            <input type="text" id="veiculo-modelo" placeholder="Ex: Corolla">
                        </div>
                        <div class="form-group">
                            <label>Ano *</label>
                            <input type="number" id="veiculo-ano" placeholder="2024" min="1900" max="2100">
                        </div>
                        <div class="form-group">
                            <label>Cor</label>
                            <input type="text" id="veiculo-cor" placeholder="Prata">
                        </div>
                        <div class="form-group">
                            <label>Renavam</label>
                            <input type="text" id="veiculo-renavam" placeholder="Opcional">
                        </div>
                        <div class="form-group">
                            <label>Chassi</label>
                            <input type="text" id="veiculo-chassi" placeholder="Opcional">
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="Clientes.criarVeiculo()">Registrar Veículo</button>
                </div>

                <div class="card">
                    <h3>🔍 Veículos do Cliente</h3>
                     <div class="form-group full-width">
                        <label>Cliente selecionado acima é usado para listar os veículos.</label>
                    </div>
                    <div class="btn-row">
                        <button class="btn btn-secondary" onclick="Clientes.listarVeiculos()">Listar Veículos do Cliente Selecionado</button>
                    </div>
                </div>

                <div class="card full-width">
                    <div class="card-header-actions">
                        <h3>🚗 Veículos</h3>
                    </div>
                    <div id="veiculos-results" class="results-area">
                        <p class="placeholder">Selecione um cliente para ver seus veículos.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    const switchTab = (tab) => {
        document.querySelectorAll('#contentArea .sub-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`#contentArea .sub-tab[data-subtab="${tab}"]`)?.classList.add('active');
        document.querySelectorAll('#contentArea .sub-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`subtab-${tab}`)?.classList.add('active');
    };

    // ── Seletores de Pessoa ──
    const abrirModalPessoas = async () => {
        document.getElementById('cli-pessoa-modal').style.display = 'flex';
        const listEl = document.getElementById('cli-pessoa-list');
        listEl.innerHTML = '<div class="loading-spinner">⏳ Carregando pessoas...</div>';

        const urls = API.getUrls();
        // Assuming Pessoa Service is mapped or we have to use the gateway/customer if it proxies? 
        // Based on previous code, js/pessoas.js exists. Using customer service endpoint typically.
        // Actually, Pessoas might be in Customer Service? Let's check `API.getPessoaNome` logic in `js/clientes.js`.
        // It likely calls /api/v1/pessoas.

        try {
            const r = await API.http('GET', `${urls.customer}/api/v1/pessoas`);
            if (r.ok) {
                const lista = Array.isArray(r.data) ? r.data : (r.data.content || []);
                _pessoasCache = lista; // Cache for filtering locally
                renderListaPessoas(lista);
            } else {
                listEl.innerHTML = '<p class="placeholder">Erro ao carregar pessoas.</p>';
            }
        } catch (e) {
            listEl.innerHTML = '<p class="placeholder">Erro de conexão.</p>';
        }
    };

    let _pessoasCache = [];
    const filtrarPessoas = (term) => {
        if (!_pessoasCache) return;
        const lower = term.toLowerCase();
        const filtered = _pessoasCache.filter(p =>
            (p.nome || '').toLowerCase().includes(lower) ||
            (p.documento || '').includes(term)
        );
        renderListaPessoas(filtered);
    };

    const renderListaPessoas = (lista) => {
        const listEl = document.getElementById('cli-pessoa-list');
        if (!lista || lista.length === 0) {
            listEl.innerHTML = '<p class="placeholder">Nenhuma pessoa encontrada.</p>';
            return;
        }
        listEl.innerHTML = lista.map(p => `
            <div class="list-item" onclick="Clientes.selecionarPessoa('${p.id}', '${p.nome}', '${p.documento}')">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${p.nome}</strong>
                    <span class="badge badge-${p.tipo || 'PF'}">${p.tipo || 'PF'}</span>
                </div>
                <div style="font-size: 11px; color: var(--text-muted);">
                    Doc: ${p.documento || '—'}
                </div>
            </div>
        `).join('');
    };

    const selecionarPessoa = (id, nome, doc) => {
        _selectedPessoaForCliente = { id, nome, doc };
        document.getElementById('cliente-pessoaId').value = id;
        document.getElementById('cliente-pessoa-display').value = `${nome} (${doc})`;
        document.getElementById('cli-pessoa-modal').style.display = 'none';
    };

    const limparSelecaoPessoa = () => {
        _selectedPessoaForCliente = null;
        document.getElementById('cliente-pessoaId').value = '';
        document.getElementById('cliente-pessoa-display').value = '';
    };

    // ── Seletores de Cliente (para Veículo) ──
    const abrirModalClientes = async () => {
        document.getElementById('vei-cliente-modal').style.display = 'flex';
        const listEl = document.getElementById('vei-cliente-list');
        listEl.innerHTML = '<div class="loading-spinner">⏳ Carregando clientes...</div>';

        const urls = API.getUrls();
        try {
            const r = await API.http('GET', `${urls.customer}/api/v1/clientes`);
            if (r.ok) {
                const lista = Array.isArray(r.data) ? r.data : (r.data.content || []);
                // Enrich with Person names
                const enriched = await Promise.all(lista.map(async c => {
                    const nome = await API.getPessoaNome(c.pessoaId);
                    return { ...c, nomePessoa: nome };
                }));
                _clientesCache = enriched;
                renderListaClientesModal(enriched);
            } else {
                listEl.innerHTML = '<p class="placeholder">Erro ao carregar clientes.</p>';
            }
        } catch (e) {
            listEl.innerHTML = '<p class="placeholder">Erro de conexão.</p>';
        }
    };

    let _clientesCache = [];
    const filtrarClientesModal = (term) => {
        if (!_clientesCache) return;
        const lower = term.toLowerCase();
        const filtered = _clientesCache.filter(c =>
            (c.nomePessoa || '').toLowerCase().includes(lower) ||
            (c.email || '').toLowerCase().includes(lower)
        );
        renderListaClientesModal(filtered);
    };

    const renderListaClientesModal = (lista) => {
        const listEl = document.getElementById('vei-cliente-list');
        if (!lista || lista.length === 0) {
            listEl.innerHTML = '<p class="placeholder">Nenhum cliente encontrado.</p>';
            return;
        }
        listEl.innerHTML = lista.map(c => `
            <div class="list-item" onclick="Clientes.selecionarClienteForVeiculo('${c.id}', '${c.nomePessoa}')">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${c.nomePessoa || 'Cliente Sem Nome'}</strong>
                    <span class="badge badge-CLIENTE">CLIENTE</span>
                </div>
                <div style="font-size: 11px; color: var(--text-muted);">
                    ID: ${API.formatId(c.id)} • ${c.email || ''}
                </div>
            </div>
        `).join('');
    };

    const selecionarClienteForVeiculo = (id, nome) => {
        _selectedClienteForVeiculo = { id, nome };
        document.getElementById('veiculo-clienteId').value = id;
        document.getElementById('veiculo-cliente-display').value = `${nome} (ID: ${API.formatId(id)})`;
        document.getElementById('vei-cliente-modal').style.display = 'none';

        // Auto list vehicles
        listarVeiculos();
    };

    const limparSelecaoCliente = () => {
        _selectedClienteForVeiculo = null;
        document.getElementById('veiculo-clienteId').value = '';
        document.getElementById('veiculo-cliente-display').value = '';
        document.getElementById('veiculos-results').innerHTML = '<p class="placeholder">Selecione um cliente para ver seus veículos.</p>';
    };

    // ── Renderizadores (CRUD) ──
    const renderCliente = async (c) => {
        const shortId = API.formatId(c.id);
        const pessoaNome = await API.getPessoaNome(c.pessoaId) || '—';

        return `
        <div class="result-card">
            <div class="result-header">
                <span class="result-id" onclick="navigator.clipboard.writeText('${c.id}');API.toast('ID copiado!','success')" title="Clique para copiar ID Completo: ${c.id}">${shortId}</span>
                <span class="badge badge-CLIENTE">CLIENTE</span>
            </div>
            <div class="result-grid">
                <span class="result-label">Pessoa</span>
                <span class="result-value" title="${c.pessoaId}">${pessoaNome}</span>
                <span class="result-label">Nome</span>
                <span class="result-value">${c.nome || c.name || '—'}</span>
                <span class="result-label">Email</span>
                <span class="result-value">${c.email || '—'}</span>
                <span class="result-label">Criado em</span>
                <span class="result-value">${API.formatDate(c.createdAt)}</span>
            </div>
            <div class="result-actions">
                <button class="btn btn-secondary btn-sm" onclick="Clientes.selecionarClienteParaListar('${c.id}', '${pessoaNome}')">🚗 Ver Veículos</button>
                <button class="btn btn-danger btn-sm" onclick="Clientes.deletarCliente('${c.id}')">🗑 Excluir</button>
            </div>
        </div>
        `;
    };

    const renderVeiculo = async (v, clienteId) => {
        const shortId = API.formatId(v.id);

        return `
        <div class="result-card">
            <div class="result-header">
                <span class="result-id" onclick="navigator.clipboard.writeText('${v.id}');API.toast('ID copiado!','success')" title="Clique para copiar ID Completo: ${v.id}">${shortId}</span>
                <span class="badge badge-VEICULO">${v.marca} ${v.modelo}</span>
            </div>
            <div class="result-grid">
                <span class="result-label">Placa</span>
                <span class="result-value font-mono">${v.placa || '—'}</span>
                <span class="result-label">Marca/Modelo</span>
                <span class="result-value">${v.marca || ''} ${v.modelo || ''}</span>
                <span class="result-label">Ano</span>
                <span class="result-value">${v.ano || '—'}</span>
                <span class="result-label">Cor</span>
                <span class="result-value">${v.cor || '—'}</span>
                <span class="result-label">Renavam</span>
                <span class="result-value">${v.renavam || '—'}</span>
                <span class="result-label">Chassi</span>
                <span class="result-value">${v.chassi || '—'}</span>
            </div>
            <div class="result-actions">
                <button class="btn btn-secondary btn-sm" onclick="Clientes.selecionarParaOS('${v.id}','${clienteId}')">📋 Usar em OS</button>
                <button class="btn btn-danger btn-sm" onclick="Clientes.deletarVeiculo('${clienteId}','${v.id}')">🗑 Excluir</button>
            </div>
        </div>
        `;
    };

    const renderList = async (list, renderFn, extraArg) => {
        const items = Array.isArray(list) ? list : (list?.content || []);
        if (items.length === 0) return '<p class="placeholder">Nenhum resultado encontrado.</p>';
        const promises = items.map(item => renderFn(item, extraArg));
        return (await Promise.all(promises)).join('');
    };

    const val = (id) => document.getElementById(id)?.value?.trim() || '';

    // ── Ações de Clientes ──
    const criar = async () => {
        const pessoaId = val('cliente-pessoaId');
        if (!pessoaId) return API.toast('Selecione uma pessoa.', 'error');
        const urls = API.getUrls();
        const r = await API.http('POST', `${urls.customer}/api/v1/clientes`, { pessoaId });
        if (r.ok) {
            API.toast('Cliente registrado!', 'success');
            listarTodos();
            limparSelecaoPessoa();
        }
    };

    const buscarPorId = async () => {
        // Deprecated or redirect to filter
        const term = val('cliente-filter-input');
        if (term) filtrarClientesMain(term);
    };

    const listarTodos = async () => {
        const resEl = document.getElementById('clientes-results');
        if (resEl) resEl.innerHTML = '<div class="loading-spinner">⏳ Carregando...</div>';

        const urls = API.getUrls();
        try {
            const r = await API.http('GET', `${urls.customer}/api/v1/clientes`);
            if (r.ok) {
                let lista = Array.isArray(r.data) ? r.data : (r.data.content || []);
                // Enrich with Person names for searching
                lista = await Promise.all(lista.map(async c => {
                    // optimization: cache person names if possible, but for now fetch or check cache
                    // The original code fetched name inside render. We can do it here or let render do it.
                    // To filter by name, we need it here.
                    const nome = await API.getPessoaNome(c.pessoaId);
                    return { ...c, nomePessoa: nome };
                }));

                _cliCache = lista;
                if (resEl) resEl.innerHTML = await renderList(lista, renderCliente);

                // Re-filter if input has value
                const term = val('cliente-filter-input');
                if (term) filtrarClientesMain(term);

            } else {
                if (resEl) resEl.innerHTML = `<div class="result-card"><p style="color:var(--error)">❌ Erro ao listar: ${r.status}</p></div>`;
            }
        } catch (e) {
            if (resEl) resEl.innerHTML = '<p class="placeholder">Erro de conexão.</p>';
        }
    };

    const filtrarClientesMain = (term) => {
        if (!_cliCache) return;
        const lower = term.toLowerCase();
        const filtered = _cliCache.filter(c =>
            (c.nomePessoa || '').toLowerCase().includes(lower) ||
            (c.email || '').toLowerCase().includes(lower) ||
            (c.id || '').toLowerCase().includes(lower) ||
            (c.pessoaId || '').toLowerCase().includes(lower)
        );
        renderList(filtered, renderCliente).then(html => {
            document.getElementById('clientes-results').innerHTML = html;
        });
    };

    const deletarCliente = async (id) => {
        if (!confirm('Excluir este cliente?')) return;
        const urls = API.getUrls();
        const r = await API.http('DELETE', `${urls.customer}/api/v1/clientes/${id}`);
        if (r.ok || r.status === 204) {
            API.toast('Cliente excluído!', 'success');
            listarTodos();
        }
    };

    // Auxiliary function when clicking "Ver Veículos" in Client List
    const selecionarClienteParaListar = (clienteId, nome) => {
        switchTab('veiculos');
        selecionarClienteForVeiculo(clienteId, nome);
    };

    // ── Ações de Veículos ──
    const criarVeiculo = async () => {
        const clienteId = val('veiculo-clienteId');
        if (!clienteId) return API.toast('Selecione um cliente proprietário.', 'error');

        const body = {
            placa: val('veiculo-placa'),
            marca: val('veiculo-marca'),
            modelo: val('veiculo-modelo'),
            ano: parseInt(val('veiculo-ano')) || null,
            cor: val('veiculo-cor') || null,
            renavam: val('veiculo-renavam') || null,
            chassi: val('veiculo-chassi') || null,
        };
        if (!body.placa || !body.marca || !body.modelo || !body.ano) {
            return API.toast('Preencha placa, marca, modelo e ano.', 'error');
        }

        const urls = API.getUrls();
        const r = await API.http('POST', `${urls.customer}/api/v1/clientes/${clienteId}/veiculos`, body);
        if (r.ok) {
            API.toast('Veículo registrado!', 'success');
            listarVeiculos();
            // Clear vehicle fields but keep client selected
            ['veiculo-placa', 'veiculo-marca', 'veiculo-modelo', 'veiculo-ano', 'veiculo-cor', 'veiculo-renavam', 'veiculo-chassi'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
        }
    };

    const listarVeiculos = async () => {
        const clienteId = val('veiculo-clienteId');
        const resEl = document.getElementById('veiculos-results');

        if (!clienteId) {
            if (resEl) resEl.innerHTML = '<p class="placeholder">Selecione um cliente para ver seus veículos.</p>';
            return;
        }

        if (resEl) resEl.innerHTML = '<div class="loading-spinner">⏳ Carregando veículos...</div>';

        const urls = API.getUrls();
        try {
            const r = await API.http('GET', `${urls.customer}/api/v1/clientes/${clienteId}/veiculos`);
            if (r.ok) {
                const lista = Array.isArray(r.data) ? r.data : (r.data.content || []);
                _veiCache = lista;
                resEl.innerHTML = await renderList(lista, renderVeiculo, clienteId);
            } else {
                resEl.innerHTML = '<p class="placeholder">Nenhum veículo encontrado.</p>';
            }
        } catch (e) {
            resEl.innerHTML = '<p class="placeholder">Erro de conexão.</p>';
        }
    };

    const deletarVeiculo = async (clienteId, veiculoId) => {
        if (!confirm('Excluir este veículo?')) return;
        const urls = API.getUrls();
        const r = await API.http('DELETE', `${urls.customer}/api/v1/clientes/${clienteId}/veiculos/${veiculoId}`);
        if (r.ok || r.status === 204) {
            API.toast('Veículo excluído!', 'success');
            listarVeiculos();
        }
    };

    // Cross-module linking
    const selecionarParaOS = (veiculoId, clienteId) => {
        // Switch to OS tab and Pre-fill
        App.navigateTo('os');
        setTimeout(() => {
            // We need to trigger the selection logic in OS module if possible, or just fill hidden fields
            // BUT OS module now has selectors. So we should probably try to set them.
            // This requires OS module to expose a 'preselect' method.
            if (window.OS && OS.preencherSelecaoExterno) {
                OS.preencherSelecaoExterno(clienteId, veiculoId);
            } else {
                API.toast('Vá para a aba OS e selecione este veiculo/cliente', 'info');
            }
        }, 100);
    };

    const criarClienteComPessoa = async (pessoaId) => {
        switchTab('clientes');
        // Pre-fill person selection
        // We need name and doc. Fetch if not available or just pass ID and let the logic handle?
        // selecionarPessoa(id, nome, doc) updates the UI.

        const urls = API.getUrls();
        try {
            API.toast('Carregando dados da pessoa...', 'info');
            const r = await API.http('GET', `${urls.people}/api/v1/pessoas/${pessoaId}`);
            if (r.ok) {
                const p = r.data;
                selecionarPessoa(p.id, p.name, p.numeroDocumento);
                API.toast('Pessoa selecionada! Clique em "Registrar Cliente" para concluir.', 'success');
            } else {
                API.toast('Erro ao buscar pessoa.', 'error');
            }
        } catch (e) {
            console.error(e);
            API.toast('Erro de conexão.', 'error');
        }
    };

    return {
        render, switchTab, criar, buscarPorId, listarTodos,
        deletarCliente, selecionarClienteParaListar,
        criarVeiculo, listarVeiculos, deletarVeiculo,
        selecionarParaOS, criarClienteComPessoa,
        // Selectors
        abrirModalPessoas, selecionarPessoa, limparSelecaoPessoa, filtrarPessoas,
        abrirModalClientes, selecionarClienteForVeiculo, limparSelecaoCliente, filtrarClientesModal,
        filtrarClientesMain
    };
})();
