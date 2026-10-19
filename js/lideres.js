const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx78yH2nyiCEq7b1FbdBrIprP_ha1qH37EtSv5AQvdJHPxqQOpBxP0a2dAv-scdz_zV5A/exec';
let userData = {};
let archivoBase64 = ""; let archivoNombre = ""; let archivoMimeType = "";
let currentPresupuestoData = null; 
let filaActualSustento = null; 
let archivosSeleccionadosG = [];

function cerrarSesion() { localStorage.removeItem('sesionLider'); window.location.href = 'index.html'; }

// --- SISTEMA DE SUBIDA DE SUSTENTOS GENERALES ---
function prepararSubidaSustento(fila) {
    filaActualSustento = fila;
    document.getElementById('global-sustento-upload').value = ""; 
    document.getElementById('global-sustento-upload').click(); 
}

async function procesarSubidaGlobal(event) {
    let files = event.target.files;
    if (!files || files.length === 0 || !filaActualSustento) return;
    
    let totalSize = 0;
    archivosSeleccionadosG = [];
    let listaHTML = "";

    Array.from(files).forEach((f) => {
        totalSize += f.size;
        archivosSeleccionadosG.push(f);
        listaHTML += `
            <div class="flex justify-between items-center bg-gray-100 p-2 rounded border border-gray-200">
                <span class="text-[10px] font-bold text-gray-600 truncate w-1/2" title="${f.name}">${f.name}</span>
                <div class="flex items-center gap-1">
                    <span class="text-[10px] font-bold text-gray-800">S/</span>
                    <input type="number" step="0.10" class="monto-sustento-input w-20 px-2 py-1 text-xs border rounded focus:border-[#d4af37] outline-none text-right font-bold text-[#002855]" placeholder="0.00" required>
                </div>
            </div>
        `;
    });

    if(totalSize > 10 * 1024 * 1024) {
        alert("Has seleccionado demasiados archivos o muy pesados. El límite es 10MB en total.");
        return;
    }

    document.getElementById('lista-archivos-montos').innerHTML = listaHTML;
    document.getElementById('modal-montos-sustento').classList.remove('hidden');
}

function cerrarModalMontos() {
    document.getElementById('modal-montos-sustento').classList.add('hidden');
    filaActualSustento = null;
    archivosSeleccionadosG = [];
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

async function procesarArchivosConMonto() {
    let inputs = document.querySelectorAll('.monto-sustento-input');
    let sustentosFinales = [];

    for(let i=0; i<archivosSeleccionadosG.length; i++) {
        let val = inputs[i].value;
        if(!val || val <= 0) {
            alert("Por favor, ingresa un monto válido mayor a 0 para cada comprobante.");
            return;
        }
    }

    cerrarModalMontos();
    document.getElementById('loading-overlay').classList.remove('hidden');

    for(let i=0; i<archivosSeleccionadosG.length; i++) {
        let file = archivosSeleccionadosG[i];
        let monto = inputs[i].value;
        let b64 = await toBase64(file);
        sustentosFinales.push({
            nombre: file.name,
            mimeType: file.type || "application/octet-stream",
            base64: b64,
            monto: parseFloat(monto).toFixed(2)
        });
    }
    enviarSustentosAlServidor(sustentosFinales, filaActualSustento);
}

async function enviarSustentosAlServidor(archivos, fila) {
    const payload = { action: 'upload_sustento', fila: fila, archivos: archivos };
    try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if(result.success) { cargarPresupuestos(); } else alert(result.message);
    } catch (error) { alert("Error de conexión."); } 
    finally { document.getElementById('loading-overlay').classList.add('hidden'); filaActualSustento = null; }
}

// --- FUNCIONES PRESUPUESTO BASICO ---
function agregarProducto(nombre = '', cantidad = 1, precio = '') {
    const container = document.getElementById('contenedor-productos');
    const row = document.createElement('div');
    row.className = 'flex flex-wrap md:flex-nowrap gap-2 items-center producto-row mb-2';
    row.innerHTML = `
        <input type="text" class="prod-nombre flex-grow w-full md:w-auto px-2 py-1.5 border rounded text-xs" placeholder="Nombre producto" value="${nombre}" required>
        <input type="number" class="prod-cant w-16 px-2 py-1.5 border rounded text-xs text-center" placeholder="Cant" min="1" value="${cantidad}" required oninput="recalcularProductos()">
        <input type="number" class="prod-precio w-20 px-2 py-1.5 border rounded text-xs text-center" placeholder="S/ Unit" step="0.10" min="0" value="${precio}" required oninput="recalcularProductos()">
        <input type="text" class="prod-total w-20 px-2 py-1.5 border rounded bg-gray-200 text-xs text-right font-bold" readonly value="0.00">
        <button type="button" class="text-red-500 w-8 h-8 flex items-center justify-center border border-red-200 rounded text-xs font-bold btn-eliminar-prod" onclick="this.parentElement.remove(); recalcularProductos()">X</button>
    `;
    container.appendChild(row); recalcularProductos(); 
}

