/* ==========================================================================
   REABILITE APP - Motor Lógico (Frontend)
   ========================================================================== */

// 1. ESTADO GLOBAL DA APLICAÇÃO (CACHE LOCAL)
// Aqui guardamos os dados do aluno enquanto o app está aberto.
let appState = {
  user: {
    id: "user_luan_01",
    name: "Luan de Oliveira",
    level: "Elite Reabilite",
    xp: 320,
    streak: 5,
    totalWorkouts: 24,
    waterTarget: 3000,
    waterConsumed: 1500
  },
  // COLE AQUI A URL DO SEU DEPLOY DO GOOGLE APPS SCRIPT QUANDO ESTIVER PRONTO:
  webAppUrl: "" 
};

// 2. INICIALIZAÇÃO
// Assim que o HTML termina de carregar, rodamos as funções de setup.
document.addEventListener("DOMContentLoaded", () => {
  loadProfileData();
  console.log("Reabilite App inicializado com sucesso.");
});

// 3. ROTEAMENTO (SPA - SINGLE PAGE APPLICATION)
// Alterna entre as telas (Dashboard, ReabiCheck, Treinos, etc.) sem recarregar a página.
function switchView(viewId, element) {
  // Esconde todas as views
  document.querySelectorAll('.app-view').forEach(view => {
    view.classList.remove('active-view');
  });
  
  // Remove a classe "active" de todos os botões do menu (Desktop e Mobile)
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
    item.classList.remove('active');
  });

  // Mostra a view solicitada
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) {
    targetView.classList.add('active-view');
    
    // Atualiza o título do cabeçalho dinamicamente
    const titleMap = {
      'dashboard': 'Dashboard Inicial',
      'reabicheck': 'Módulo ReabiCheck',
      'treinos': 'Área Exclusiva de Treinamento',
      'habitos': 'Sistema de Hábitos Integrativos',
      'ranking': 'Classificação da Comunidade',
      'professor': 'Painel de Gestão e Análise'
    };
    const titleElement = document.getElementById('view-title');
    if(titleElement) titleElement.textContent = titleMap[viewId] || 'Reabilite App';
  }

  // Marca o botão clicado como ativo
  if(element) {
    element.classList.add('active');
  }
}

// 4. ATUALIZAÇÃO DA INTERFACE (UI)
// Preenche o HTML com os dados que estão no appState
function loadProfileData() {
  const elName = document.getElementById('header-user-name');
  const elLevel = document.getElementById('header-user-level');
  const elAvatar = document.getElementById('header-avatar');
  const elStreak = document.getElementById('dash-streak');
  const elTotal = document.getElementById('dash-total-workouts');

  if(elName) elName.textContent = appState.user.name;
  if(elLevel) elLevel.textContent = appState.user.level;
  if(elAvatar) elAvatar.textContent = appState.user.name.charAt(0);
  
  if(elStreak) {
    elStreak.innerHTML = `${appState.user.streak} <span>Dias Seguidos 🔥</span>`;
  }
  if(elTotal) {
    elTotal.innerHTML = `${appState.user.totalWorkouts} <span>Sessões 💪</span>`;
  }
  
  updateWaterUI();
}

// 5. MÓDULO DE HÁBITOS (ÁGUA E SAÚDE)
function addWater(amount) {
  appState.user.waterConsumed += amount;
  
  // Trava no máximo para não quebrar o layout (opcional)
  if(appState.user.waterConsumed > appState.user.waterTarget) {
    appState.user.waterConsumed = appState.user.waterTarget;
  }
  
  updateWaterUI();
  showToast(`+${amount}ml de água registrados com sucesso.`);
}

function updateWaterUI() {
  const elWater = document.getElementById('dash-water-today');
  if(elWater) {
    elWater.innerHTML = `${appState.user.waterConsumed} <span>/ ${appState.user.waterTarget}ml 💧</span>`;
  }
}

function saveHabits() {
  const sleep = document.getElementById('habit-sleep')?.value;
  const mood = document.getElementById('habit-mood')?.value;
  
  console.log("Hábitos a salvar:", { sleep, mood });
  showToast("Hábitos e métricas de bem-estar gravados.");
}

// 6. MÓDULO REABICHECK (COMUNICAÇÃO COM O BACKEND)
function executeCheckIn() {
  showToast("Processando Check-in Inteligente...");
  
  const payload = {
    action: "executeCheckIn",
    userId: appState.user.id,
    userName: appState.user.name,
    timestamp: new Date().toISOString()
  };

  // Se não houver URL do backend configurada, roda em modo Offline/Demonstração
  if (!appState.webAppUrl || appState.webAppUrl === "") {
    appState.user.streak += 1;
    appState.user.totalWorkouts += 1;
    appState.user.xp += 50;
    
    loadProfileData(); // Atualiza a tela
    showToast("Check-in efetuado! (Modo offline ativado)");
    return;
  }

  // Comunicação real com o Google Apps Script
  const fetchUrl = `${appState.webAppUrl}?action=executeCheckIn&data=${encodeURIComponent(JSON.stringify(payload))}`;
  
  fetch(fetchUrl)
    .then(res => res.json())
    .then(response => {
      if (response.success) {
        showToast("Sessão confirmada com sucesso na planilha!");
        // Aqui você atualizaria o appState com os dados reais retornados do Apps Script
      } else {
        showToast("Erro de validação: " + response.error);
      }
    })
    .catch(err => {
      console.error("Erro no fetch:", err);
      showToast("A conexão falhou. Verifique sua internet.");
    });
}

// 7. MÓDULO DE FOTOS DE COMPROVAÇÃO
function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const container = document.getElementById('photo-preview-container');
      if(!container) return;

      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.width = "80px";
      img.style.height = "80px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "8px";
      img.style.border = "1px solid var(--picton-blue)";
      
      container.appendChild(img);
      showToast("Foto anexada à Timeline de evolução.");
    };
    
    reader.readAsDataURL(file); // Converte a imagem para base64 para preview no navegador
  }
}

// 8. FUNÇÕES ADMINISTRATIVAS (PAINEL DO PROFESSOR)
function exportData(type) {
  showToast(`A gerar arquivo .${type} dos alunos ativos...`);
  // Futuramente, você pode usar bibliotecas como jsPDF ou SheetJS aqui.
}

// 9. SISTEMA DE NOTIFICAÇÕES (TOAST)
function showToast(message) {
  const toast = document.getElementById('toast');
  if(!toast) return;

  toast.textContent = message;
  toast.classList.add('show');
  
  // Remove a notificação após 3.5 segundos
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}
