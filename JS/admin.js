const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx78yH2nyiCEq7b1FbdBrIprP_ha1qH37EtSv5AQvdJHPxqQOpBxP0a2dAv-scdz_zV5A/exec';
let userData = {};
let currentPresupuestoData = null; 
let filaActualSustento = null;
let archivosSeleccionadosG = [];

function cerrarSesion() { localStorage.removeItem('sesionLider'); window.location.href = 'index.html'; }

// SISTEMA DE MONTOS Y SUSTENTOS (ADMIN)
function prepararSubidaSustento(fila) {
    filaActualSustento = fila;
    document.getElementById('global-sustento-upload').value = ""; 
    document.getElementById('global-sustento-upload').click(); 
}

function procesarSubidaGlobal(event) {
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

    if(totalSize > 10 * 1024 * 1024) { alert("Archivos muy pesados. El límite es 10MB en total."); return; }
    document.getElementById('lista-archivos-montos').innerHTML = listaHTML;
    document.getElementById('modal-montos-sustento').classList.remove('hidden');
}

function cerrarModalMontos() {
    document.getElementById('modal-montos-sustento').classList.add('hidden');
    filaActualSustento = null; archivosSeleccionadosG = [];
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
        if(!val || val <= 0) { alert("Ingresa un monto válido para cada comprobante."); return; }
    }

    cerrarModalMontos();
    document.getElementById('loading-overlay').classList.remove('hidden');

    for(let i=0; i<archivosSeleccionadosG.length; i++) {
        let file = archivosSeleccionadosG[i];
        let monto = inputs[i].value;
        let b64 = await toBase64(file);
        sustentosFinales.push({ nombre: file.name, mimeType: file.type || "application/octet-stream", base64: b64, monto: parseFloat(monto).toFixed(2) });
    }
    enviarSustentosAlServidor(sustentosFinales, filaActualSustento);
}

async function enviarSustentosAlServidor(archivos, fila) {
    const payload = { action: 'upload_sustento', fila: fila, archivos: archivos };
    try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if(result.success) { cargarPresupuestosAdmin(); } else alert(result.message);
    } catch (error) { alert("Error de conexión."); } 
    finally { document.getElementById('loading-overlay').classList.add('hidden'); filaActualSustento = null; }
}

