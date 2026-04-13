// Função de Login
function login() {
  const user = document.getElementById("user").value;
  const pass = document.getElementById("pass").value;

  if (user === "admin" && pass === "12345") {
    localStorage.setItem("loggedIn", "true");

    // Exibe o painel de controle
    document.getElementById("login-screen").style.display = "none";
    const dashboard = document.getElementById("dashboard");
    dashboard.style.display = "block";
    dashboard.classList.add("show");

    // Adicionando log de verificação
    console.log('Login bem-sucedido!');
    salvarUltimoAcesso();
  } else {
    alert("Usuário ou senha incorretos.");
  }
}

// Função para verificar o login ao carregar a página
window.onload = function () {
  const loggedIn = localStorage.getItem("loggedIn");
  const loginScreen = document.getElementById("login-screen");
  const dashboard = document.getElementById("dashboard");

  console.log('Status do Login:', loggedIn);  // Verifique se está retornando "true"

  if (loggedIn === "true") {
    loginScreen.style.display = "none";
    dashboard.style.display = "block";
    dashboard.classList.add("show");
    console.log("Dashboard deve ser exibido.");
  } else {
    loginScreen.style.display = "block";
    dashboard.style.display = "none";
  }

  // Carregar memórias e herdeiros fictícios
  const memoriasFicticias = [
    "Senha de banco: 1234-5678-9012",
    "Mensagem para o amor da minha vida: Eu te amo!",
    "Documentos importantes: Contrato de trabalho",
    "Chave de criptografia: 89b7c7f1a2",
  ];

  if (!localStorage.getItem("cofre")) {
    localStorage.setItem("cofre", JSON.stringify(memoriasFicticias.map(item => criptografar(item))));
  }

  const herdeiroFicticio = "herdeiro@exemplo.com";
  if (!localStorage.getItem("herdeiro")) {
    localStorage.setItem("herdeiro", herdeiroFicticio);
  }

  atualizarLista();
  atualizarHerdeiro();
};

// Função para salvar data do último acesso
function salvarUltimoAcesso() {
  const agora = new Date().toISOString();
  localStorage.setItem("ultimoAcesso", agora);
}

function estouAtivo() {
  alert("Sistema ativo. Tudo funcionando normalmente.");
}

function simularAusencia() {
  alert("Ausência simulada. O herdeiro será notificado em caso de inatividade.");
}

function mostrarUltimoAcesso() {
  const ultimoAcesso = localStorage.getItem("ultimoAcesso");

  if (ultimoAcesso) {
    alert(`Último acesso: ${new Date(ultimoAcesso).toLocaleString()}`);
  } else {
    alert("Ainda não há registro de último acesso.");
  }
}

function logout() {
  localStorage.removeItem("loggedIn");
  const loginScreen = document.getElementById("login-screen");
  const dashboard = document.getElementById("dashboard");

  loginScreen.style.display = "block";
  dashboard.style.display = "none";
  dashboard.classList.remove("show");
}

// Evento para visualizar mídia antes de salvar
document.addEventListener("DOMContentLoaded", function () {
  const mediaInput = document.getElementById("media");
  const mediaPreview = document.getElementById("media-preview");

  if (mediaInput) {
    mediaInput.addEventListener("change", function () {
      mediaPreview.innerHTML = "";

      if (this.files.length > 0) {
        const file = this.files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
          if (file.type.startsWith("image/")) {
            const img = document.createElement("img");
            img.src = e.target.result;
            img.alt = "Preview";
            mediaPreview.appendChild(img);
          } else if (file.type.startsWith("video/")) {
            const video = document.createElement("video");
            video.src = e.target.result;
            video.controls = true;
            video.width = 300;
            mediaPreview.appendChild(video);
          }
        };

        reader.readAsDataURL(file);
      }
    });
  }
});

// Função para criptografar as memórias
function criptografar(texto) {
  return btoa(texto);
}

// Função para descriptografar as memórias
function descriptografar(texto) {
  return atob(texto);
}

// Função para salvar memória
function salvarDado() {
  const input = document.getElementById("info");
  const fileInput = document.getElementById("media");
  const valor = input.value;

  if (valor === "") {
    alert("Digite uma memória!");
    return;
  }

  const criptografado = criptografar(valor);

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      const mediaData = {
        texto: criptografado,
        arquivo: e.target.result,
        tipo: file.type
      };

      let dados = JSON.parse(localStorage.getItem("cofre")) || [];
      dados.push(mediaData);
      localStorage.setItem("cofre", JSON.stringify(dados));

      input.value = "";
      fileInput.value = "";
      document.getElementById("media-preview").innerHTML = "";

      atualizarLista();
    };

    reader.readAsDataURL(file);
  } else {
    const dados = JSON.parse(localStorage.getItem("cofre")) || [];
    dados.push(criptografado);
    localStorage.setItem("cofre", JSON.stringify(dados));

    input.value = "";
    fileInput.value = "";
    document.getElementById("media-preview").innerHTML = "";

    atualizarLista();
  }
}


// Função para atualizar a lista de memórias
function atualizarLista() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  let dados = JSON.parse(localStorage.getItem("cofre")) || [];

  if (dados.length === 0) {
    lista.innerHTML = "<li>Nenhuma memória salva</li>";
    return;
  }

  dados.forEach((item, index) => {
    const li = document.createElement("li");

    if (typeof item === "string") {
      // Memória antiga (apenas texto criptografado)
      li.textContent = descriptografar(item);
    } else if (typeof item === "object" && item.arquivo) {
      // Memória com arquivo
      const div = document.createElement("div");
      div.className = "memoria-item";

      const textoDiv = document.createElement("div");
      textoDiv.className = "memoria-texto";
      textoDiv.textContent = descriptografar(item.texto);
      div.appendChild(textoDiv);

      const mediaDiv = document.createElement("div");
      mediaDiv.className = "memoria-media";

      if (item.tipo.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = item.arquivo;
        img.alt = "Foto da memória";
        mediaDiv.appendChild(img);
      } else if (item.tipo.startsWith("video/")) {
        const video = document.createElement("video");
        video.src = item.arquivo;
        video.controls = true;
        video.width = 280;
        mediaDiv.appendChild(video);
      }

      div.appendChild(mediaDiv);
      li.appendChild(div);
    }

    lista.appendChild(li);
  });
}


// Função para salvar o contato do herdeiro
function salvarHerdeiro() {
  const email = document.getElementById("herdeiro").value;
  
  if (email === "") {
    alert("Digite o email do herdeiro!");
    return;
  }
  
  // Salva o email no localStorage
  localStorage.setItem("herdeiro", email);
  
  // Atualiza a interface
  document.getElementById("herdeiro").value = ""; // Limpa o campo
  atualizarHerdeiro();
}

function atualizarHerdeiro() {
  const herdeiro = localStorage.getItem("herdeiro");
  const herdeiroExibido = document.getElementById("herdeiro-exibido");

  if (herdeiro) {
    herdeiroExibido.textContent = `Herança será enviada para: ${herdeiro}`;
  } else {
    herdeiroExibido.textContent = "Nenhum herdeiro registrado.";
  }
}