function recalcularProductos() {
    let subtotal = 0;
    document.querySelectorAll('.producto-row').forEach(row => {
        const total = (parseFloat(row.querySelector('.prod-cant').value) || 0) * (parseFloat(row.querySelector('.prod-precio').value) || 0);
        row.querySelector('.prod-total').value = total.toFixed(2);
        subtotal += total;
    });
    document.getElementById('pres-monto-propio').value = subtotal.toFixed(2);
    calcularTotal(); 
}

function calcularTotal() {
    let p = parseFloat(document.getElementById('pres-monto-propio').value) || 0;
    let c = document.getElementById('check-compartido').checked ? (parseFloat(document.getElementById('pres-monto-compartido').value) || 0) : 0;
    document.getElementById('pres-monto-total').value = (p + c).toFixed(2);
}

function toggleCompartido() {
    let isChecked = document.getElementById('check-compartido').checked;
    document.getElementById('div-compartido').classList.toggle('hidden', !isChecked);
    if(!isChecked) { document.getElementById('pres-monto-compartido').value = ''; document.getElementById('pres-org-compartida').value = ''; }
    calcularTotal(); 
}

function toggleBcp() {
    let isChecked = document.getElementById('check-bcp').checked;
    document.getElementById('div-bcp').classList.toggle('hidden', !isChecked);
    if(!isChecked) { document.getElementById('bcp-cuenta').value = ''; document.getElementById('bcp-nombre').value = ''; document.getElementById('bcp-dni').value = ''; document.getElementById('bcp-archivo').value = ''; archivoBase64 = ""; archivoNombre = ""; archivoMimeType = ""; }
}

function procesarArchivoBCP(event) {
    let file = event.target.files[0];
    if (file) { archivoNombre = file.name; archivoMimeType = file.type; let reader = new FileReader(); reader.onload = function(e) { archivoBase64 = e.target.result.split(',')[1]; }; reader.readAsDataURL(file); }
}

document.addEventListener('DOMContentLoaded', () => {
    const sesion = localStorage.getItem('sesionLider');
    if (!sesion) { window.location.href = 'index.html'; return; }
    userData = JSON.parse(sesion);
    
    if((userData.cargo || "").toLowerCase().includes('administrador') || (userData.dni || "").toLowerCase() === 'admin') {
        window.location.href = 'admin.html'; return;
    }

    if(document.getElementById('nav-user-name')) document.getElementById('nav-user-name').textContent = userData.nombre;
    if(document.getElementById('nav-user-role')) document.getElementById('nav-user-role').textContent = userData.cargo;
    if(document.getElementById('welcome-name')) document.getElementById('welcome-name').textContent = userData.nombre.split(' ')[0];
    if(document.getElementById('welcome-role')) document.getElementById('welcome-role').textContent = userData.cargo;

    if(document.getElementById('perfil-nombre')) {
        document.getElementById('perfil-nombre').value = userData.nombre;
        document.getElementById('perfil-cargo').value = userData.cargo;
        if(userData.celular) document.getElementById('perfil-celular').value = userData.celular;
    }

    cargarModulosDashboard(userData.cargo);
    cargarPresupuestos();
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.getElementById('btn-' + tabId).classList.add('active');
    if(tabId === 'tab-presupuesto') cargarPresupuestos();
}

if(document.getElementById('form-perfil')){
    document.getElementById('form-perfil').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-perfil');
        const msg = document.getElementById('msg-perfil');
        btn.textContent = "Guardando..."; btn.disabled = true;
        const nuevaPassword = document.getElementById('perfil-password').value;
        const nuevoCelular = document.getElementById('perfil-celular').value;

        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'update_profile', dni: userData.dni, nuevoCelular: nuevoCelular, nuevaPassword: nuevaPassword }) });
            const result = await response.json();
            msg.classList.remove('hidden');
            if(result.success) {
                msg.textContent = result.message; msg.className = "text-sm font-bold mt-3 text-green-600";
                userData.celular = nuevoCelular; localStorage.setItem('sesionLider', JSON.stringify(userData));
                document.getElementById('perfil-password').value = ""; 
            } else { msg.textContent = result.message; msg.className = "text-sm font-bold mt-3 text-red-600"; }
        } catch (error) { alert("Error"); } finally { btn.textContent = "Guardar Cambios"; btn.disabled = false; setTimeout(() => msg.classList.add('hidden'), 3000); }
    });
}

function abrirModalDJ(fila) {
    document.getElementById('modal-dj').classList.remove('hidden');
    if(document.getElementById('form-dj')) document.getElementById('form-dj').reset();
    document.getElementById('dj-fila').value = fila;
}

function cerrarModalDJ() { document.getElementById('modal-dj').classList.add('hidden'); }
function cerrarAlertaDJ() { document.getElementById('modal-alerta-dj').classList.add('hidden'); }

