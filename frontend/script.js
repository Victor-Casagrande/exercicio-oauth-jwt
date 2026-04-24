const BACKEND_URL = 'http://localhost:3000';

const loginBtn = document.getElementById('loginBtn');
const protectedBtn = document.getElementById('protectedBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginArea = document.getElementById('loginArea');
const dashboardArea = document.getElementById('dashboardArea');
const alertBox = document.getElementById('alertBox');
const apiResponse = document.getElementById('apiResponse');

window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (token) {
        localStorage.setItem('jwt_token', token);
        
        window.history.replaceState({}, document.title, window.location.pathname);
        
        showAlert('Login realizado com sucesso!', 'success');
        updateUI();
    } else if (error) {
        window.history.replaceState({}, document.title, window.location.pathname);
        
        let errorMsg = 'Ocorreu um erro desconhecido.';
        if (error === 'dominio_invalido') errorMsg = 'Acesso negado: Utilize um email com domínio @ifc.edu.br.';
        if (error === 'codigo_nao_fornecido') errorMsg = 'Autorização cancelada pelo usuário ou falha de comunicação.';
        
        showAlert(errorMsg, 'error');
        updateUI();
    } else {
        updateUI();
    }
});

loginBtn.addEventListener('click', () => {
    window.location.href = `${BACKEND_URL}/api/auth/google`;
});

protectedBtn.addEventListener('click', async () => {
    const token = localStorage.getItem('jwt_token');
    
    if (!token) {
        showAlert('Você não está autenticado.', 'error');
        return updateUI();
    }

    try {
        apiResponse.textContent = "Carregando...";
        
        const response = await fetch(`${BACKEND_URL}/api/protected`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            apiResponse.textContent = JSON.stringify(data, null, 4);
        } else {
            apiResponse.textContent = `Erro ${response.status}: ${data.error}`;
            if (response.status === 401 || response.status === 403) {
                logout();
            }
        }
    } catch (error) {
        apiResponse.textContent = 'Falha na conexão com o servidor backend.';
    }
});

logoutBtn.addEventListener('click', logout);

function logout() {
    localStorage.removeItem('jwt_token');
    apiResponse.textContent = "// Nenhuma requisição feita ainda...";
    showAlert('Você saiu do sistema.', 'success');
    updateUI();
}

function updateUI() {
    const token = localStorage.getItem('jwt_token');
    if (token) {
        loginArea.style.display = 'none';
        dashboardArea.style.display = 'block';
        logoutBtn.style.display = 'block';
    } else {
        loginArea.style.display = 'block';
        dashboardArea.style.display = 'none';
        logoutBtn.style.display = 'none';
    }
}

function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.style.display = 'block';
    setTimeout(() => { alertBox.style.display = 'none'; }, 5000);
}