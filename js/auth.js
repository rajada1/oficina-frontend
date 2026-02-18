/* ═══════════════════════════════════════════════════════
   Auth Module — JWT Token Generation & Management
   ═══════════════════════════════════════════════════════ */

const AuthModule = (() => {
    // O Gateway e serviços usam: Base64.getDecoder().decode(secret) + Keys.hmacShaKeyFor()
    // Ou seja, o secret é Base64-encoded e decodificado antes de ser usado como chave HMAC
    const DEFAULT_SECRET = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkwYWJjZGVmZw==';

    const STORAGE_KEY = 'oficina-auth';

    // ── Helpers JWT ──
    const base64UrlEncode = (str) => {
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    const base64UrlEncodeBytes = (bytes) => {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    const textToBytes = (text) => new TextEncoder().encode(text);

    // Decodifica uma string Base64 (padrão) para Uint8Array
    const base64ToBytes = (base64Str) => {
        const binaryStr = atob(base64Str);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        return bytes;
    };

    // ── Gerar JWT com Web Crypto API (HMAC-SHA256) ──
    const generateJWT = async (claims, secretStr) => {
        const secret = secretStr || getSecret();

        const header = { alg: 'HS256', typ: 'JWT' };
        const now = Math.floor(Date.now() / 1000);

        const payload = {
            ...claims,
            iat: now,
            exp: now + (24 * 60 * 60), // 24 horas
        };

        const headerB64 = base64UrlEncode(JSON.stringify(header));
        const payloadB64 = base64UrlEncode(JSON.stringify(payload));
        const signingInput = `${headerB64}.${payloadB64}`;

        // Importar chave HMAC-SHA256 (decodifica Base64 como o Gateway e serviços Java)
        const keyData = base64ToBytes(secret);
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, textToBytes(signingInput));
        const signatureB64 = base64UrlEncodeBytes(new Uint8Array(signatureBuffer));

        return `${signingInput}.${signatureB64}`;
    };

    // ── Storage ──
    const getAuthData = () => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
        } catch {
            return null;
        }
    };

    const setAuthData = (data) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    };

    const clearAuthData = () => {
        localStorage.removeItem(STORAGE_KEY);
    };

    const getSecret = () => {
        try {
            const stored = localStorage.getItem('oficina-jwt-secret');
            return stored || DEFAULT_SECRET;
        } catch {
            return DEFAULT_SECRET;
        }
    };

    const setSecret = (secret) => {
        localStorage.setItem('oficina-jwt-secret', secret);
    };

    const getToken = () => {
        const auth = getAuthData();
        return auth?.token || null;
    };

    const isAuthenticated = () => {
        const auth = getAuthData();
        if (!auth?.token) return false;
        // Verificar expiração
        try {
            const payload = JSON.parse(atob(auth.token.split('.')[1]));
            return payload.exp > Math.floor(Date.now() / 1000);
        } catch {
            return false;
        }
    };

    // ── Login (gerar JWT com claims) ──
    const login = async (userData) => {
        const { nome, pessoaId, numeroDocumento, tipoPessoa, cargo, perfil, role } = userData;

        const claims = {
            sub: nome || 'admin',
            pessoaId: pessoaId || crypto.randomUUID(),
            numeroDocumento: numeroDocumento || '00000000000',
            tipoPessoa: tipoPessoa || 'FUNCIONARIO',
            cargo: cargo || 'GERENTE',
            perfil: perfil || 'ADMIN',
            role: role || 'ADMIN',
        };

        const token = await generateJWT(claims);

        const authData = {
            token,
            user: claims,
            loginAt: new Date().toISOString(),
        };

        setAuthData(authData);
        return authData;
    };

    // ── Logout ──
    const logout = () => {
        clearAuthData();
    };

    // ── Renderizar painel de auth ──
    const render = () => {
        const auth = getAuthData();
        const loggedIn = isAuthenticated();

        if (loggedIn) {
            return renderLoggedIn(auth);
        }
        return renderLoginForm();
    };

    const renderLoginForm = () => `
        <section class="panel active" id="panel-auth">
            <div class="panel-header">
                <h1><span class="accent-settings">●</span> Autenticação</h1>
                <span class="service-tag">JWT / Gateway</span>
            </div>
            <div class="panel-grid">
                <div class="card">
                    <h3>🔐 Login Rápido</h3>
                    <p class="form-hint">Selecione um perfil pré-configurado para gerar um token JWT automaticamente.</p>
                    <div class="btn-row" style="flex-wrap:wrap; gap:8px;">
                        <button class="btn btn-primary" onclick="AuthModule.quickLogin('ADMIN')">👑 Admin</button>
                        <button class="btn btn-success" onclick="AuthModule.quickLogin('MECANICO')">🔧 Mecânico</button>
                        <button class="btn btn-accent" onclick="AuthModule.quickLogin('ATENDENTE')">📋 Atendente</button>
                        <button class="btn btn-warning" onclick="AuthModule.quickLogin('GERENTE')">💼 Gerente</button>
                    </div>
                </div>
                <div class="card">
                    <h3>🔑 Login Personalizado</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Nome / Username</label>
                            <input type="text" id="auth-nome" placeholder="admin" value="admin">
                        </div>
                        <div class="form-group">
                            <label>Perfil</label>
                            <select id="auth-perfil">
                                <option value="ADMIN">Admin</option>
                                <option value="GERENTE">Gerente</option>
                                <option value="MECANICO">Mecânico</option>
                                <option value="ATENDENTE">Atendente</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Tipo Pessoa</label>
                            <select id="auth-tipoPessoa">
                                <option value="FUNCIONARIO">Funcionário</option>
                                <option value="CLIENTE">Cliente</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Cargo</label>
                            <input type="text" id="auth-cargo" placeholder="GERENTE" value="GERENTE">
                        </div>
                        <div class="form-group">
                            <label>Documento (CPF)</label>
                            <input type="text" id="auth-documento" placeholder="00000000000" value="00000000000">
                        </div>
                        <div class="form-group">
                            <label>Role (Gateway)</label>
                            <select id="auth-role">
                                <option value="ADMIN">ADMIN</option>
                                <option value="USER">USER</option>
                                <option value="MECANICO">MECANICO</option>
                            </select>
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="AuthModule.customLogin()">🔓 Gerar Token & Login</button>
                </div>
                <div class="card full-width">
                    <h3>⚙️ JWT Secret</h3>
                    <p class="form-hint">O secret usado para assinar o JWT. Deve ser o mesmo configurado no Gateway (<code>jwt.secret</code>).</p>
                    <div class="form-group">
                        <label>JWT Secret</label>
                        <input type="text" id="auth-secret" value="${getSecret()}" style="font-size:11px;">
                    </div>
                    <button class="btn btn-ghost" onclick="AuthModule.saveSecret()">💾 Salvar Secret</button>
                </div>
            </div>
        </section>
    `;

    const renderLoggedIn = (auth) => `
        <section class="panel active" id="panel-auth">
            <div class="panel-header">
                <h1><span style="color:var(--success)">●</span> Autenticado</h1>
                <span class="service-tag">JWT Ativo</span>
            </div>
            <div class="panel-grid">
                <div class="card">
                    <h3>✅ Sessão Ativa</h3>
                    <div class="result-card">
                        <div class="result-grid">
                            <span class="result-label">Usuário</span>
                            <span class="result-value">${auth.user?.sub || '—'}</span>
                            <span class="result-label">Perfil</span>
                            <span class="result-value"><span class="badge badge-${auth.user?.perfil}">${auth.user?.perfil || '—'}</span></span>
                            <span class="result-label">Role</span>
                            <span class="result-value">${auth.user?.role || '—'}</span>
                            <span class="result-label">Tipo</span>
                            <span class="result-value">${auth.user?.tipoPessoa || '—'}</span>
                            <span class="result-label">Cargo</span>
                            <span class="result-value">${auth.user?.cargo || '—'}</span>
                            <span class="result-label">Login em</span>
                            <span class="result-value">${auth.loginAt ? new Date(auth.loginAt).toLocaleString('pt-BR') : '—'}</span>
                        </div>
                    </div>
                    <div class="btn-row" style="margin-top:12px;">
                        <button class="btn btn-danger" onclick="AuthModule.doLogout()">🚪 Sair (Logout)</button>
                        <button class="btn btn-ghost" onclick="AuthModule.renewToken()">🔄 Renovar Token</button>
                    </div>
                </div>
                <div class="card">
                    <h3>🔑 Token JWT</h3>
                    <div class="form-group">
                        <label>Bearer Token</label>
                        <textarea id="auth-token-display" rows="6" readonly style="font-size:10px; word-break:break-all;">${auth.token || ''}</textarea>
                    </div>
                    <button class="btn btn-ghost" onclick="navigator.clipboard.writeText(document.getElementById('auth-token-display').value); API.toast('Token copiado!', 'success');">📋 Copiar Token</button>
                </div>
            </div>
        </section>
    `;

    // ── Ações ──
    const quickLogin = async (perfil) => {
        const profiles = {
            ADMIN: { nome: 'admin', perfil: 'ADMIN', tipoPessoa: 'FUNCIONARIO', cargo: 'ADMINISTRADOR', role: 'ADMIN' },
            MECANICO: { nome: 'mecanico', perfil: 'MECANICO', tipoPessoa: 'FUNCIONARIO', cargo: 'MECANICO', role: 'USER' },
            ATENDENTE: { nome: 'atendente', perfil: 'ATENDENTE', tipoPessoa: 'FUNCIONARIO', cargo: 'ATENDENTE', role: 'USER' },
            GERENTE: { nome: 'gerente', perfil: 'GERENTE', tipoPessoa: 'FUNCIONARIO', cargo: 'GERENTE', role: 'ADMIN' },
        };

        const p = profiles[perfil] || profiles.ADMIN;
        await login(p);
        API.toast(`Logado como ${perfil} com sucesso!`, 'success');
        updateAuthIndicator();
        if (typeof App !== 'undefined') App.navigateTo('auth');
    };

    const customLogin = async () => {
        const nome = document.getElementById('auth-nome')?.value?.trim() || 'admin';
        const perfil = document.getElementById('auth-perfil')?.value || 'ADMIN';
        const tipoPessoa = document.getElementById('auth-tipoPessoa')?.value || 'FUNCIONARIO';
        const cargo = document.getElementById('auth-cargo')?.value?.trim() || 'GERENTE';
        const numeroDocumento = document.getElementById('auth-documento')?.value?.trim() || '00000000000';
        const role = document.getElementById('auth-role')?.value || 'ADMIN';

        await login({ nome, perfil, tipoPessoa, cargo, numeroDocumento, role });
        API.toast('Login personalizado com sucesso!', 'success');
        updateAuthIndicator();
        if (typeof App !== 'undefined') App.navigateTo('auth');
    };

    const doLogout = () => {
        logout();
        API.toast('Logout realizado.', 'info');
        updateAuthIndicator();
        if (typeof App !== 'undefined') App.navigateTo('auth');
    };

    const renewToken = async () => {
        const auth = getAuthData();
        if (auth?.user) {
            await login(auth.user);
            API.toast('Token renovado!', 'success');
            if (typeof App !== 'undefined') App.navigateTo('auth');
        }
    };

    const saveSecret = () => {
        const secret = document.getElementById('auth-secret')?.value?.trim();
        if (secret) {
            setSecret(secret);
            API.toast('JWT Secret salvo!', 'success');
        }
    };

    const updateAuthIndicator = () => {
        const indicator = document.getElementById('auth-indicator');
        if (indicator) {
            if (isAuthenticated()) {
                const auth = getAuthData();
                indicator.classList.add('authenticated');
                indicator.innerHTML = `🟢 ${auth?.user?.sub || 'user'}`;
                indicator.title = `Logado como ${auth?.user?.sub} (${auth?.user?.perfil})`;
            } else {
                indicator.classList.remove('authenticated');
                indicator.innerHTML = '🔴 Não autenticado';
                indicator.title = 'Clique em Auth para fazer login';
            }
        }
    };

    return {
        render,
        login,
        logout,
        getToken,
        isAuthenticated,
        quickLogin,
        customLogin,
        doLogout,
        renewToken,
        saveSecret,
        updateAuthIndicator,
        getSecret,
        setSecret,
        generateJWT,
    };
})();