document.addEventListener('DOMContentLoaded', () => {
    const sesion = localStorage.getItem('sesionLider');
    if (!sesion) { window.location.href = 'index.html'; return; }
    userData = JSON.parse(sesion);
    
    if(!(userData.cargo || "").toLowerCase().includes('administrador') && (userData.dni || "").toLowerCase() !== 'admin') {
        window.location.href = 'lideres.html'; return;
    }

    if(document.getElementById('nav-user-name')) document.getElementById('nav-user-name').textContent = userData.nombre;
    if(document.getElementById('nav-user-role')) document.getElementById('nav-user-role').textContent = userData.cargo;
    if(document.getElementById('perfil-nombre')) {
        document.getElementById('perfil-nombre').value = userData.nombre;
        document.getElementById('perfil-cargo').value = userData.cargo;
        if(userData.celular) document.getElementById('perfil-celular').value = userData.celular;
    }
    cargarUsuariosAdmin();
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn-admin').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.getElementById('btn-' + tabId).classList.add('active');
    if(tabId === 'tab-usuarios') cargarUsuariosAdmin();
    if(tabId === 'tab-presupuestos') cargarPresupuestosAdmin();
}

function abrirModalUsuarioAdmin(u = null) {
    document.getElementById('modal-admin-usuario').classList.remove('hidden');
    if(document.getElementById('form-admin-usuario')) document.getElementById('form-admin-usuario').reset();
    
    if(u) {
        document.getElementById('modal-titulo-usuario').textContent = "Editar Perfil y Permisos";
        document.getElementById('admin-user-fila').value = u.fila;
        document.getElementById('admin-user-nombre').value = u.nombre;
        document.getElementById('admin-user-celular').value = u.celular;
        document.getElementById('admin-user-dni').value = u.dni;
        
        let cargoReal = u.cargo || ""; let permiso = "estandar";
        if(cargoReal.toLowerCase().includes('administrador')) { permiso = "admin"; } 
        else if (cargoReal.includes('[Obispado]')) { permiso = "obispado"; cargoReal = cargoReal.replace(' [Obispado]', '').trim(); } 
        else if (cargoReal.toLowerCase().includes('obispado') || cargoReal.toLowerCase().includes('barrio') || cargoReal.toLowerCase().includes('ejecutivo')) { permiso = "obispado"; }

        document.getElementById('admin-user-cargo').value = cargoReal;
        document.getElementById('admin-user-permisos').value = permiso;
    } else {
        document.getElementById('modal-titulo-usuario').textContent = "Crear Nuevo Perfil";
        document.getElementById('admin-user-fila').value = ""; 
    }
}
function cerrarModalAdmin() { document.getElementById('modal-admin-usuario').classList.add('hidden'); }

async function cargarUsuariosAdmin() {
    const tbody = document.getElementById('tabla-usuarios-admin');
    tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Cargando la base de datos...</td></tr>';
    try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'admin_get_users' }) });
        const result = await response.json();
        if (result.success && result.data.length > 0) {
            tbody.innerHTML = '';
            result.data.forEach(u => {
                const obj = encodeURIComponent(JSON.stringify(u)).replace(/'/g, "%27");
                let cargoSafe = u.cargo || "";
                let badgeColor = 'bg-gray-100 text-gray-600';
                if(cargoSafe.includes('[Obispado]') || cargoSafe.toLowerCase().includes('obispado')) badgeColor = 'bg-blue-100 text-blue-800 font-bold';
                if(cargoSafe.toLowerCase().includes('administrador')) badgeColor = 'bg-red-100 text-red-800 font-bold';

                tbody.innerHTML += `
                    <tr class="hover:bg-gray-50 border-b border-gray-100">
                        <td class="px-4 py-3 text-gray-500 font-bold text-xs">${u.dni}</td>
                        <td class="px-4 py-3 text-xs">${u.nombre}</td>
                        <td class="px-4 py-3 text-xs text-gray-600">${u.celular || 'No registrado'}</td>
                        <td class="px-4 py-3 text-xs"><span class="px-2 py-0.5 rounded-full ${badgeColor} text-[10px] inline-block mb-1">${cargoSafe}</span></td>
                        <td class="px-4 py-3 text-right whitespace-nowrap">
                            <button onclick="abrirModalUsuarioAdmin(JSON.parse(decodeURIComponent('${obj}')))" class="text-blue-600 font-bold mr-3 text-xs">Editar</button>
                            <button onclick="eliminarUsuario(${u.fila})" class="text-red-500 font-bold text-xs">Borrar</button>
                        </td>
                    </tr>
                `;
            });
        } else { tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No hay usuarios.</td></tr>'; }
    } catch (e) { tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Error cargando usuarios.</td></tr>'; }
}

if(document.getElementById('form-admin-usuario')){
    document.getElementById('form-admin-usuario').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fila = document.getElementById('admin-user-fila').value;
        const btn = document.getElementById('btn-submit-admin');
        btn.textContent = "Guardando..."; btn.disabled = true;

        let baseCargo = document.getElementById('admin-user-cargo').value.trim();
        let permisos = document.getElementById('admin-user-permisos').value;
        let finalCargo = baseCargo;
        if(permisos === 'obispado') finalCargo = baseCargo + " [Obispado]";
        if(permisos === 'admin') finalCargo = "Administrador General";

        let payload = {};
        if(fila !== "") { payload = { action: 'admin_update_user', fila: fila, nombre: document.getElementById('admin-user-nombre').value, celular: document.getElementById('admin-user-celular').value, dni: document.getElementById('admin-user-dni').value, cargo: finalCargo, password: document.getElementById('admin-user-password').value }; } 
        else { payload = { action: 'register', nombre: document.getElementById('admin-user-nombre').value, celular: document.getElementById('admin-user-celular').value, cargo: finalCargo, dni: document.getElementById('admin-user-dni').value, password: document.getElementById('admin-user-password').value || "12345" }; }

        try { const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) }); const result = await response.json(); if(result.success) { cerrarModalAdmin(); cargarUsuariosAdmin(); } else alert(result.message); } catch (e) {} finally { btn.textContent = "Guardar Perfil"; btn.disabled = false; }
    });
}

async function eliminarUsuario(fila) { if(!confirm("¿Eliminar usuario?")) return; try { await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'admin_delete_user', fila: fila }) }); cargarUsuariosAdmin(); } catch (e) {} }

