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
    // Estado
    let currentData = [];

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
                            'atenAnalistaCliente', 'atenAnalistaInterno', 'atenSituacaoAtual', 
                            'atenPrioridade', 'atenDescricao', 
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

        const priEl = document.getElementById('atenPrioridade');
        payload.atenPrioridade = priEl && priEl.value ? parseInt(priEl.value) : null;

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
    let currentGrouping = 'none';

    // AJ05: Sidebar events
    document.querySelectorAll('input[name="groupCards"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentGrouping = e.target.value;
            renderAtendimentos(currentData);
        });
    });

    ['filterAnalistaClienteCards', 'filterAnalistaInternoCards', 'filterSituacaoAtualCards'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('change', (e) => {
            const field = id.replace('filter', '').replace('Cards', '');
            const fieldKey = 'aten' + field;
            window.filterBy(fieldKey, e.target.value);
        });
    });

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
        
        // Update both list and card filters UI
        updateFilterUI(col, val);

        // Retomar foco apenas se for input (para filtros de texto)
        const newInput = document.querySelector(`th input[onkeyup*="'${col}'"]`);
        if (newInput) {
            newInput.focus();
            newInput.selectionStart = newInput.selectionEnd = newInput.value.length;
        }
    };

    window.clearFilters = function() {
        currentFilters = {};
        // Reset UI inputs
        document.querySelectorAll('.table-filter').forEach(el => el.value = '');
        document.querySelectorAll('.filter-select').forEach(el => el.value = '');
        renderAtendimentos(currentData);
    };

    function updateFilterUI(col, val) {
        // List UI
        const listSelect = document.querySelector(`th select[onchange*="'${col}'"]`);
        if (listSelect) listSelect.value = val;
        
        const listInput = document.querySelector(`th input[onkeyup*="'${col}'"]`);
        if (listInput) listInput.value = val;

        // Cards Sidebar UI
        const sidebarId = 'filter' + col.replace('aten', '') + 'Cards';
        const sidebarSelect = document.getElementById(sidebarId);
        if (sidebarSelect) sidebarSelect.value = val;
    }

    function updateFooterStats(data) {
        const total = data.length;
        document.getElementById('statTotal').textContent = `Total de Atendimentos: ${total}`;

        // AJ11: Summary by Type
        const typesRow = document.getElementById('footerTypes');
        const typesCount = data.reduce((acc, item) => {
            const type = item.atenTipo || 'N/A';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        const allBtn = `<div class="summary-item clickable" style="background: var(--primary-color); color: white;" onclick="clearFilters()" title="Limpar todos os filtros">Todos: ${currentData.length}</div>`;

        typesRow.innerHTML = allBtn + Object.entries(typesCount)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => `
                <div class="summary-item clickable" onclick="filterBy('atenTipo', '${type}')" title="Clique para filtrar por ${type}">
                    ${type}: ${count}
                </div>
            `).join('') || '<div class="summary-item">Nenhum registro</div>';

        // AJ10: Summary by Situation
        const situationsRow = document.getElementById('footerSituations');
        const situationsCount = data.reduce((acc, item) => {
            const sit = item.atenSituacaoAtual || 'N/A';
            acc[sit] = (acc[sit] || 0) + 1;
            return acc;
        }, {});

        situationsRow.innerHTML = Object.entries(situationsCount)
            .sort((a, b) => b[1] - a[1])
            .map(([sit, count]) => `
                <div class="summary-item clickable" onclick="filterBy('atenSituacaoAtual', '${sit}')" title="Clique para filtrar por ${sit}">
                    ${sit}: ${count}
                </div>
            `).join('') || '<div class="summary-item">Nenhum registro</div>';
    }

    function populateFilterSelects(data) {
        const fields = ['atenAnalistaCliente', 'atenAnalistaInterno', 'atenSituacaoAtual'];
        fields.forEach(field => {
            const uniqueValues = [...new Set(data.map(item => item[field]).filter(Boolean))].sort();
            
            // Sidebar selects
            const sidebarId = 'filter' + field.replace('aten', '') + 'Cards';
            const sidebarSelect = document.getElementById(sidebarId);
            if (sidebarSelect) {
                const currentVal = sidebarSelect.value;
                sidebarSelect.innerHTML = '<option value="">Todos</option>' + 
                    uniqueValues.map(v => `<option value="${v}">${v}</option>`).join('');
                sidebarSelect.value = currentVal;
            }
        });
    }

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
        
        const table = document.createElement('table');
        table.className = 'data-table';

            function th(col, label, isSelect = false) {
                const isSorted = currentSortColumn === col;
                const arrow = isSorted && currentSortDirection === -1 ? '↓' : '↑';
                const active = isSorted ? 'active' : '';
                const filterVal = currentFilters[col] || '';
                
                let filterHTML = '';
                if (isSelect) {
                    const uniqueValues = [...new Set(currentData.map(item => item[col]).filter(Boolean))].sort();
                    filterHTML = `
                        <select class="table-filter" onclick="event.stopPropagation()" onchange="filterBy('${col}', this.value)">
                            <option value="">Todos</option>
                            ${uniqueValues.map(v => `<option value="${v}" ${v.toLowerCase() === filterVal ? 'selected' : ''}>${v}</option>`).join('')}
                        </select>
                    `;
                } else {
                    filterHTML = `<input type="text" class="table-filter" placeholder="Filtrar..." onclick="event.stopPropagation()" onkeyup="filterBy('${col}', this.value)" value="${filterVal}">`;
                }

                const groupingIcon = ['atenAnalistaCliente', 'atenAnalistaInterno', 'atenSituacaoAtual'].includes(col) ? 
                    `<span class="group-toggle ${currentGrouping === col ? 'active' : ''}" onclick="event.stopPropagation(); window.toggleTableGrouping('${col}')" title="Agrupar por este campo">📁</span>` : '';

                return `
                    <th onclick="sortBy('${col}')">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span>${label} <span class="sort-icon ${active}">${arrow}</span></span>
                            ${groupingIcon}
                        </div>
                        ${filterHTML}
                    </th>
                `;
            }

            window.toggleTableGrouping = function(col) {
                currentGrouping = currentGrouping === col ? 'none' : col;
                renderAtendimentos(currentData);
            };
            
            table.innerHTML = `
                <thead>
                    <tr>
                        ${th('atenNumeroPrimario', 'Nº Primário')}
                        ${th('atenNumeroSecundario', 'Nº Secundário')}
                        ${th('atenTitulo', 'Título')}
                        ${th('atenDataAbertura', 'Data Abertura')}
                        ${th('atenDataRecepcao', 'Data Recepção')}
                        ${th('atenAnalistaCliente', 'An. Cliente', true)}
                        ${th('atenAnalistaInterno', 'An. Interno', true)}
                        ${th('atenSituacaoAtual', 'Situação Atual', true)}
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');
            
            let lastGroup = null;
            processedData.forEach(item => {
                if (currentGrouping !== 'none') {
                    const groupVal = item[currentGrouping] || 'Não definido';
                    if (groupVal !== lastGroup) {
                        const groupRow = document.createElement('tr');
                        groupRow.className = 'group-header-row';
                        groupRow.innerHTML = `<td colspan="8">${groupVal}</td>`;
                        tbody.appendChild(groupRow);
                        lastGroup = groupVal;
                    }
                }

                const tr = document.createElement('tr');
                tr.onclick = () => editAtendimento(item.id);
                tr.innerHTML = `
                    <td class="text-red-primario">${item.atenNumeroPrimario || '-'}</td>
                    <td class="text-orange-secundario">${item.atenNumeroSecundario || '-'}</td>
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

        // Final updates
        updateFooterStats(processedData);
        populateFilterSelects(data);
    }



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
