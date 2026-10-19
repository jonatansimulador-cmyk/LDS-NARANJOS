const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx78yH2nyiCEq7b1FbdBrIprP_ha1qH37EtSv5AQvdJHPxqQOpBxP0a2dAv-scdz_zV5A/exec';

document.addEventListener('DOMContentLoaded', () => {
    const openDoorsBtn = document.getElementById('openDoorsBtn');
    const doorFrame = document.getElementById('door-frame');
    const actionContainer = document.getElementById('action-container');
    const loginDniInput = document.getElementById('login-dni');
    
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');

    openDoorsBtn.addEventListener('click', () => {
        actionContainer.style.opacity = '0';
        setTimeout(() => actionContainer.style.display = 'none', 500);
        doorFrame.classList.add('doors-open');
        setTimeout(() => loginDniInput.focus(), 1500); 
    });

    showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.style.opacity = '0';
        setTimeout(() => {
            loginSection.classList.add('hidden');
            registerSection.classList.remove('hidden');
            setTimeout(() => registerSection.style.opacity = '1', 50);
        }, 300);
    });

    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        registerSection.style.opacity = '0';
        setTimeout(() => {
            registerSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
            setTimeout(() => loginSection.style.opacity = '1', 50);
        }, 300);
    });

    function showMessage(elementId, text, isError) {
        const el = document.getElementById(elementId);
        el.textContent = text;
        el.className = `msg-toast show absolute top-0 left-0 right-0 text-center text-xs font-bold p-3 rounded ${isError ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`;
        setTimeout(() => el.classList.remove('show'), 4000);
    }

    document.getElementById('form-register').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-register');
        btn.textContent = 'PROCESANDO...';
        btn.disabled = true;

        const data = {
            action: 'register',
            nombre: document.getElementById('reg-nombre').value,
            celular: document.getElementById('reg-celular').value,
            cargo: document.getElementById('reg-cargo').value,
            dni: document.getElementById('reg-dni').value,
            password: document.getElementById('reg-password').value
        };

        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(data) });
            const result = await response.json();
            if(result.success) {
                showMessage('register-msg', result.message, false);
                document.getElementById('form-register').reset();
                setTimeout(() => showLoginBtn.click(), 2000); 
            } else showMessage('register-msg', result.message, true);
        } catch (error) { showMessage('register-msg', 'Error de conexión', true); } finally { btn.textContent = 'REGISTRAR'; btn.disabled = false; }
    });

    document.getElementById('form-login').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-login');
        btn.textContent = 'VERIFICANDO...';
        btn.disabled = true;

        const data = { action: 'login', dni: document.getElementById('login-dni').value, password: document.getElementById('login-password').value };

        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(data) });
            const result = await response.json();
            
            if(result.success) {
                showMessage('login-msg', `¡Bienvenido ${result.nombre}!`, false);
                localStorage.setItem('sesionLider', JSON.stringify({ nombre: result.nombre, cargo: result.cargo, dni: data.dni, celular: result.celular }));
                setTimeout(() => {
                    if(result.cargo.toLowerCase().includes('administrador') || data.dni.toLowerCase() === 'admin') window.location.href = "admin.html";
                    else window.location.href = "lideres.html";
                }, 1500);
            } else showMessage('login-msg', result.message, true);
        } catch (error) { showMessage('login-msg', 'Error de conexión', true); } finally { btn.textContent = 'INGRESAR'; btn.disabled = false; }
    });
});