async function cargarPresupuestosAdmin() {
    const tbody = document.getElementById('tabla-presupuestos-admin');
    tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Cargando presupuestos maestros...</td></tr>';
    try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'get_budgets', cargo: userData.cargo }) });
        const result = await response.json();
        if (result.success && result.data.length > 0) {
            tbody.innerHTML = '';
            let hayAlertaSustento = false;

            result.data.forEach(p => {
                let badgeColor = p.estado === 'Aprobado' ? 'bg-green-100 text-green-800' : (p.estado === 'Rechazado' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800');
                let archivoLink = p.urlArchivo ? `<br><a href="${p.urlArchivo}" target="_blank" class="text-[10px] text-blue-600 hover:underline font-bold">Ver DNI</a>` : '';
                
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
                
                const editDataObj = encodeURIComponent(JSON.stringify(p)).replace(/'/g, "%27");
                let djLinkHtml = ""; let btnDj = '';

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
                
                tbody.innerHTML += `
                    <tr class="hover:bg-gray-50 border-b border-gray-100">
                        <td class="px-4 py-3 text-xs font-bold text-[#002855]">${p.cargo}</td>
                        <td class="px-4 py-3 text-xs text-gray-600 truncate max-w-[120px]" title="${p.proposito}">${p.proposito} ${archivoLink} ${sustentoLinksHTML} ${djLinkHtml}</td>
                        <td class="px-4 py-3 text-xs font-bold whitespace-nowrap">S/ ${parseFloat(p.montoTotal).toFixed(2)}<br>${infoSustento}</td>
                        <td class="px-4 py-3"><span class="px-2 block text-center text-[9px] rounded-full ${badgeColor} font-bold">${p.estado}</span></td>
                        <td class="px-4 py-3 text-right">
                            <div class="flex flex-col gap-1 items-end">
                                <div class="flex gap-1 items-center">
                                    <button onclick="abrirModalPresupuestoAdmin(JSON.parse(decodeURIComponent('${editDataObj}')))" class="bg-[#002855] hover:bg-[#001b3a] text-white px-2 py-1 rounded shadow text-[10px] font-bold">Revisar</button>
                                    <button onclick="generarDocumentoPDF('${editDataObj}')" class="bg-gray-800 hover:bg-black text-white px-2 py-1 rounded shadow text-[10px] font-bold">PDF</button>
                                    <button onclick="cambiarEstadoRapido(${p.fila}, 'Aprobado')" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded shadow text-[10px] font-bold">✔</button>
                                    <button onclick="cambiarEstadoRapido(${p.fila}, 'Rechazado')" class="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded shadow text-[10px] font-bold">✖</button>
                                    <button onclick="eliminarPresupuesto(${p.fila})" class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded shadow text-[10px] font-bold">Borrar</button>
                                </div>
                                <div class="flex gap-1 items-center mt-1">
                                    <button onclick="prepararSubidaSustento(${p.fila})" class="bg-[#d4af37] hover:bg-[#bf953f] text-white px-2 py-1 rounded shadow text-[10px] font-bold transition">Subir Sust.</button>
                                    ${btnDj}
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            });
            if(hayAlertaSustento) document.getElementById('alerta-global-sustentos').classList.remove('hidden');
            else document.getElementById('alerta-global-sustentos').classList.add('hidden');
        } else { tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No hay presupuestos en el sistema.</td></tr>'; }
    } catch (error) { console.error(error); tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Error.</td></tr>'; }
}

function abrirModalPresupuestoAdmin(p) {
    currentPresupuestoData = p; 
    document.getElementById('modal-presupuesto').classList.remove('hidden');
    
    document.getElementById('presupuesto-fila').value = p.fila;
    document.getElementById('pres-solicitante').value = p.nombre || "No Registrado"; 
    document.getElementById('pres-org').value = p.cargo;
    document.getElementById('pres-fecha-act').value = p.fechaActividad || "";
    document.getElementById('pres-lider-aprobo').value = p.liderAprobo || "";
    document.getElementById('pres-depositar').value = p.depositarA || "";
    document.getElementById('pres-proposito').value = p.proposito;
    document.getElementById('pres-monto-propio').value = parseFloat(p.montoTotal).toFixed(2);
    document.getElementById('pres-monto-total').value = parseFloat(p.montoTotal).toFixed(2);
    
    document.getElementById('pres-estado').value = p.estado;
    document.getElementById('pres-obs').value = p.obs || "";

    const container = document.getElementById('contenedor-productos');
    container.innerHTML = "";
    if(p.productosJSON) {
        try {
            const lista = JSON.parse(p.productosJSON);
            lista.forEach(prod => {
                container.innerHTML += `
                <div class="flex gap-2 items-center mb-1">
                    <input type="text" class="prod-nombre w-full px-2 py-1 border rounded text-xs bg-gray-100" value="${prod.nombre}" readonly>
                    <input type="text" class="prod-cant w-16 px-2 py-1 border rounded text-xs text-center bg-gray-100" value="${prod.cantidad}" readonly>
                    <input type="text" class="prod-precio w-20 px-2 py-1 border rounded text-xs text-center bg-gray-100" value="S/ ${prod.precio}" readonly>
                    <input type="text" class="prod-total w-20 px-2 py-1 border rounded bg-gray-200 text-xs text-right font-bold" value="${prod.total}" readonly>
                </div>`;
            });
        } catch(e) {}
    }

    document.getElementById('bloque-sustento').classList.remove('hidden');
    const containerLinks = document.getElementById('sustento-link-container');
    containerLinks.innerHTML = "";
    if (p.sustentoUrl) {
        let urls = p.sustentoUrl.split(',');
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
    }
}
function cerrarModalPresupuesto() { document.getElementById('modal-presupuesto').classList.add('hidden'); }

async function cambiarEstadoRapido(fila, nuevoEstado) {
    if(!confirm(`¿Marcar como ${nuevoEstado.toUpperCase()}?`)) return;
    try { await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'update_budget', fila: fila, estado: nuevoEstado, observaciones: "Actualizado por Admin" }) }); cargarPresupuestosAdmin(); } catch (e) { alert("Error."); }
}

async function eliminarPresupuesto(fila) {
    if(!confirm("¿Estás seguro de ELIMINAR este presupuesto permanentemente?")) return;
    try { await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'admin_delete_budget', fila: fila }) }); cargarPresupuestosAdmin(); } catch (e) { alert("Error"); }
}

if(document.getElementById('form-solicitud')){
    document.getElementById('form-solicitud').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-pres');
        btn.textContent = "Guardando..."; btn.disabled = true;
        try {
            await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'update_budget', fila: document.getElementById('presupuesto-fila').value, estado: document.getElementById('pres-estado').value, observaciones: document.getElementById('pres-obs').value }) });
            cerrarModalPresupuesto(); cargarPresupuestosAdmin();
        } catch (e) { alert("Error."); } finally { btn.textContent = "Guardar Estado"; btn.disabled = false; }
    });
}

// DJ ADMIN
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

        const djData = { fecha: document.getElementById('dj-fecha').value, ruta: document.getElementById('dj-ruta').value, monto: document.getElementById('dj-monto').value };
        const payload = { action: 'save_dj_movilidad', fila: fila, djData: JSON.stringify(djData) };

        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = await response.json();
            if(result.success) {
                cerrarModalDJ();
                cargarPresupuestosAdmin(); 
                document.getElementById('modal-alerta-dj').classList.remove('hidden');
            } else alert(result.message);
        } catch (error) { alert("Error al guardar DJ."); } finally { btn.textContent = "Generar DJ"; btn.disabled = false; }
    });
}

function generarPDF_DJMovilidad(pStr) {
    const p = JSON.parse(decodeURIComponent(pStr));
    if(!p.djMovilidad) return;
    const dj = JSON.parse(p.djMovilidad);
    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write(`
        <html><head><title>DJ Movilidad</title><style>body{font-family:'Times New Roman',serif;line-height:1.8;padding:50px;color:#000;}.header{text-align:center;margin-bottom:50px;}.header h1{font-size:20px;text-decoration:underline;margin-bottom:5px;text-transform:uppercase;}.content{text-align:justify;font-size:15px;margin-bottom:60px;}.signatures{display:flex;justify-content:space-around;margin-top:100px;}.sig-block{text-align:center;width:40%;}.sig-line{border-top:1px solid #000;margin-bottom:8px;}.sig-name{font-weight:bold;font-size:14px;text-transform:uppercase;}</style></head><body>
            <div class="header"><h1>DECLARACIÓN JURADA DE GASTOS DE MOVILIDAD</h1><h2>BARRIO LOS NARANJOS</h2></div>
            <div class="content">
                <p>Yo, <strong>${p.nombre || "____________________"}</strong>, líder de <strong>${p.cargo}</strong>.</p>
                <p><strong>DECLARO BAJO JURAMENTO</strong> haber gastado <strong>S/ ${parseFloat(dj.monto).toFixed(2)}</strong> el <strong>${dj.fecha}</strong> en la ruta: <strong>${dj.ruta}</strong> para: <em>${p.proposito}</em>.</p>
            </div>
            <div style="text-align: right; margin-bottom: 40px; font-style: italic;">Fecha: ${new Date().toLocaleDateString('es-PE')}</div>
            <div class="signatures"><div class="sig-block"><div class="sig-line"></div><div class="sig-name">${p.nombre || "Firma"}</div></div><div class="sig-block"><div class="sig-line"></div><div class="sig-name">Obispado</div></div></div>
        </body></html>
    `);
    printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); }, 500);
}

function generarDocumentoPDF(pStr) {
    if(!pStr) { pStr = encodeURIComponent(JSON.stringify(currentPresupuestoData)).replace(/'/g, "%27"); }
    const p = JSON.parse(decodeURIComponent(pStr));
    const printWindow = window.open('', '', 'height=800,width=1000');
    printWindow.document.write(`<html><head><title>Presupuesto</title></head><body><h2 style="text-align:center;">FORMATO DE PRESUPUESTO - BARRIO LOS NARANJOS</h2><p><strong>Solicitante:</strong> ${p.nombre || "N/A"} - ${p.cargo}</p><p><strong>Actividad:</strong> ${p.proposito}</p><p><strong>Total:</strong> S/ ${p.montoTotal}</p></body></html>`);
    printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); }, 500);
}