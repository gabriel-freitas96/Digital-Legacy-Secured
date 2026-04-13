import { useEffect, useRef, useState } from 'react';
import CryptoJS from 'crypto-js';
import bcrypt from 'bcryptjs';

const STORAGE_KEYS = {
  loggedIn: 'loggedIn',
  cofre: 'cofre',
  herdeiro: 'herdeiro',
  ultimoAcesso: 'ultimoAcesso',
  historicoAcessos: 'historicoAcessos',
  usuarios: 'usuarios',
  memoriasDesbloqueadas: 'memoriasDesbloqueadas'
};

const memoriasFicticias = [
  'Senha de banco: 1234-5678-9012',
  'Mensagem para o amor da minha vida: Eu te amo!',
  'Documentos importantes: Contrato de trabalho',
  'Chave de criptografia: 89b7c7f1a2',
];

const herdeiroFicticio = 'herdeiro@exemplo.com';

// Função para gerar chave de criptografia baseada no usuário
function gerarChaveCriptografia(email) {
  // Cria uma chave consistente baseada no email do usuário
  return CryptoJS.SHA256(email + 'CipherAegisSalt2024').toString();
}

function criptografar(texto, email = null) {
  if (!email) {
    // Fallback para Base64 se não houver email (compatibilidade)
    return btoa(texto);
  }

  const chave = gerarChaveCriptografia(email);
  return CryptoJS.AES.encrypt(texto, chave).toString();
}

function descriptografar(texto, email = null) {
  if (!email) {
    // Tentar Base64 primeiro (dados antigos)
    try {
      return atob(texto);
    } catch (error) {
      return texto; // Se não for Base64, retornar como está
    }
  }

  try {
    const chave = gerarChaveCriptografia(email);
    const bytes = CryptoJS.AES.decrypt(texto, chave);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    // Se falhar AES, tentar Base64 (dados antigos)
    try {
      return atob(texto);
    } catch (base64Error) {
      return texto;
    }
  }
}

