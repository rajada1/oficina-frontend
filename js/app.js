/**
 * ═══════════════════════════════════════════════════════
 *  Oficina Digital — Frontend Orchestrator (App.js)
 *  Responsável por:
 *  - Navegação entre painéis (Abas)
 *  - Inicialização dos módulos
 *  - Gerenciamento de estado global (Auth, Loading)
 * ═══════════════════════════════════════════════════════
 */

const App = (() => {
    // Estado interno da aplicação
    const state = {
        activePanel: 'os', // Painel inicial padrão
    };

    /**
     * Inicializa a aplicação
     */
    const init = () => {
        console.log('🚀 Oficina Frontend Starting...');

        // 1. Inicializa Navegação
        initNav();

        // 2. Inicializa Console (Toggle)
        initConsole();

        // 3. Checa Autenticação e redireciona se necessário
        checkAuthAndLoad();

        // 4. Configura listeners globais se houver (ex: teclas de atalho)
        setupGlobalListeners();
    };

    /**
     * Configura a navegação da Sidebar
     */
    const initNav = () => {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Previne navegação se não estiver autenticado (exceto settings e auth)
                const targetPanel = item.dataset.panel;
                if (!AuthModule.isAuthenticated() && targetPanel !== 'auth' && targetPanel !== 'settings') {
                    API.toast('Faça login para acessar este módulo.', 'warning');
                    navigateTo('auth');
                    return;
                }
                navigateTo(targetPanel);
            });
        });
    };

    /**
     * Configura o Console HTTP (Toggle)
     */
    const initConsole = () => {
        const toggleBtn = document.getElementById('toggleConsole');
        toggleBtn?.addEventListener('click', API.toggleConsole);

        const clearBtn = document.getElementById('consoleClearBtn');
        clearBtn?.addEventListener('click', API.clearConsole);
    };

    /**
     * Verifica Token e carrega painel inicial
     */
    const checkAuthAndLoad = () => {
        // Atualiza UI de Auth
        AuthModule.updateAuthUI();

        if (AuthModule.isAuthenticated()) {
            // Se logado, vai para o painel padrão ou o último salvo?
            // Por enquanto, vamos para 'os'
            navigateTo('os');
        } else {
            // Se não, manda para auth
            navigateTo('auth');
        }
    };

    /**
     * Navega para um painel específico e renderiza seu conteúdo
     * @param {string} panelId - ID do painel (ex: 'os', 'billing', 'clientes')
     */
    const navigateTo = (panelId) => {
        console.log(`Navigate to: ${panelId}`);
        state.activePanel = panelId;

        // 1. Atualiza Sidebar (classe active)
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.panel === panelId);
        });

        // 2. Renderiza o Conteúdo do Módulo
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = ''; // Limpa anterior

        switch (panelId) {
            case 'os':
                contentArea.innerHTML = OS.render();
                OS.listarTodas(); // Auto-load
                break;
            case 'billing':
                contentArea.innerHTML = Billing.render();
                Billing.listarOrcamentos(); // Auto-load (padrão abre em orçamentos)
                break;
            case 'execution':
                contentArea.innerHTML = Execucao.render();
                Execucao.listarExecucoes(); // Auto-load
                break;
            case 'clientes':
                contentArea.innerHTML = Clientes.render();
                Clientes.listarClientes(); // Auto-load
                break;
            case 'pessoas':
                contentArea.innerHTML = Pessoas.render();
                // Pessoas geralmente tem busca, mas podemos listar recentes ou nada
                break;
            case 'catalogo':
                contentArea.innerHTML = Catalogo.render();
                Catalogo.listarPecas(); // Auto-load (padrão abre em peças)
                break;
            case 'saga':
                contentArea.innerHTML = Saga.render();
                // Saga não precisa carregar lista, mantém estado visual
                break;
            case 'auth':
                contentArea.innerHTML = AuthModule.render();
                break;
            case 'settings':
                contentArea.innerHTML = SettingsModule.render();
                break;
            default:
                contentArea.innerHTML = '<h1>404 - Módulo não encontrado</h1>';
        }
    };

    const setupGlobalListeners = () => {
        // Exemplo: ESC para fechar modais (se houver)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Lógica de fechar modal genérico se implementado
            }
        });
    };

    // Public API
    return {
        init,
        navigateTo,
        getState: () => state
    };

})();

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', App.init);
