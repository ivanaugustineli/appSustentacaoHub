document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api/atendimentos';
    
    // Elementos da UI
    const modal = document.getElementById('modalForm');
    const btnNovo = document.getElementById('btnNovoAtendimento');
    const btnClose = document.getElementById('btnCloseModal');
    const btnCancel = document.getElementById('btnCancel');
    const form = document.getElementById('atendimentoForm');
    const atendimentosList = document.getElementById('atendimentosList');
    const modalTitle = document.getElementById('modalTitle');
    const btnViewCards = document.getElementById('btnViewCards');
    const btnViewList = document.getElementById('btnViewList');

    // View Toggle Logic
    let currentView = localStorage.getItem('shub_view_mode') || 'cards';
    let currentData = [];
    
    function setViewMode(mode) {
        currentView = mode;
        localStorage.setItem('shub_view_mode', mode);
        
        if (mode === 'list') {
            btnViewList.classList.add('active');
            btnViewCards.classList.remove('active');
            atendimentosList.className = 'atendimentos-table-container';
            document.body.classList.add('mode-list');
        } else {
            btnViewCards.classList.add('active');
            btnViewList.classList.remove('active');
            atendimentosList.className = 'atendimentos-grid';
            document.body.classList.remove('mode-list');
        }

        if (currentData.length > 0) { // re-render if we have data
            renderAtendimentos(currentData);
        }
    }

    btnViewCards.addEventListener('click', () => setViewMode('cards'));
    btnViewList.addEventListener('click', () => setViewMode('list'));

    // Inicializar visualização
    setViewMode(currentView);

    // Utilitário: Parser de Data para ISO (aceitando colagem dd/mm/yyyy hh:mm ou yyyy-mm-ddThh:mm)
    function parseDate(inputStr) {
        if (!inputStr) return null;
        // Tenta ISO primeiro
        let d = new Date(inputStr);
        if (!isNaN(d.getTime()) && inputStr.includes('-')) {
            return d.toISOString();
        }
        // Tenta parse do formato BR: dd/mm/yyyy hh:mm
        const parts = inputStr.split(/[\sT]+/);
        const datePart = parts[0];
        const timePart = parts[1] || '00:00';
        
        const dateParts = datePart.split('/');
        if (dateParts.length === 3) {
            const timeParts = timePart.split(':');
            const [day, month, year] = dateParts;
            const hour = timeParts[0] || '00';
            const min = timeParts[1] || '00';
            
            d = new Date(`${year}-${month}-${day}T${hour}:${min}:00`);
            if (!isNaN(d.getTime())) return d.toISOString();
        }
        throw new Error('Data inválida. Use AAAA-MM-DD ou DD/MM/AAAA HH:MM');
    }

    function formatDate(isoStr) {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return '';
        const pad = n => n.toString().padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    // Modal
    function openModal(editData = null) {
        form.reset();
        document.getElementById('atendimentoId').value = '';
        
        if (editData) {
            modalTitle.textContent = 'Editar Atendimento';
            document.getElementById('atendimentoId').value = editData.id;
            
            // Popula os campos
            const fields = ['atenNumeroPrimario', 'atenNumeroSecundario', 'atenTitulo', 
                            'atenAnalistaCliente', 'atenAnalistaInterno', 'atenSituacaoAtual', 'atenDescricao', 
                            'atenCausa', 'atenSolucao', 'atenObservacao', 'atenTipo', 
                            'atenVertical', 'atenSistema', 'atenTipoOcorrencia', 'atenTipoSolucao'];
            
            fields.forEach(f => {
                if(document.getElementById(f)) document.getElementById(f).value = editData[f] || '';
            });

            // Datas
            ['atenDataAbertura', 'atenDataRecepcao', 'atenDataLimite'].forEach(f => {
                if (editData[f]) document.getElementById(f).value = formatDate(editData[f]);
            });
        } else {
            modalTitle.textContent = 'Novo Atendimento';
            // Defaults
            const now = new Date().toISOString();
            document.getElementById('atenDataAbertura').value = formatDate(now);
            document.getElementById('atenDataRecepcao').value = formatDate(now);
        }
        
        modal.classList.add('show');
    }

    function closeModal() {
        modal.classList.remove('show');
    }

    btnNovo.addEventListener('click', () => openModal());
    btnClose.addEventListener('click', closeModal);
    btnCancel.addEventListener('click', closeModal);

    // Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {};
        const stringFields = ['atenNumeroPrimario', 'atenNumeroSecundario', 'atenTitulo', 
            'atenAnalistaCliente', 'atenAnalistaInterno', 'atenSituacaoAtual', 'atenDescricao', 'atenCausa', 
            'atenSolucao', 'atenObservacao', 'atenTipo', 'atenVertical', 'atenSistema', 
            'atenTipoOcorrencia', 'atenTipoSolucao'];
        
        stringFields.forEach(f => {
            const el = document.getElementById(f);
            payload[f] = el ? (el.value || null) : null;
        });

        // Datas validação
        try {
            ['atenDataAbertura', 'atenDataRecepcao', 'atenDataLimite'].forEach(f => {
                const el = document.getElementById(f);
                const val = el ? el.value : '';
                payload[f] = val ? parseDate(val) : null;
            });
        } catch (err) {
            alert(err.message);
            return;
        }

        const id = document.getElementById('atendimentoId').value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/${id}` : API_URL;

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Erro ao salvar no servidor');
            
            closeModal();
            loadAtendimentos();
        } catch (error) {
            alert(error.message);
        }
    });

    // Carregar Lista
    async function loadAtendimentos() {
        try {
            const response = await fetch(API_URL);
            currentData = await response.json();
            renderAtendimentos(currentData);
        } catch (error) {
            console.error("Erro ao carregar atendimentos:", error);
        }
    }

    // Estado da Tabela
    let currentSortColumn = null;
    let currentSortDirection = 1;
    let currentFilters = {};

    window.sortBy = function(col) {
        if (currentSortColumn === col) {
            currentSortDirection *= -1;
        } else {
            currentSortColumn = col;
            currentSortDirection = 1;
        }
        renderAtendimentos(currentData);
    };

    window.filterBy = function(col, val) {
        currentFilters[col] = val.toLowerCase();
        renderAtendimentos(currentData);
        // Retomar foco após o re-render
        const newInput = document.querySelector(`th input[onkeyup*="'${col}'"]`);
        if (newInput) {
            newInput.focus();
            newInput.selectionStart = newInput.selectionEnd = newInput.value.length;
        }
    };

    function renderAtendimentos(data) {
        atendimentosList.innerHTML = '';

        let processedData = data.filter(item => {
            for (let col in currentFilters) {
                if (currentFilters[col]) {
                    let val = item[col] || '';
                    if (['atenDataAbertura', 'atenDataRecepcao', 'atenDataLimite'].includes(col)) {
                        val = formatDate(val);
                    }
                    if (!String(val).toLowerCase().includes(currentFilters[col])) {
                        return false;
                    }
                }
            }
            return true;
        });

        if (currentSortColumn) {
            processedData.sort((a, b) => {
                let valA = a[currentSortColumn] || '';
                let valB = b[currentSortColumn] || '';
                if (valA < valB) return -1 * currentSortDirection;
                if (valA > valB) return 1 * currentSortDirection;
                return 0;
            });
        }
        
        if (currentView === 'list') {
            const table = document.createElement('table');
            table.className = 'data-table';

            function th(col, label) {
                const isSorted = currentSortColumn === col;
                const arrow = isSorted && currentSortDirection === -1 ? '↓' : '↑';
                const active = isSorted ? 'active' : '';
                const filterVal = currentFilters[col] || '';
                return `
                    <th onclick="sortBy('${col}')">
                        ${label} <span class="sort-icon ${active}">${arrow}</span><br>
                        <input type="text" class="table-filter" placeholder="Filtrar..." onclick="event.stopPropagation()" onkeyup="filterBy('${col}', this.value)" value="${filterVal}">
                    </th>
                `;
            }
            
            table.innerHTML = `
                <thead>
                    <tr>
                        ${th('atenNumeroPrimario', 'Nº Primário')}
                        ${th('atenNumeroSecundario', 'Nº Secundário')}
                        ${th('atenTitulo', 'Título')}
                        ${th('atenDataAbertura', 'Data Abertura')}
                        ${th('atenDataRecepcao', 'Data Recepção')}
                        ${th('atenAnalistaCliente', 'An. Cliente')}
                        ${th('atenAnalistaInterno', 'An. Interno')}
                        ${th('atenSituacaoAtual', 'Situação Atual')}
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');
            
            processedData.forEach(item => {
                const tr = document.createElement('tr');
                tr.onclick = () => editAtendimento(item.id);
                tr.innerHTML = `
                    <td>${item.atenNumeroPrimario || '-'}</td>
                    <td>${item.atenNumeroSecundario || '-'}</td>
                    <td>${item.atenTitulo || '-'}</td>
                    <td>${formatDate(item.atenDataAbertura) || '-'}</td>
                    <td>${formatDate(item.atenDataRecepcao) || '-'}</td>
                    <td>${item.atenAnalistaCliente || '-'}</td>
                    <td>${item.atenAnalistaInterno || '-'}</td>
                    <td>${item.atenSituacaoAtual || '-'}</td>
                `;
                tbody.appendChild(tr);
            });
            atendimentosList.appendChild(table);
        } else {
            processedData.forEach(item => {
                const card = document.createElement('div');
                card.className = 'card';
                
                // Dados Principais
                const header = `
                    <div class="card-header" onclick="editAtendimento(${item.id})">
                        <div class="card-title">${item.atenTitulo || 'Sem título'}</div>
                        <div class="card-subtitle">
                            <span>Pri: ${item.atenNumeroPrimario || '-'}</span>
                            <span>${formatDate(item.atenDataAbertura) || '-'}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="card-group">
                            <div class="field"><span class="field-label">Secundário:</span><span class="field-value">${item.atenNumeroSecundario || '-'}</span></div>
                            <div class="field"><span class="field-label">Recepção:</span><span class="field-value">${formatDate(item.atenDataRecepcao) || '-'}</span></div>
                            <div class="field"><span class="field-label">An. Cliente:</span><span class="field-value">${item.atenAnalistaCliente || '-'}</span></div>
                            <div class="field"><span class="field-label">An. Interno:</span><span class="field-value">${item.atenAnalistaInterno || '-'}</span></div>
                            <div class="field"><span class="field-label">Situação:</span><span class="field-value">${item.atenSituacaoAtual || '-'}</span></div>
                        </div>

                        <div class="card-group">
                            <div class="group-title g2" onclick="toggleGroup(this)">Dados Complementares</div>
                            <div class="group-content">
                                <div class="field"><span class="field-label">Descrição:</span><span class="field-value">${item.atenDescricao || '-'}</span></div>
                                <div class="field"><span class="field-label">Causa Raiz:</span><span class="field-value">${item.atenCausa || '-'}</span></div>
                                <div class="field"><span class="field-label">Solução:</span><span class="field-value">${item.atenSolucao || '-'}</span></div>
                                <div class="field"><span class="field-label">Observação:</span><span class="field-value">${item.atenObservacao || '-'}</span></div>
                            </div>
                        </div>

                        <div class="card-group">
                            <div class="group-title g3" onclick="toggleGroup(this)">Dados da Solução</div>
                            <div class="group-content">
                                <div class="field"><span class="field-label">Tipo:</span><span class="field-value">${item.atenTipo || '-'}</span></div>
                                <div class="field"><span class="field-label">Vertical:</span><span class="field-value">${item.atenVertical || '-'}</span></div>
                                <div class="field"><span class="field-label">Sistema:</span><span class="field-value">${item.atenSistema || '-'}</span></div>
                                <div class="field"><span class="field-label">Ocorrência:</span><span class="field-value">${item.atenTipoOcorrencia || '-'}</span></div>
                                <div class="field"><span class="field-label">Tipo Solução:</span><span class="field-value">${item.atenTipoSolucao || '-'}</span></div>
                                <div class="field"><span class="field-label">Data Limite:</span><span class="field-value">${formatDate(item.atenDataLimite) || '-'}</span></div>
                            </div>
                        </div>
                    </div>
                `;
                
                card.innerHTML = header;
                atendimentosList.appendChild(card);
            });
        }
    }

    // Toggle visibility of groups
    window.toggleGroup = function(element) {
        element.classList.toggle('expanded');
        const content = element.nextElementSibling;
        content.classList.toggle('show');
    };

    window.editAtendimento = async function(id) {
        try {
            const response = await fetch(`${API_URL}/${id}`);
            const data = await response.json();
            openModal(data);
        } catch(e) {
            console.error("Erro ao carregar dados do atendimento:", e);
        }
    }

    // Inicialização
    loadAtendimentos();
});