if(document.getElementById('form-dj')){
    document.getElementById('form-dj').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fila = document.getElementById('dj-fila').value;
        if(!fila) return;
        
        const btn = document.getElementById('btn-submit-dj');
        btn.textContent = "Guardando..."; btn.disabled = true;

        const djData = {
            fecha: document.getElementById('dj-fecha').value,
            ruta: document.getElementById('dj-ruta').value,
            monto: document.getElementById('dj-monto').value
        };

        const payload = { action: 'save_dj_movilidad', fila: fila, djData: JSON.stringify(djData) };

        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = await response.json();
            if(result.success) {
                cerrarModalDJ();
                cargarPresupuestos(); 
                document.getElementById('modal-alerta-dj').classList.remove('hidden');
            } else alert(result.message);
        } catch (error) { alert("Error al guardar DJ."); }
        finally { btn.textContent = "Generar DJ"; btn.disabled = false; }
    });
}

function abrirModalPresupuesto(editarData = null) {
    document.getElementById('modal-presupuesto').classList.remove('hidden');
    const esObispado = (userData.cargo || "").toLowerCase().includes('obispado') || (userData.cargo || "").toLowerCase().includes('barrio') || (userData.cargo || "").toLowerCase().includes('ejecutivo');
    
    document.getElementById('zona-obispado').classList.toggle('hidden', !esObispado);
    document.getElementById('form-solicitud').reset();
    document.getElementById('contenedor-productos').innerHTML = ""; 
    
    document.getElementById('pres-solicitante').value = userData.nombre;
    document.getElementById('pres-org').value = userData.cargo;
    document.getElementById('pres-monto-total').value = "0.00";
    document.getElementById('btn-pdf-print').classList.add('hidden'); 
    currentPresupuestoData = null; 
    
    document.getElementById('check-compartido').checked = false;
    document.getElementById('check-bcp').checked = false;
    toggleCompartido(); toggleBcp();
    document.getElementById('bloque-bcp-wrapper').classList.remove('hidden'); 

    if (editarData) {
        currentPresupuestoData = editarData; 
        document.getElementById('modal-titulo').textContent = "Revisar Solicitud";
        document.getElementById('presupuesto-fila').value = editarData.fila;
        
        if(esObispado) { document.getElementById('btn-pdf-print').classList.remove('hidden'); }

        document.getElementById('pres-solicitante').value = editarData.nombre || "No Registrado"; 
        document.getElementById('pres-fecha-act').value = editarData.fechaActividad || ""; 
        document.getElementById('pres-lider-aprobo').value = editarData.liderAprobo || ""; 
        document.getElementById('pres-depositar').value = editarData.depositarA || ""; 
        
        document.getElementById('pres-fecha-act').readOnly = true;
        document.getElementById('pres-lider-aprobo').disabled = true;
        document.getElementById('pres-depositar').readOnly = true;
        
        document.getElementById('pres-proposito').value = editarData.proposito;
        document.getElementById('pres-proposito').readOnly = true;
        document.getElementById('pres-monto-propio').value = parseFloat(editarData.montoTotal).toFixed(2);
        document.getElementById('pres-monto-total').value = parseFloat(editarData.montoTotal).toFixed(2);

        document.getElementById('btn-add-producto').classList.add('hidden');
        document.getElementById('bloque-bcp-wrapper').classList.add('hidden'); 

        if(editarData.productosJSON) {
            try {
                const lista = JSON.parse(editarData.productosJSON);
                lista.forEach(p => agregarProducto(p.nombre, p.cantidad, p.precio));
                document.querySelectorAll('.producto-row input').forEach(inp => inp.readOnly = true);
                document.querySelectorAll('.btn-eliminar-prod').forEach(btn => btn.classList.add('hidden'));
            } catch(e) {}
        }

        if(esObispado) {
            document.getElementById('pres-estado').value = editarData.estado;
            document.getElementById('pres-obs').value = editarData.obs || "";
        }

        document.getElementById('bloque-sustento').classList.remove('hidden');
        const containerLinks = document.getElementById('sustento-link-container');
        containerLinks.innerHTML = "";
        if (editarData.sustentoUrl) {
            document.getElementById('msg-no-sustento').classList.add('hidden');
            let urls = editarData.sustentoUrl.split(',');
            urls.forEach((item, index) => {
                if(item.trim() !== "") {
                    let parts = item.split('|');
                    let uStr = parts[0];
                    let mStr = parts.length > 1 ? parseFloat(parts[1]).toFixed(2) : "0.00";
                    containerLinks.innerHTML += `<a href="${uStr.trim()}" target="_blank" class="inline-flex items-center gap-1 bg-green-200 text-green-900 px-3 py-1.5 rounded text-[10px] font-bold hover:bg-green-300 transition shadow-sm">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg> 
                        Sustento ${index + 1} (S/ ${mStr})
                    </a>`;
                }
            });
        } else {
            document.getElementById('msg-no-sustento').classList.remove('hidden');
        }

        const btnVerDJ = document.getElementById('btn-ver-dj');
        const btnCrearDJ = document.getElementById('btn-crear-dj');
        const safeDjData = encodeURIComponent(JSON.stringify(editarData)).replace(/'/g, "%27");
        if(editarData.djMovilidad) {
            btnCrearDJ.classList.add('hidden');
            btnVerDJ.classList.remove('hidden');
            btnVerDJ.setAttribute('onclick', `generarPDF_DJMovilidad('${safeDjData}')`);
        } else {
            btnVerDJ.classList.add('hidden');
            btnCrearDJ.classList.remove('hidden');
        }

    } else {
        document.getElementById('modal-titulo').textContent = "Nueva Solicitud";
        document.getElementById('presupuesto-fila').value = ""; 
        document.getElementById('pres-fecha-act').readOnly = false;
        document.getElementById('pres-lider-aprobo').disabled = false;
        document.getElementById('pres-depositar').readOnly = false;
        document.getElementById('pres-proposito').readOnly = false;
        document.getElementById('btn-add-producto').classList.remove('hidden');
        document.getElementById('bloque-sustento').classList.add('hidden');
        agregarProducto(); 
    }
}

function cerrarModal() { document.getElementById('modal-presupuesto').classList.add('hidden'); }

async function cargarPresupuestos() {
    const tbody = document.getElementById('tabla-presupuestos');
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Cargando...</td></tr>';
    try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'get_budgets', cargo: userData.cargo }) });
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            tbody.innerHTML = '';
            let hayAlertaSustento = false;

            result.data.forEach(p => {
                let badgeColor = p.estado === 'Aprobado' ? 'bg-green-100 text-green-800' : (p.estado === 'Rechazado' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800');
                const editDataObj = encodeURIComponent(JSON.stringify(p)).replace(/'/g, "%27");
                
                let archivoLink = p.urlArchivo ? `<br><a href="${p.urlArchivo}" target="_blank" class="text-[10px] text-blue-600 font-bold hover:underline">Ver DNI</a>` : '';
                
                let montoSustentado = 0;
                let sustentoLinksHTML = "";
                if (p.sustentoUrl) {
                    let urls = p.sustentoUrl.split(',');
                    urls.forEach((item, i) => {
                        if(item.trim() !== "") {
                            let parts = item.split('|');
                            let uStr = parts[0];
                            let mStr = parts.length > 1 ? parseFloat(parts[1]).toFixed(2) : "0.00";
                            montoSustentado += parseFloat(mStr);
                            sustentoLinksHTML += `<br><a href="${uStr.trim()}" target="_blank" class="text-[10px] text-green-600 font-bold hover:underline">Sustento ${i+1} (S/ ${mStr})</a>`;
                        }
                    });
                }
                
                let djLinkHtml = "";
                let btnDj = '';
                if (p.djMovilidad) {
                    let dj = JSON.parse(p.djMovilidad);
                    montoSustentado += parseFloat(dj.monto);
                    djLinkHtml = `<br><a href="#" onclick="generarPDF_DJMovilidad('${editDataObj}')" class="text-[10px] text-purple-600 font-bold hover:underline">PDF DJ (S/ ${parseFloat(dj.monto).toFixed(2)})</a>`;
                } else {
                    btnDj = `<button onclick="abrirModalDJ(${p.fila})" class="bg-white border border-green-600 text-green-700 px-2 py-1 rounded shadow text-[10px] font-bold transition whitespace-nowrap mt-1">Crear DJ</button>`;
                }

                let totalP = parseFloat(p.montoTotal);
                let faltaSustentar = totalP - montoSustentado;
                if(faltaSustentar < 0) faltaSustentar = 0;

                let infoSustento = `<div class="text-[9px] text-gray-500 mt-1 leading-tight"><span class="text-green-600 font-bold">Justif: S/${montoSustentado.toFixed(2)}</span><br><span class="text-red-500 font-bold">Falta: S/${faltaSustentar.toFixed(2)}</span></div>`;

                if (p.estado === 'Aprobado' && faltaSustentar > 0 && p.fechaActividad) {
                    let diffDays = (new Date().getTime() - new Date(p.fechaActividad).getTime()) / (1000 * 3600 * 24); 
                    if (diffDays > 6) hayAlertaSustento = true; 
                }

                let btnSustento = `<button onclick="prepararSubidaSustento(${p.fila})" class="bg-[#d4af37] hover:bg-[#bf953f] text-white px-2 py-1 rounded shadow text-[10px] font-bold transition whitespace-nowrap mt-1">Subir Sust.</button>`;

                let btnPdf = '';
                if ((userData.cargo || "").toLowerCase().includes('obispado') || (userData.cargo || "").toLowerCase().includes('barrio') || (userData.cargo || "").toLowerCase().includes('ejecutivo')) {
                    btnPdf = `<button onclick="generarDocumentoPDF('${editDataObj}')" class="text-red-600 hover:text-red-800 font-bold px-1 whitespace-nowrap border-l border-gray-300 ml-1">Formato PDF</button>`;
                }

                tbody.innerHTML += `
                    <tr class="hover:bg-gray-50 border-b border-gray-100">
                        <td class="px-4 md:px-6 py-3 text-gray-500">${p.fecha.split(',')[0]}</td>
                        <td class="px-4 md:px-6 py-3 font-medium text-xs leading-tight">${p.proposito}</td>
                        <td class="px-4 md:px-6 py-3 text-xs font-bold whitespace-nowrap">S/ ${parseFloat(p.montoTotal).toFixed(2)}<br>${infoSustento}</td>
                        <td class="px-4 md:px-6 py-3 leading-tight"><span class="px-2 block text-center text-[9px] rounded-full ${badgeColor}">${p.estado}</span>${archivoLink}${sustentoLinksHTML}${djLinkHtml}</td>
                        <td class="px-4 md:px-6 py-3 text-right">
                            <div class="flex flex-col gap-1 items-end">
                                <div class="flex gap-1 items-center">
                                    <button onclick="abrirModalPresupuesto(JSON.parse(decodeURIComponent('${editDataObj}')))" class="text-[#002855] font-bold text-[10px] px-1 whitespace-nowrap">Ver Dtll.</button>
                                    ${btnPdf}
                                </div>
                                <div class="flex gap-1 items-center">
                                    ${btnSustento} ${btnDj}
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            });
            if(hayAlertaSustento) document.getElementById('alerta-global-sustentos').classList.remove('hidden');
            else document.getElementById('alerta-global-sustentos').classList.add('hidden');
        } else tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No hay presupuestos.</td></tr>';
    } catch (error) { console.error(error); tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">Error de conexión. Actualiza la página.</td></tr>'; }
}

if(document.getElementById('form-solicitud')){
    document.getElementById('form-solicitud').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-pres');
        btn.textContent = "Procesando..."; btn.disabled = true;

        const fila = document.getElementById('presupuesto-fila').value; 
        const isEdit = fila !== "";
        const esObispado = (userData.cargo || "").toLowerCase().includes('obispado') || (userData.cargo || "").toLowerCase().includes('barrio') || (userData.cargo || "").toLowerCase().includes('ejecutivo');

        let productosList = [];
        document.querySelectorAll('.producto-row').forEach(row => {
            productosList.push({ nombre: row.querySelector('.prod-nombre').value, cantidad: row.querySelector('.prod-cant').value, precio: row.querySelector('.prod-precio').value, total: row.querySelector('.prod-total').value });
        });

        if(!isEdit && productosList.length === 0) { alert("Agrega al menos un producto."); btn.textContent = "Guardar"; btn.disabled = false; return; }

        let payload = {
            action: isEdit ? 'update_budget' : 'request_budget', fila: isEdit ? fila : null,
            dni: userData.dni, nombre: userData.nombre, cargo: userData.cargo,
            fechaActividad: document.getElementById('pres-fecha-act').value,
            liderAprobo: document.getElementById('pres-lider-aprobo').value,
            depositarA: document.getElementById('pres-depositar').value,
            proposito: document.getElementById('pres-proposito').value,
            productosJSON: JSON.stringify(productosList),
            productosTexto: productosList.map(p => `${p.cantidad}x ${p.nombre} (S/${p.precio}) = S/${p.total}`).join(' | '),
            montoPropio: document.getElementById('pres-monto-propio').value,
            orgCompartida: document.getElementById('check-compartido').checked ? document.getElementById('pres-org-compartida').value : "",
            montoCompartido: document.getElementById('check-compartido').checked ? document.getElementById('pres-monto-compartido').value : "0",
            montoTotal: document.getElementById('pres-monto-total').value,
            bcpCuenta: document.getElementById('check-bcp').checked ? document.getElementById('bcp-cuenta').value : "",
            bcpNombre: document.getElementById('check-bcp').checked ? document.getElementById('bcp-nombre').value : "",
            bcpDni: document.getElementById('check-bcp').checked ? document.getElementById('bcp-dni').value : "",
            archivoBase64: archivoBase64, archivoNombre: archivoNombre, archivoMimeType: archivoMimeType
        };

        if(esObispado && isEdit) { payload.estado = document.getElementById('pres-estado').value; payload.observaciones = document.getElementById('pres-obs').value; }

        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = await response.json();
            if(result.success) { cerrarModal(); cargarPresupuestos(); } else alert(result.message);
        } catch (error) { alert("Error"); } finally { btn.textContent = "Guardar"; btn.disabled = false; }
    });
}

function cargarModulosDashboard(cargoString) {
    const dashboard = document.getElementById('dashboard-modules');
    const cargo = (cargoString || "").toLowerCase();
    let modulosHTML = '';

    const createCard = (title, desc, iconSvg) => `
        <div class="glass-card rounded-xl p-6 hover:shadow-lg transition-all transform hover:-translate-y-1 group block cursor-pointer border-t-4 border-[#002855]">
            <div class="flex items-center gap-4 mb-4">
                <div class="bg-gray-100 p-3 rounded-full group-hover:bg-[#002855] group-hover:text-white text-[#002855] transition-colors">
                    ${iconSvg}
                </div>
                <h3 class="font-temple font-bold text-lg text-gray-800">${title}</h3>
            </div>
            <p class="text-sm text-gray-600">${desc}</p>
        </div>
    `;

    const iconPeople = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>`;
    const iconReport = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`;
    const iconHeart = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>`;
    const iconBook = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`;

    if (cargo.includes("obispado") || cargo.includes("barrio") || cargo.includes("ejecutivo")) {
        modulosHTML += createCard("Directorio del Barrio", "Consulta información y estado de las familias.", iconPeople);
        modulosHTML += createCard("Recomendaciones", "Gestión de recomendaciones para el templo.", iconBook);
        modulosHTML += createCard("Bienestar", "Solicitudes de ayuda y control.", iconHeart);
    } else if (cargo.includes("sociedad de socorro")) {
        modulosHTML += createCard("Ministración", "Asignaciones y entrevistas.", iconHeart);
        modulosHTML += createCard("Directorio de Hermanas", "Lista de miembros femeninos adultos.", iconPeople);
    } else if (cargo.includes("élderes") || cargo.includes("elderes")) {
        modulosHTML += createCard("Ministración", "Asignaciones y hermanos.", iconHeart);
    } else if (cargo.includes("primaria")) {
        modulosHTML += createCard("Registro de Clases", "Lista de niños por clase y progreso.", iconPeople);
    } else if (cargo.includes("jóvenes") || cargo.includes("jovenes")) {
        modulosHTML += createCard("Progreso Personal / FSY", "Seguimiento de metas y actividades.", iconBook);
    }

    modulosHTML += createCard("Calendario General", "Actividades generales y anuncios.", `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`);
    dashboard.innerHTML = modulosHTML;
}

function generarPDF_DJMovilidad(pStr) {
    const p = JSON.parse(decodeURIComponent(pStr));
    if(!p.djMovilidad) return;
    const dj = JSON.parse(p.djMovilidad);
    
    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write(`
        <html>
        <head>
            <title>Declaración Jurada de Movilidad</title>
            <style>
                body { font-family: 'Times New Roman', serif; line-height: 1.8; padding: 50px; color: #000; }
                .header { text-align: center; margin-bottom: 50px; }
                .header h1 { font-size: 20px; text-decoration: underline; margin-bottom: 5px; text-transform: uppercase; }
                .header h2 { font-size: 16px; font-weight: bold; margin-top: 0; }
                .content { text-align: justify; font-size: 15px; margin-bottom: 60px; }
                .signatures { display: flex; justify-content: space-around; margin-top: 100px; }
                .sig-block { text-align: center; width: 40%; }
                .sig-line { border-top: 1px solid #000; margin-bottom: 8px; }
                .sig-name { font-weight: bold; font-size: 14px; text-transform: uppercase; }
                .sig-role { font-size: 13px; color: #333; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>DECLARACIÓN JURADA DE GASTOS DE MOVILIDAD</h1>
                <h2>BARRIO LOS NARANJOS</h2>
            </div>
            <div class="content">
                <p>Yo, <strong>${p.nombre || "____________________"}</strong>, en mi condición de líder y/o representante de la organización de <strong>${p.cargo}</strong> de La Iglesia de Jesucristo de los Santos de los Últimos Días (Barrio Los Naranjos).</p>
                <p><strong>DECLARO BAJO JURAMENTO</strong> haber realizado gastos de movilidad local por la suma de <strong>S/ ${parseFloat(dj.monto).toFixed(2)}</strong>, el día <strong>${dj.fecha}</strong>, cubriendo la ruta de <strong>${dj.ruta}</strong>.</p>
                <p>Este gasto fue realizado con el propósito indispensable de: <em>${p.proposito}</em>.</p>
                <p>Por no ser posible obtener comprobantes de pago formales (boleta o factura) para este tipo de transporte local, emito y firmo la presente declaración jurada para los fines de sustentación, registro y transparencia correspondientes ante el Obispado y la auditoría de la Iglesia.</p>
            </div>
            <div style="text-align: right; font-size: 14px; margin-bottom: 40px; font-style: italic;">Fecha de emisión: ${new Date().toLocaleDateString('es-PE')}</div>
            <div class="signatures">
                <div class="sig-block"><div class="sig-line"></div><div class="sig-name">${p.nombre || "Firma del Solicitante"}</div><div class="sig-role">${p.cargo}</div></div>
                <div class="sig-block"><div class="sig-line"></div><div class="sig-name">Obispado del Barrio</div><div class="sig-role">Firma de Aprobación</div></div>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); }, 500);
}

function generarDocumentoPDF(pStr) {
    if(!pStr) { pStr = encodeURIComponent(JSON.stringify(currentPresupuestoData)).replace(/'/g, "%27"); }
    const p = JSON.parse(decodeURIComponent(pStr));
    const solicitante = p.nombre || "No Registrado";
    const pagarA = p.depositarA || "";
    const proposito = p.proposito || "";
    const org = p.cargo || "";
    const fechaAct = p.fechaActividad || "";
    const fechaSol = p.fecha ? p.fecha.split(',')[0] : "";
    const montoTotal = parseFloat(p.montoTotal).toFixed(2);
    const liderAprobo = p.liderAprobo || "";

    let filasTabla = ""; let i = 1;
    if(p.productosJSON) {
        try {
            const lista = JSON.parse(p.productosJSON);
            lista.forEach((prod) => {
                let precio = String(prod.precio).replace('S/ ', ''); 
                filasTabla += `<tr><td style="border: 1px solid #000; padding: 5px; text-align: center;">${i}</td><td style="border: 1px solid #000; padding: 5px;">${prod.nombre}</td><td style="border: 1px solid #000; padding: 5px; text-align: center;">${prod.cantidad} un.</td><td style="border: 1px solid #000; padding: 5px; text-align: center;">S/. ${precio}</td><td style="border: 1px solid #000; padding: 5px; text-align: right;">S/. ${prod.total}</td></tr>`;
                i++;
            });
        } catch(e) {}
    }

    const printWindow = window.open('', '', 'height=800,width=1000');
    printWindow.document.write(`
        <html>
        <head>
            <title>Imprimir Presupuesto</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 0; margin: 0; }
                .page { width: 100%; max-width: 800px; margin: 0 auto; padding: 20px; box-sizing: border-box; page-break-after: always; }
                .check-box { display: inline-block; width: 10px; height: 10px; border: 1px solid #000; margin-right: 4px; line-height: 10px; text-align: center; font-size: 9px; font-weight: bold; }
                .border-box { border: 1px solid #000; padding: 4px 6px; }
                .bg-gray { background-color: #e5e7eb; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="page">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;"><tr><td style="width: 50%; font-size: 14px; font-weight: bold;">Barrio Los Naranjos</td><td style="width: 50%; text-align: right; font-size: 18px; font-weight: bold;">SOLICITUD DE GASTOS</td></tr></table>
                <div style="border-bottom: 2px solid #000; margin-bottom: 15px;"></div>
                <table style="width: 100%; border-collapse: collapse;"><tr><td class="border-box" style="width: 50%;"><div style="font-size: 8px; font-weight: bold;">Solicitante</div><div style="font-size: 8px;">Nombre</div><div style="font-size: 11px; font-weight: bold; margin-top: 2px;">${solicitante}</div></td><td class="border-box" style="width: 50%;"><div style="font-size: 8px; font-weight: bold;">PAGAR A</div><div style="font-size: 8px;">Nombre</div><div style="font-size: 11px; font-weight: bold; margin-top: 2px;">${pagarA}</div></td></tr><tr><td class="border-box" colspan="2"><div style="font-size: 8px;">Dirección</div><div style="font-size: 11px; font-weight: bold; margin-top: 2px;">&nbsp;</div></td></tr></table>
                <div class="border-box bg-gray" style="margin-top: 15px; border-bottom: none;">PROPÓSITO DEL GASTO</div>
                <table style="width: 100%; border-collapse: collapse;"><tr><td class="border-box" colspan="2"><div style="font-size: 8px;">Razón</div><div style="font-size: 11px; font-weight: bold; margin-top: 2px;">${proposito}</div></td></tr><tr><td class="border-box" colspan="2"><div style="font-size: 8px;">Categoría</div><div style="font-size: 11px; font-weight: bold; margin-top: 2px;">${org}</div></td></tr></table>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;"><tr><td class="border-box bg-gray" style="width: 50%;">Categoría</td><td class="border-box bg-gray" style="width: 50%;">Opciones de la categoría</td></tr><tr><td class="border-box" colspan="2" style="padding: 10px;"><div style="display: flex; flex-wrap: wrap;"><div style="width: 33%; margin-bottom: 5px;"><span class="check-box"></span> Administración</div><div style="width: 33%; margin-bottom: 5px;"><span class="check-box">${org.includes('Elderes') || org.includes('Élderes') ? 'X' : ''}</span> Quórum Elderes</div><div style="width: 33%; margin-bottom: 5px;"><span class="check-box">${org.includes('Primaria') ? 'X' : ''}</span> Primaria</div><div style="width: 33%; margin-bottom: 5px;"><span class="check-box">${org.includes('Hombres') ? 'X' : ''}</span> Hombres Jóvenes</div><div style="width: 33%; margin-bottom: 5px;"><span class="check-box"></span> Grupo Sumos Sacerdotes</div><div style="width: 33%; margin-bottom: 5px;"><span class="check-box">${org.includes('Socorro') ? 'X' : ''}</span> Sociedad de Socorro</div><div style="width: 33%; margin-bottom: 5px;"><span class="check-box">${org.includes('Mujeres') ? 'X' : ''}</span> Mujeres Jóvenes</div><div style="width: 33%; margin-bottom: 5px;"><span class="check-box"></span> Currículo</div><div style="width: 33%; margin-bottom: 5px;"><span class="check-box"></span> Biblioteca</div><div style="width: 33%; margin-bottom: 5px;"><span class="check-box"></span> Adultos Solteros</div><div style="width: 33%; margin-bottom: 5px;"><span class="check-box"></span> Otros</div><div style="width: 33%; margin-bottom: 5px;"><span class="check-box"></span> Centro de Distribución</div><div style="width: 33%; margin-bottom: 5px;"><span class="check-box"></span> Misceláneo</div><div style="width: 33%; margin-bottom: 5px;"><span class="check-box">${org.includes('Dominical') ? 'X' : ''}</span> Escuela Dominical</div></div></td></tr></table>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;"><tr><td class="border-box" style="width: 30%;"><div style="font-size: 8px;">Fecha</div><div style="font-size: 11px; font-weight: bold; margin-top: 2px;">${fechaSol}</div></td><td class="border-box" style="width: 30%;"><div style="font-size: 8px;">Cantidad</div><div style="font-size: 11px; font-weight: bold; margin-top: 2px;">S/. ${montoTotal}</div></td><td class="border-box" style="width: 40%; vertical-align: middle;"><div style="font-size: 8px;">Propósito del gasto</div><div style="margin-top: 4px;"><span class="check-box"></span> Reembolso <span style="margin-left: 10px;"><span class="check-box">X</span> Por adelantado</span></div></td></tr></table>
                <div style="font-size: 9px; text-align: justify; margin-top: 15px; color: #333;">Un formulario de gastos similar a este debe utilizarse para cada gasto, incluso un lugar para la firma del líder de la organización, el nombre de la persona a quien se pagará el dinero...</div>
                <table style="width: 100%; margin-top: 40px; border: none;"><tr><td style="width: 45%; border-top: 1px solid #000; text-align: center; font-size: 10px; font-weight: bold; padding-top: 5px;">Firma del El obispo (Opcional)</td><td style="width: 10%;"></td><td style="width: 45%; border-top: 1px solid #000; text-align: center; font-size: 10px; font-weight: bold; padding-top: 5px;">Fecha</td></tr></table>
            </div>
            <div class="page" style="page-break-after: auto;">
                <div style="text-align: center; margin-bottom: 20px;"><h1 style="font-size: 16px; text-decoration: underline; margin:0;">BARRIO LOS NARANJOS</h1><h2 style="font-size: 14px; margin:0; margin-top: 5px;">PRESUPUESTO</h2></div>
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 10px; font-size: 12px;">Datos generales:</div>
                <table style="width: 100%; font-size: 11px; margin-bottom: 20px; border:none;"><tr><td style="width: 15%; font-weight:bold; border:none; padding:4px 0;">Fecha:</td><td style="width: 35%; border:none; padding:4px 0;">${fechaAct || fechaSol}</td><td style="width: 20%; font-weight:bold; border:none; padding:4px 0;">Líder asignado:</td><td style="width: 30%; border:none; padding:4px 0;">${pagarA}</td></tr><tr><td style="font-weight:bold; border:none; padding:4px 0;">Organización:</td><td style="border:none; padding:4px 0;">${org}</td><td style="font-weight:bold; border:none; padding:4px 0;">Actividad:</td><td style="border:none; padding:4px 0;">${proposito}</td></tr></table>
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 10px; font-size: 12px;">Detalle del presupuesto:</div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;"><thead><tr><th style="border: 1px solid #000; background-color: #f9fafb; padding: 6px; font-size: 10px; width: 8%;">Ítem</th><th style="border: 1px solid #000; background-color: #f9fafb; padding: 6px; font-size: 10px; width: 42%;">Descripción</th><th style="border: 1px solid #000; background-color: #f9fafb; padding: 6px; font-size: 10px; width: 15%;">Cantidad</th><th style="border: 1px solid #000; background-color: #f9fafb; padding: 6px; font-size: 10px; width: 15%;">Precio Unitario (S/)</th><th style="border: 1px solid #000; background-color: #f9fafb; padding: 6px; font-size: 10px; width: 20%;">Total (S/)</th></tr></thead><tbody>${filasTabla}</tbody></table>
                <div style="font-weight: bold; text-align: right; font-size: 12px; margin-bottom: 40px;">Total general (S/): S/. ${montoTotal}</div>
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 20px; font-size: 12px;">Firmas de aprobación:</div>
                <table style="width: 100%; font-size: 11px; border:none;"><tr><td style="border:none; width:15%; font-weight:bold; padding: 4px 0;">Elaborado por:</td><td style="border:none; width:35%; padding: 4px 0;">${solicitante}</td><td style="border:none; width:15%; font-weight:bold; padding: 4px 0;">Aprobado por:</td><td style="border:none; width:35%; padding: 4px 0;">${liderAprobo || "_____________"}</td></tr><tr><td style="border:none; font-weight:bold; padding: 4px 0;">Cargo:</td><td style="border:none; padding: 4px 0;">${org.replace(' [Obispado]', '')}</td><td style="border:none; font-weight:bold; padding: 4px 0;">Cargo:</td><td style="border:none; padding: 4px 0;">Obispado del barrio</td></tr><tr><td style="border:none; font-weight:bold; padding: 4px 0;">Fecha:</td><td style="border:none; padding: 4px 0;">${fechaSol}</td><td style="border:none; font-weight:bold; padding: 4px 0;">Fecha:</td><td style="border:none; padding: 4px 0;">_____________</td></tr></table>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); }, 500);
}