function normalizeItem(item, index = 0) {
  if (typeof item === 'string') {
    return {
      id: Date.now() + index,
      texto: item,
      data: new Date().toISOString()
    };
  }

  if (!item || typeof item !== 'object') {
    return {
      id: Date.now() + index,
      texto: '',
      data: new Date().toISOString()
    };
  }

  // Garante que o item tenha um ID
  if (!item.id) {
    item.id = Date.now() + index;
  }

  // Garante que o item tenha uma data
  if (!item.data) {
    item.data = new Date().toISOString();
  }

  return item;
}

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(''); // Email do usuário logado
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [info, setInfo] = useState('');
  const [herdeiro, setHerdeiro] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [cofre, setCofre] = useState([]);
  const [memoriasDesbloqueadas, setMemoriasDesbloqueadas] = useState(false);
  const [senhaMemorias, setSenhaMemorias] = useState('');
  const [isCadastro, setIsCadastro] = useState(false);
  const [nomeCadastro, setNomeCadastro] = useState('');
  const [emailCadastro, setEmailCadastro] = useState('');
  const [senhaCadastro, setSenhaCadastro] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' ou 'error'
  const fileInputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.cofre);
    let initialCofre = [];

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        initialCofre = Array.isArray(parsed) ? parsed.map((item, index) => normalizeItem(item, index)) : [];
      } catch (error) {
        initialCofre = [];
      }
    }

    if (initialCofre.length === 0) {
      initialCofre = memoriasFicticias.map((texto, index) => ({
        id: Date.now() + index, // Garante IDs únicos para memórias iniciais
        texto: criptografar(texto), // Por enquanto usa Base64, será recriptografado no login
        data: new Date().toISOString()
      }));
      localStorage.setItem(STORAGE_KEYS.cofre, JSON.stringify(initialCofre));
    }

    setCofre(initialCofre);

    const storedHerdeiro = localStorage.getItem(STORAGE_KEYS.herdeiro) || herdeiroFicticio;
    localStorage.setItem(STORAGE_KEYS.herdeiro, storedHerdeiro);
    setHerdeiro(storedHerdeiro);

    setLoggedIn(localStorage.getItem(STORAGE_KEYS.loggedIn) === 'true');

    // Carregar estado das memórias desbloqueadas
    const memoriasDesbloqueadasSalvas = localStorage.getItem(STORAGE_KEYS.memoriasDesbloqueadas) === 'true';
    setMemoriasDesbloqueadas(memoriasDesbloqueadasSalvas);
  }, []);

  useEffect(() => {
    if (cofre.length > 0) {
      localStorage.setItem(STORAGE_KEYS.cofre, JSON.stringify(cofre));
    }
  }, [cofre]);

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const login = async () => {
    if (!user.trim() || !pass.trim()) {
      showMessage('Preencha email e senha!', 'error');
      return;
    }

    if (!validateEmail(user)) {
      showMessage('Email inválido!', 'error');
      return;
    }

    setLoading(true);
    try {
      const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
      console.log(' Usuários salvos:', usuarios.map(u => ({ email: u.email })));
      console.log(' Tentativa de login com:', user);

      // Verificar credenciais admin (para testes)
      if (user === 'admin' && pass === '12345') {
        localStorage.setItem(STORAGE_KEYS.loggedIn, 'true');
        setLoggedIn(true);
        setCurrentUser(user);
        migrarDadosParaAES(user);
        await migrarSenhasParaHash(); // Migrar senhas antigas para hash
        salvarUltimoAcesso();
        setUser('');
        setPass('');
        showMessage('Login realizado com sucesso!');
        setLoading(false);
        return;
      }

      // Procurar usuário cadastrado
      const usuario = usuarios.find(u => u.email === user);

      if (usuario) {
        console.log(' Usuário encontrado:', user);
        // Verificar senha com bcrypt
        const senhaCorreta = await bcrypt.compare(pass, usuario.senha);
        console.log(' Senha correta?', senhaCorreta);

        if (senhaCorreta) {
          localStorage.setItem(STORAGE_KEYS.loggedIn, 'true');
          setLoggedIn(true);
          setCurrentUser(user);
          migrarDadosParaAES(user);
          salvarUltimoAcesso();
          setUser('');
          setPass('');
          showMessage('Login realizado com sucesso!');
        } else {
          console.error(' Senha incorreta para:', user);
          showMessage('Email ou senha incorretos!', 'error');
        }
      } else {
        console.error(' Usuário não encontrado:', user);
        showMessage('Email ou senha incorretos!', 'error');
      }
    } catch (error) {
      console.error(' Erro no login:', error);
      console.error('Stack:', error.stack);
      showMessage('Erro ao fazer login! Veja o console (F12).', 'error');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.loggedIn);
    localStorage.removeItem(STORAGE_KEYS.memoriasDesbloqueadas);
    setLoggedIn(false);
    setCurrentUser(''); // Limpar usuário atual
    setMemoriasDesbloqueadas(false);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      setPreview('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedFile({ arquivo: e.target.result, tipo: file.type });
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const salvarDado = () => {
    if (!info.trim()) {
      showMessage('Digite uma memória!', 'error');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const novoItem = {
        id: Date.now(),
        texto: criptografar(info.trim(), currentUser),
        ...(selectedFile ? { arquivo: selectedFile.arquivo, tipo: selectedFile.tipo } : {}),
        data: new Date().toISOString()
      };

      setCofre((current) => [novoItem, ...current]);
      setInfo('');
      setSelectedFile(null);
      setPreview('');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      showMessage('Memória salva com sucesso!');
      setLoading(false);
    }, 300);
  };

  const salvarHerdeiro = () => {
    if (!herdeiro.trim()) {
      alert('Digite o email do herdeiro!');
      return;
    }

    const email = herdeiro.trim();
    localStorage.setItem(STORAGE_KEYS.herdeiro, email);
    setHerdeiro(email);
    setHerdeiro('');
  };

  const estouAtivo = () => {
    alert('Sistema ativo. Tudo funcionando normalmente.');
  };

  const simularAusencia = () => {
    alert('Ausência simulada. O herdeiro será notificado em caso de inatividade.');
  };

  const excluirMemoria = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta memória?')) {
      setCofre((current) => current.filter(item => item.id !== id));
      showMessage('Memória excluída com sucesso!');
    }
  };

  const editarMemoria = (id) => {
    const memoria = cofre.find(item => item.id === id);
    if (memoria) {
      const novoTexto = prompt('Editar memória:', descriptografar(memoria.texto, currentUser));
      if (novoTexto !== null && novoTexto.trim()) {
        setCofre((current) =>
          current.map(item =>
            item.id === id
              ? { ...item, texto: criptografar(novoTexto.trim(), currentUser) }
              : item
          )
        );
        showMessage('Memória editada com sucesso!');
      }
    }
  };

  const desbloquearMemorias = () => {
    if (senhaMemorias === '1234') {
      setMemoriasDesbloqueadas(true);
      localStorage.setItem(STORAGE_KEYS.memoriasDesbloqueadas, 'true');
      setSenhaMemorias('');
      showMessage('Memórias desbloqueadas com sucesso!');
    } else {
      alert('Senha incorreta para acessar as memórias.');
      setSenhaMemorias('');
    }
  };

  const salvarUltimoAcesso = () => {
    const agora = new Date().toLocaleString();
    const historicoAtual = JSON.parse(localStorage.getItem(STORAGE_KEYS.historicoAcessos) || '[]');

    // Adiciona o novo acesso no início do array
    historicoAtual.unshift({
      data: agora,
      timestamp: Date.now()
    });

    // Mantém apenas os últimos 10 acessos
    const historicoLimitado = historicoAtual.slice(0, 10);

    localStorage.setItem(STORAGE_KEYS.historicoAcessos, JSON.stringify(historicoLimitado));
    localStorage.setItem(STORAGE_KEYS.ultimoAcesso, agora); // Mantém compatibilidade
  };

  const mostrarUltimoAcesso = () => {
    const historico = JSON.parse(localStorage.getItem(STORAGE_KEYS.historicoAcessos) || '[]');
    const ultimoAcesso = localStorage.getItem(STORAGE_KEYS.ultimoAcesso);

    console.log('Histórico completo:', historico);
    console.log('Último acesso:', ultimoAcesso);

    if (historico.length === 0) {
      alert('Nenhum acesso registrado ainda.\n\nDebug: Verifique o console do navegador (F12) para mais detalhes.');
      return;
    }

    let mensagem = '📅 Histórico de Acessos:\n\n';
    historico.forEach((acesso, index) => {
      const numero = index + 1;
      mensagem += `${numero}. ${acesso.data}\n`;
    });

    mensagem += `\nTotal de registros: ${historico.length}`;
    alert(mensagem);
  };

  const migrarDadosParaAES = (email) => {
    const dadosAtuais = JSON.parse(localStorage.getItem(STORAGE_KEYS.cofre) || '[]');
    let dadosMigrados = false;

    const novosDados = dadosAtuais.map(item => {
      // Verificar se o texto está criptografado com Base64 (dados antigos)
      try {
        atob(item.texto);
        // Se conseguiu decodificar Base64, é um dado antigo
        const textoDescriptografado = descriptografar(item.texto); // Sem email = usa Base64
        const novoTextoCriptografado = criptografar(textoDescriptografado, email); // Com email = usa AES
        dadosMigrados = true;
        return { ...item, texto: novoTextoCriptografado };
      } catch (error) {
        // Já está em AES ou não é Base64, manter como está
        return item;
      }
    });

    if (dadosMigrados) {
      localStorage.setItem(STORAGE_KEYS.cofre, JSON.stringify(novosDados));
      setCofre(novosDados);
      console.log(' Dados migrados para criptografia AES segura');
    }
  };

  const migrarSenhasParaHash = async () => {
    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
    let senhasMigradas = false;

    for (let i = 0; i < usuarios.length; i++) {
      const usuario = usuarios[i];

      // Verificar se a senha não está hasheada (não começa com $2)
      if (usuario.senha && !usuario.senha.startsWith('$2')) {
        try {
          // Fazer hash da senha plain text
          const senhaHashed = await bcrypt.hash(usuario.senha, 12);
          usuarios[i].senha = senhaHashed;
          senhasMigradas = true;
          console.log(` Senha migrada para hash para usuário: ${usuario.email}`);
        } catch (error) {
          console.error(` Erro ao migrar senha para ${usuario.email}:`, error);
        }
      }
    }

    if (senhasMigradas) {
      localStorage.setItem('usuarios', JSON.stringify(usuarios));
      console.log(' Migração de senhas concluída');
    }
  };

  const toggleCadastro = () => {
    setIsCadastro(!isCadastro);
    setUser('');
    setPass('');
    setNomeCadastro('');
    setEmailCadastro('');
    setSenhaCadastro('');
  };

  const cadastrar = async () => {
    if (!nomeCadastro.trim() || !emailCadastro.trim() || !senhaCadastro.trim()) {
      showMessage('Preencha todos os campos!', 'error');
      return;
    }

    if (!validateEmail(emailCadastro)) {
      showMessage('Email inválido!', 'error');
      return;
    }

    if (!validatePassword(senhaCadastro)) {
      showMessage('Senha deve ter pelo menos 6 caracteres!', 'error');
      return;
    }

    setLoading(true);
    try {
      const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
      console.log(' Tentando cadastrar:', emailCadastro);
      const usuarioExistente = usuarios.find(u => u.email === emailCadastro);

      if (usuarioExistente) {
        showMessage('Email já cadastrado!', 'error');
        setLoading(false);
        return;
      }

      // Hash da senha com bcrypt (12 rounds)
      const senhaHashed = await bcrypt.hash(senhaCadastro.trim(), 12);
      console.log(' Senha hasheada:', senhaHashed.substring(0, 20) + '...');

      usuarios.push({
        nome: nomeCadastro.trim(),
        email: emailCadastro.trim(),
        senha: senhaHashed
      });

      localStorage.setItem('usuarios', JSON.stringify(usuarios));
      console.log(' Usuário cadastrado com sucesso!');
      showMessage('Cadastro realizado com sucesso!');
      toggleCadastro();
    } catch (error) {
      console.error(' Erro ao fazer hash da senha:', error);
      showMessage('Erro ao cadastrar usuário!', 'error');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="app">
      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
      {!loggedIn ? (
        <div className="panel login-panel">
          <div className="panel-header">
            <h1>CipherAegis</h1>
            <p>Digital Legacy Secured</p>
          </div>
          <div className="panel-body">
            {!isCadastro ? (
              <>
                <label htmlFor="user">Email</label>
                <input
                  id="user"
                  value={user}
                  onChange={(event) => setUser(event.target.value)}
                  placeholder="Email"
                />
                <label htmlFor="pass">Senha</label>
                <input
                  id="pass"
                  type="password"
                  value={pass}
                  onChange={(event) => setPass(event.target.value)}
                  placeholder="Senha"
                />
                <button type="button" onClick={login} disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </>
            ) : (
              <>
                <label htmlFor="nome">Nome</label>
                <input
                  id="nome"
                  value={nomeCadastro}
                  onChange={(event) => setNomeCadastro(event.target.value)}
                  placeholder="Nome completo"
                />
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={emailCadastro}
                  onChange={(event) => setEmailCadastro(event.target.value)}
                  placeholder="Email"
                />
                <label htmlFor="senha">Senha</label>
                <input
                  id="senha"
                  type="password"
                  value={senhaCadastro}
                  onChange={(event) => setSenhaCadastro(event.target.value)}
                  placeholder="Senha"
                />
                <button type="button" onClick={cadastrar} disabled={loading}>
                  {loading ? 'Cadastrando...' : 'Cadastrar'}
                </button>
              </>
            )}
          </div>
          <div className="panel-footer">
            <div className="footer-text">
              {!isCadastro ? "Já tem conta?" : "Não tem conta?"}
            </div>
            <button type="button" className="footer-button" onClick={toggleCadastro}>
              {!isCadastro ? "Cadastre-se" : "Cadastre-se"}
            </button>
          </div>
        </div>
      ) : (
        <div className="panel dashboard-panel show">
          <div className="dashboard-header">
            <div>
              <h1>CipherAegis</h1>
              <p>Guarde e proteja suas memórias e dados importantes</p>
            </div>
            <button type="button" className="logout-button" onClick={logout}>
              Sair
            </button>
          </div>

          <div className="grid">
            <div className="box">
              <h3> Adicionar Memória</h3>
              <input
                value={info}
                onChange={(event) => setInfo(event.target.value)}
                placeholder="Ex: mensagem, senha, documento"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
              />
              <div className="media-preview">
                {preview && selectedFile?.tipo.startsWith('image/') && (
                  <img src={preview} alt="Preview" />
                )}
                {preview && selectedFile?.tipo.startsWith('video/') && (
                  <video src={preview} controls width="300" />
                )}
              </div>
              <button type="button" onClick={salvarDado} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>

            <div className="box">
              <h3> Suas Memórias</h3>
              {!memoriasDesbloqueadas ? (
                <div>
                  <input
                    type="password"
                    value={senhaMemorias}
                    onChange={(event) => setSenhaMemorias(event.target.value)}
                    placeholder="Digite a senha para acessar as memórias"
                  />
                  <button type="button" onClick={desbloquearMemorias}>
                    Desbloquear Memórias
                  </button>
                </div>
              ) : (
                <ul>
                  {cofre.length === 0 ? (
                    <li>Nenhuma memória salva</li>
                  ) : (
                    [...cofre]
                      .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0))
                      .map((item) => (
                        <li key={item.id || `${item.texto}-${Math.random()}`}>
                          <div className="memoria-content">
                            {item.arquivo ? (
                              <div className="memoria-item">
                                <div className="memoria-texto">{descriptografar(item.texto, currentUser)}</div>
                                <div className="memoria-media">
                                  {item.tipo?.startsWith('image/') ? (
                                    <img src={item.arquivo} alt="Foto da memória" />
                                  ) : (
                                    <video src={item.arquivo} controls width="280" />
                                  )}
                                </div>
                              </div>
                            ) : (
                              descriptografar(item.texto, currentUser)
                            )}
                          </div>
                          <div className="memoria-actions">
                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() => editarMemoria(item.id)}
                              title="Editar"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => excluirMemoria(item.id)}
                              title="Excluir"
                            >
                              Excluir
                            </button>
                          </div>
                        </li>
                      ))
                  )}
                </ul>
              )}
            </div>

            <div className="box">
              <h3> Contato do Herdeiro</h3>
              <input
                value={herdeiro}
                onChange={(event) => setHerdeiro(event.target.value)}
                placeholder="Email do herdeiro"
              />
              <p id="herdeiro-exibido">Herança será enviada para: {localStorage.getItem(STORAGE_KEYS.herdeiro) || herdeiroFicticio}</p>
              <button type="button" onClick={salvarHerdeiro}>
                Salvar Herdeiro
              </button>
            </div>
            <div className="box">
              <h3>Status do Sistema</h3>
              <div className="status-buttons">
                <button type="button" onClick={estouAtivo}>
                  Estou ativo 
                </button>
                <button type="button" onClick={simularAusencia}>
                  Simular ausência 
                </button>
                <button type="button" onClick={mostrarUltimoAcesso}>
                  Último acesso
                </button>
              </div>
            </div>
          </div>
        </div>
        
      )}
    </div>
  );
}

export default App;
