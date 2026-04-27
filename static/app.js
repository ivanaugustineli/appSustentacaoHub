document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api/atendimentos';

    // Elementos da UI
    const modal = document.getElementById('modalForm');
    const btnNovo = document.getElementById('btnNovoAtendimento');
    const btnClose = document.getElementById('btnCloseModal');
    const btnCancel = document.getElementById('btnCancel');
    const btnDelete = document.getElementById('btnDelete');
    const form = document.getElementById('atendimentoForm');
    const atendimentosList = document.getElementById('atendimentosList');
    const modalTitle = document.getElementById('modalTitle');

    // Elementos do Modal Custom
    const modalCustom = document.getElementById('modalCustom');
    const customMsg = document.getElementById('customModalMessage');
    const btnCustomOk = document.getElementById('btnCustomOk');
    const btnCustomCancel = document.getElementById('btnCustomCancel');

    // Estado
    let currentData = [];

    // Helper: Alert Customizado
    function customAlert(message) {
        return new Promise((resolve) => {
            customMsg.textContent = message;
            btnCustomCancel.classList.add('hidden');
            btnCustomOk.onclick = () => {
                modalCustom.classList.remove('show');
                resolve();
            };
            modalCustom.classList.add('show');
        });
    }

    // Helper: Confirm Customizado
    function customConfirm(message) {
        return new Promise((resolve) => {
            customMsg.textContent = message;
            btnCustomCancel.classList.remove('hidden');
            btnCustomOk.onclick = () => {
                modalCustom.classList.remove('show');
                resolve(true);
            };
            btnCustomCancel.onclick = () => {
                modalCustom.classList.remove('show');
                resolve(false);
            };
            modalCustom.classList.add('show');
        });
    }

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
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    // Modal
    function openModal(editData = null) {
        form.reset();
        document.getElementById('atendimentoId').value = '';
        btnDelete.classList.add('hidden');

        if (editData) {
            btnDelete.classList.remove('hidden');
            modalTitle.textContent = 'Editar Atendimento';
            document.getElementById('atendimentoId').value = editData.id;

            // Popula os campos
            const fields = ['atenNumeroPrimario', 'atenNumeroSecundario', 'atenTitulo',
                'atenAnalistaCliente', 'atenAnalistaInterno', 'atenSituacaoAtual',
                'atenPrioridade', 'atenDescricao',
                'atenCausa', 'atenSolucao', 'atenObservacao', 'atenTipo',
                'atenVertical', 'atenSistema', 'atenTipoOcorrencia', 'atenTipoSolucao'];

            fields.forEach(f => {
                if (document.getElementById(f)) document.getElementById(f).value = editData[f] || '';
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
            await customAlert(err.message);
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
            await customAlert(error.message);
        }
    });

    // Delete Atendimento
    btnDelete.addEventListener('click', async () => {
        const id = document.getElementById('atendimentoId').value;
        if (!id) return;

        const confirmacao = await customConfirm('Tem certeza que deseja excluir este atendimento? Esta ação não pode ser desfeita.');
        if (!confirmacao) return;

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Erro ao excluir atendimento');

            closeModal();
            loadAtendimentos();
        } catch (error) {
            await customAlert(error.message);
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

    window.sortBy = function (col) {
        if (currentSortColumn === col) {
            currentSortDirection *= -1;
        } else {
            currentSortColumn = col;
            currentSortDirection = 1;
        }
        renderAtendimentos(currentData);
    };

    window.filterBy = function (col, val) {
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

    window.clearFilters = function () {
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
                    <th onclick="sortBy('${col}')" data-col="${col}" style="position: relative;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span>${label} <span class="sort-icon ${active}">${arrow}</span></span>
                            ${groupingIcon}
                        </div>
                        ${filterHTML}
                        <div class="resizer" onclick="event.stopPropagation()"></div>
                    </th>
                `;
        }

        window.toggleTableGrouping = function (col) {
            currentGrouping = currentGrouping === col ? 'none' : col;
            renderAtendimentos(currentData);
        };

        // AJ19: Funções de Checkbox e Ações em Massa
        window.toggleAllCheckboxes = function (checked) {
            document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = checked);
        };

        window.handleBulkAction = async function (action) {
            if (!action) return;

            const checkboxes = document.querySelectorAll('.row-checkbox');
            const selectedIds = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.dataset.id);

            if (action === 'select_all') {
                checkboxes.forEach(cb => cb.checked = true);
            } else if (action === 'deselect_all') {
                checkboxes.forEach(cb => cb.checked = false);
            } else if (action === 'delete_selected') {
                if (selectedIds.length === 0) {
                    await customAlert('Nenhum atendimento selecionado.');
                    document.getElementById('bulkActionSelect').value = '';
                    return;
                }

                const confirmed = await customConfirm(`Deseja realmente excluir os ${selectedIds.length} atendimentos selecionados?`);
                if (!confirmed) {
                    document.getElementById('bulkActionSelect').value = '';
                    return;
                }

                let successCount = 0;
                for (const id of selectedIds) {
                    try {
                        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
                        if (res.ok) successCount++;
                    } catch (e) {
                        console.error(`Erro ao excluir ID ${id}:`, e);
                    }
                }

                await customAlert(`${successCount} atendimentos excluídos com sucesso.`);
                loadAtendimentos();
            }

            document.getElementById('bulkActionSelect').value = '';
        };

        // AJ11: Salva larguras das colunas
        function saveColumnWidths(table) {
            const widths = {};
            table.querySelectorAll("th").forEach((th, idx) => {
                const colKey = th.dataset.col || `col_${idx}`;
                widths[colKey] = th.style.width;
            });
            localStorage.setItem('shub_column_widths', JSON.stringify(widths));
        }

        // AJ01: Lógica de Resonamento de Colunas
        function initResizing(table) {
            const cols = table.querySelectorAll("th");
            
            // AJ10: Calcula largura mínima baseada nos dados "no momento" antes de aplicar larguras fixas
            table.style.tableLayout = "auto";
            cols.forEach(th => {
                const text = th.textContent.trim();
                if (text.includes("Nº Primário") || text.includes("Nº Secundário")) {
                    th.style.width = "auto";
                    th.style.minWidth = "0px";
                }
            });
            
            // Força o navegador a recalcular o layout para medir o tamanho natural
            const idPrimarioTh = Array.from(cols).find(th => th.textContent.includes("Nº Primário"));
            const idSecundarioTh = Array.from(cols).find(th => th.textContent.includes("Nº Secundário"));
            
            const minWidthPrimario = idPrimarioTh ? idPrimarioTh.offsetWidth : 0;
            const minWidthSecundario = idSecundarioTh ? idSecundarioTh.offsetWidth : 0;

            if (idPrimarioTh) idPrimarioTh.style.minWidth = `${minWidthPrimario}px`;
            if (idSecundarioTh) idSecundarioTh.style.minWidth = `${minWidthSecundario}px`;

            // AJ11: Carrega larguras salvas
            const savedWidths = JSON.parse(localStorage.getItem('shub_column_widths') || '{}');
            if (Object.keys(savedWidths).length > 0) {
                table.style.tableLayout = "fixed";
                table.style.width = "100%";
                cols.forEach((th, idx) => {
                    const colKey = th.dataset.col || `col_${idx}`;
                    if (savedWidths[colKey]) {
                        th.style.width = savedWidths[colKey];
                    }
                });
            } else {
                // Se não houver salvas, mantém o layout fixo para permitir redimensionamento futuro
                table.style.tableLayout = "fixed";
                table.style.width = "100%";
                cols.forEach(th => th.style.width = `${th.offsetWidth}px`);
            }

            cols.forEach((col) => {
                const resizer = col.querySelector(".resizer");
                if (!resizer) return;
                
                    resizer.addEventListener("mousedown", (e) => {
                        const startX = e.pageX;
                        const startWidth = col.offsetWidth;
                        
                        // Congela as larguras de todas as colunas para evitar redistribuição indesejada pelo navegador
                        cols.forEach(c => {
                            if (!c.style.width) {
                                c.style.width = `${c.offsetWidth}px`;
                            }
                        });
                        table.style.tableLayout = "fixed";
                        table.style.width = "100%";

                        // AJ05: Identifica a última coluna para compensação
                        const lastCol = cols[cols.length - 1];
                        const lastStartWidth = lastCol.offsetWidth;

                        if (col === lastCol) return; // Não redimensiona a última coluna contra ela mesma

                        const onMouseMove = (e) => {
                            let delta = e.pageX - startX;
                            let newWidth = startWidth + delta;
                            
                            // Respeita min-width da coluna atual
                            const minW = parseInt(window.getComputedStyle(col).minWidth) || 30;
                            if (newWidth < minW) {
                                delta = minW - startWidth;
                                newWidth = minW;
                            }
                            
                            // AJ05: Respeita min-width da última coluna (compensação)
                            const lastMinW = parseInt(window.getComputedStyle(lastCol).minWidth) || 30;
                            if (lastStartWidth - delta < lastMinW) {
                                delta = lastStartWidth - lastMinW;
                                newWidth = startWidth + delta;
                            }

                            col.style.width = `${newWidth}px`;
                            lastCol.style.width = `${lastStartWidth - delta}px`;
                        };

                    const onMouseUp = () => {
                        document.removeEventListener("mousemove", onMouseMove);
                        document.removeEventListener("mouseup", onMouseUp);
                        saveColumnWidths(table); // AJ11
                    };

                    document.addEventListener("mousemove", onMouseMove);
                    document.addEventListener("mouseup", onMouseUp);
                });

                // AJ08: Duplo clique para redimensionar ao tamanho do conteúdo (auto-fit)
                resizer.addEventListener("dblclick", () => {
                    const lastCol = cols[cols.length - 1];
                    if (col === lastCol) return;

                    // Congela larguras das outras para medir a natural desta
                    cols.forEach(c => {
                        if (!c.style.width) c.style.width = `${c.offsetWidth}px`;
                    });

                    const oldWidth = col.offsetWidth;
                    
                    // Temporariamente deixa a coluna auto-ajustar para medir o conteúdo
                    table.style.tableLayout = "auto";
                    const originalWidthStyle = col.style.width;
                    col.style.width = "auto";
                    
                    // Mede a largura natural (browser calcula baseada no conteúdo)
                    const contentWidth = col.offsetWidth;
                    
                    // Restaura layout fixo e aplica a nova largura com compensação
                    table.style.tableLayout = "fixed";
                    col.style.width = originalWidthStyle; // volta para o estilo anterior antes de calcular delta

                    const delta = contentWidth - oldWidth;
                    const lastCurrentWidth = lastCol.offsetWidth;

                    // Aplica nova largura e compensação na última coluna
                    col.style.width = `${contentWidth}px`;
                    lastCol.style.width = `${lastCurrentWidth - delta}px`;
                    
                    saveColumnWidths(table); // AJ11
                });
            });
        }

        table.innerHTML = `
                <thead>
                    <tr>
                        <th class="checkbox-col" style="position: relative; width: 50px; min-width: 50px; padding: 0.2rem; vertical-align: middle; border-right: 1px solid var(--border-color);">
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                                <span style="font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: var(--text-light);">Marca</span>
                                <div style="position: relative; display: inline-block;">
                                    <select id="bulkActionSelect" class="bulk-actions-select" style="width: 28px; height: 24px; padding: 0; appearance: none; -webkit-appearance: none; text-indent: -999px; cursor: pointer; background: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>') no-repeat center; border: 1px solid var(--border-color); border-radius: 4px;" onchange="handleBulkAction(this.value)">
                                        <option value="">...</option>
                                        <option value="select_all">Marcar Todos</option>
                                        <option value="deselect_all">Desmarcar Todos</option>
                                        <option value="delete_selected">Excluir Selecionados</option>
                                    </select>
                                </div>
                            </div>
                            <!-- AJ03: Removido resizer desta coluna para fixar o tamanho -->
                        </th>
                        ${th('atenNumeroPrimario', 'Nº Primário')}
                        ${th('atenNumeroSecundario', 'Nº Secundário')}
                        <th onclick="sortBy('atenTitulo')" style="position: relative; min-width: 160px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span>Título <span class="sort-icon ${currentSortColumn === 'atenTitulo' ? 'active' : ''}">${currentSortColumn === 'atenTitulo' && currentSortDirection === -1 ? '↓' : '↑'}</span></span>
                            </div>
                            <input type="text" class="table-filter" placeholder="Filtrar..." onclick="event.stopPropagation()" onkeyup="filterBy('atenTitulo', this.value)" value="${currentFilters['atenTitulo'] || ''}">
                            <div class="resizer" onclick="event.stopPropagation()"></div>
                        </th>
                        ${th('atenDataAbertura', 'Data Abertura')}
                        ${th('atenDataRecepcao', 'Data Recepção')}
                        ${th('atenAnalistaCliente', 'Analista Cliente', true)}
                        ${th('atenAnalistaInterno', 'Analista Interno', true)}
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
                    groupRow.innerHTML = `<td colspan="9">${groupVal}</td>`;
                    tbody.appendChild(groupRow);
                    lastGroup = groupVal;
                }
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                    <td class="checkbox-col" onclick="event.stopPropagation()">
                        <input type="checkbox" class="row-checkbox" data-id="${item.id}">
                    </td>
                    <td class="text-navy-primario">${item.atenNumeroPrimario || '-'}</td>
                    <td class="text-black-secundario">${item.atenNumeroSecundario || '-'}</td>
                    <td>${item.atenTitulo || '-'}</td>
                    <td>${formatDate(item.atenDataAbertura) || '-'}</td>
                    <td>${formatDate(item.atenDataRecepcao) || '-'}</td>
                    <td>${item.atenAnalistaCliente || '-'}</td>
                    <td>${item.atenAnalistaInterno || '-'}</td>
                    <td>${item.atenSituacaoAtual || '-'}</td>
                `;
            tr.onclick = () => editAtendimento(item.id);
            tbody.appendChild(tr);
        });
        atendimentosList.appendChild(table);
        initResizing(table);

        // Final updates
        updateFooterStats(processedData);
        populateFilterSelects(data);
    }



    window.editAtendimento = async function (id) {
        try {
            const response = await fetch(`${API_URL}/${id}`);
            const data = await response.json();
            openModal(data);
        } catch (e) {
            console.error("Erro ao carregar dados do atendimento:", e);
        }
    }

    // --- Lógica de Importação ---
    const modalImport = document.getElementById('modalImport');
    const btnImportar = document.getElementById('btnImportar');
    const btnCloseImport = document.getElementById('btnCloseImportModal');

    let importLayout = null;
    let importFile = null;

    btnImportar.addEventListener('click', () => {
        showImportStep(1);
        modalImport.classList.add('show');
    });

    btnCloseImport.addEventListener('click', () => {
        modalImport.classList.remove('show');
    });

    // Passo 1: Seleção de Layout
    document.querySelectorAll('.layout-option').forEach(opt => {
        opt.addEventListener('click', () => {
            importLayout = opt.dataset.layout;
            document.getElementById('selectedLayoutName').textContent = opt.querySelector('span').textContent;
            showImportStep(2);
        });
    });

    // Passo 2: Seleção de Arquivo
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('importFileInput');
    const btnConfirmFile = document.getElementById('btnConfirmFile');

    uploadArea.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    function handleFileSelect(file) {
        importFile = file;
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = `${(file.size / 1024).toFixed(1)} KB`;
        document.querySelector('.upload-placeholder').classList.add('hidden');
        document.getElementById('fileInfo').classList.remove('hidden');
        btnConfirmFile.classList.remove('disabled');
        btnConfirmFile.disabled = false;
    }

    btnConfirmFile.addEventListener('click', () => {
        document.getElementById('confirmFileName').textContent = importFile.name;

        // RA13: Mostrar checkbox apenas para layout Geral
        const container = document.getElementById('ignoreFinalizedContainer');
        if (importLayout === 'Geral') {
            container.classList.remove('hidden');
            container.style.display = 'flex';
        } else {
            container.classList.add('hidden');
            container.style.display = 'none';
        }

        showImportStep(3);
    });

    document.getElementById('btnBackToLayout').addEventListener('click', () => showImportStep(1));

    // Passo 3: Confirmação
    document.getElementById('btnCancelImport').addEventListener('click', () => {
        modalImport.classList.remove('show');
    });

    document.getElementById('btnStartImport').addEventListener('click', async () => {
        showImportStep(4);

        const formData = new FormData();
        formData.append('layout', importLayout);
        formData.append('file', importFile);

        // RA13: Enviar opção de ignorar finalizados
        if (importLayout === 'Geral') {
            const chk = document.getElementById('chkIgnoreFinalized');
            formData.append('ignorar_finalizados', chk.checked);
        }

        try {
            // Simular progresso visual
            let progress = 0;
            const interval = setInterval(() => {
                progress += 5;
                if (progress <= 90) {
                    document.getElementById('importProgressBar').style.width = `${progress}%`;
                }
            }, 100);

            const response = await fetch('/api/importar', {
                method: 'POST',
                body: formData
            });

            clearInterval(interval);
            document.getElementById('importProgressBar').style.width = '100%';

            if (!response.ok) throw new Error('Erro na importação');

            const result = await response.json();

            setTimeout(() => {
                showResult(result);
            }, 500);

        } catch (error) {
            await customAlert("Erro na importação: " + error.message);
            showImportStep(2);
        }
    });

    document.getElementById('btnCloseResult').addEventListener('click', () => {
        modalImport.classList.remove('show');
        loadAtendimentos();
    });

    function showResult(res) {
        document.getElementById('resInseridos').textContent = res.inseridos;
        document.getElementById('resAtualizados').textContent = res.atualizados;
        document.getElementById('resIgnorados').textContent = res.ignorados;
        document.getElementById('resErros').textContent = res.erros;

        const errorList = document.getElementById('importErrorList');
        const errorContainer = document.getElementById('errorListContainer');

        errorList.innerHTML = '';
        if (res.detalhes_erros && res.detalhes_erros.length > 0) {
            res.detalhes_erros.forEach(err => {
                const li = document.createElement('li');
                li.textContent = err;
                errorList.appendChild(li);
            });
            errorContainer.classList.remove('hidden');
        } else {
            errorContainer.classList.add('hidden');
        }

        showImportStep(5);
    }

    function showImportStep(step) {
        document.querySelectorAll('.import-step').forEach(s => s.classList.add('hidden'));
        document.getElementById(`importStep${step}`).classList.remove('hidden');

        if (step === 1) {
            importFile = null;
            importLayout = null;
            document.querySelector('.upload-placeholder').classList.remove('hidden');
            document.getElementById('fileInfo').classList.add('hidden');
            btnConfirmFile.classList.add('disabled');
            btnConfirmFile.disabled = true;
            fileInput.value = '';
            document.getElementById('importProgressBar').style.width = '0%';

            // Reset checkbox
            document.getElementById('chkIgnoreFinalized').checked = false;
        }
    }

    // Inicialização
    loadAtendimentos();
});
