# Contexto do Projeto: Gerenciador de Atendimentos de Sustentação (SQLite)

Você é um Analista Desenvolvedor Sênior. O objetivo é construir uma aplicação web de suporte técnica utilizando Python, **SQLite** e Nginx, rodando estritamente em Docker.

## 1. Diretrizes de Arquitetura

- **Stack:** Python (FastAPI para performance/lean), **SQLite** (banco embasado em arquivo, SQL), Nginx (Proxy Reverso).
- **Isolamento:** NADA deve ser instalado no host. Tudo (Python, dependências, banco em arquivo via volume) deve rodar via Docker Compose.
- **Minimalismo:** Evite bibliotecas pesadas. Use `FastAPI` + **`aiosqlite`** (driver assíncrono para SQLite) e, se necessário, **SQLAlchemy 2.x** em modo assíncrono com dialect SQLite, para manter o ambiente leve e consistência com `async/await`.

### Leiaute de Diretórios

~~~~
.
├── cursorrules-sqlite.md   # Regras de contexto para a IA (esta variante SQLite)
├── docker-compose.yml      # Orquestração (Nginx, App, volume para o .db)
├── app/
│   ├── main.py             # FastAPI
│   ├── database.py         # Conexão SQLite assíncrona (aiosqlite / SQLAlchemy async)
│   ├── models.py           # Pydantic schemas e/ou modelos alinhados à tabela
│   └── requirements.txt    # Dependências (ex.: fastapi, uvicorn, aiosqlite, sqlalchemy)
├── data/                   # Opcional: diretório montado como volume para o arquivo .db
│   └── .gitkeep
├── nginx/
│   └── default.conf        # Configuração do Proxy Reverso
├── static/
│   └── index.html          # Nova Interface Moderna
└── .env                    # Variáveis de ambiente (ex.: caminho do SQLite)
~~~~

## 2. Esquema de Dados (Tabela de Atendimentos)

Os modelos Pydantic e **registros na tabela SQLite** (uma tabela de atendimentos, com colunas alinhadas aos campos abaixo) devem seguir rigorosamente esta estrutura, **organizada por grupos de apresentação**:

- Persistência: mapear campos para tipos SQL adequados (`TEXT`, `TEXT`/`DATETIME` conforme convenção, enums como `TEXT` com valores restritos ou `INTEGER` + tabela de referência, conforme implementação).
- Identificador interno: usar `INTEGER PRIMARY KEY AUTOINCREMENT` (ou equivalente) como chave primária técnica, além dos campos de negócio `aten*`.

### 2.1. Grupo 1: Dados Principais (Exibidos por Padrão)

| Campo                | Tipo       | Nome Apresentável | Prioridade | Descrição Interna                          |
|----------------------|------------|-------------------|------------|--------------------------------------------|
| atenNumeroPrimario   | (string)   | Número Primário   | 1 | ID principal no cliente. |
| atenNumeroSecundario | (string)   | Número Secundário | 2 | Tarefa ou atendimento original. |
| atenTitulo           | (string)   | Titulo            | 3 | Descrição resumida. |
| atenDataAbertura     | (datetime) | Data de Abertura  | 4 | Abertura no cliente. |
| atenDataRecepcao     | (datetime) | Data de Recepção  | 5 | Chegada para análise. |
| atenAnalistaCliente  | (string)   | Analista Cliente  | 6 | Responsável no cliente. |
| atenAnalistaInterno  | (string)   | Analista Interno  | 7 | Responsável interno. |
| atenSituacaoAtual    | Enum (Aguardando Atendimento, Em Atendimento, Temporariamente Suspenso, Aguardando Cliente, Em Testes, Testado, Em Homologação, Aguardando Implantação, Finalizado) | Situação Atual    | 8 | Situação atual do atendimento. |
| atenPrioridade       | integer    | Prioridade | 9 | Grau de Prioridade do atendimento. |

### 2.2. Grupo 2: Dados Complementares (Detalhes do Atendimento)

| Campo                | Tipo       | Nome Apresentável | Prioridade | Descrição Interna                          |
|----------------------|------------|-------------------|------------|--------------------------------------------|
| atenDescricao        | (string)   | Descrição         | 10 | Texto completo do atendimento. |
| atenCausa            | (string)   | Causa Raiz        | 11 | Análise da causa raiz. |
| atenSolucao          | (string)   | Solução           | 12 | Descrição da resolução aplicada. |
| atenObservacao       | (string)   | Observação        | 13 | Notas adicionais e acompanhamento. |

### 2.3. Grupo 3: Dados da Solução (Classificações e Prazos)

| Campo                | Tipo       | Nome Apresentável | Prioridade | Descrição Interna                          |
|----------------------|------------|-------------------|------------|--------------------------------------------|
| atenTipo             | Enum (INC, PRB, RITM, SCTASK) | Tipo de Atendimento | 14 | Classificação do atendimento. |
| atenVertical         | Enum (<Nenhuma>, Bare, Holding, Previdência, VIDA) | Vertical | 15 | Área de negócio do cliente. |
| atenSistema          | Enum (<Nenhum>, SISE, BVPNEXT, BVPVIDA, PEGA, PIS, PIVI, SRVP, VPRS, PORTLET ACEITE DIGITAL, Outros) | Sistema | 16 | Sistema técnico afetado. |
| atenTipoOcorrencia   | Enum (<Nenhuma>, Concorrência, Consulta, Handover, Indevido, Infraestrutura, Legado, Melhoria, Operacional, Performance, Prob. Outro Sistema, Problema Sistêmico, Projeto, Suporte) | Tipo de Ocorrência | 17 | Classificação da ocorrência. |
| atenTipoSolucao      | Enum (<Nenhuma>,Ação Pendente, Contigencial, Definitiva, Não Corresponde) | Tipo de Solução | 18 | Tipo de solução aplicada. |
| atenDataLimite       | (datetime) | Data Limite       | 19 | Prazo para resolução do atendimento. |

## 3. Configuração Docker (Docker-only policy)

- O `Dockerfile` da aplicação deve usar uma imagem `python:3.11-slim` ou `alpine`.
- O `docker-compose.yml` deve conter:
  1. **`shub_app`:** FastAPI rodando com Uvicorn, com **volume** apontando para o diretório do arquivo SQLite (ex.: `./data:/app/data`), variável de ambiente com o caminho do `.db`.
  2. **`shub_web`:** Nginx como porta de entrada (`proxy_pass` para o app).
- **Não** é necessário serviço de banco separado: o SQLite roda **no processo da aplicação** contra arquivo persistente no volume.

## 4. Comandos Permitidos

- Utilize `docker-compose up --build` para refletir mudanças.
- Use `docker-compose exec app pip install ...` apenas se necessário atualizar o `requirements.txt`.

## 5. Padrões de Código

- Código em Python deve ser assíncrono (`async/await`) nas camadas de I/O (API e acesso ao SQLite via `aiosqlite` / SQLAlchemy async).
- Nomes de variáveis seguem o padrão definido na tabela (camelCase ou snake_case conforme convenção, mas mantendo o prefixo `aten`).
- Respostas da API devem ser JSON estruturado.
- Consultas SQL: usar **parâmetros vinculados** (prepared statements) para evitar injeção SQL.

## 6. Padrões de Interface

- A interface deve ser moderna e responsiva.
- Os dados devem ser apresentados em **ordem de prioridade dentro de cada grupo**.
- A exibição deve respeitar a hierarquia de grupos: **Dados Principais** (sempre visível), **Dados Complementares** (expansível), **Dados da Solução** (expansível).

### 6.1. Estrutura de Grupos de Apresentação

| Grupo                | Nome Apresentável | Prioridade | Visibilidade | Campos Pertencentes                                      |
|----------------------|-------------------|------------|--------------|----------------------------------------------------------|
| Dados Principais     | Dados Principais  | 1 | Sempre Visível | atenNumeroPrimario, atenNumeroSecundario, atenTitulo, atenDataAbertura, atenDataRecepcao, atenAnalistaCliente, atenAnalistaInterno, atenSituacaoAtual, atenPrioridade |
| Dados Complementares | Dados Complementares | 2 | Expansível | atenDescricao, atenCausa, atenSolucao, atenObservacao |
| Dados da Solução     | Dados da Solução | 3 | Expansível | atenTipo, atenVertical, atenSistema, atenTipoOcorrencia, atenTipoSolucao, atenDataLimite |

### 6.2. Implementação de Grupos na Interface

- **Visualização em Abas ou Painéis Expansíveis:** Cada grupo deve ser representado como uma seção colapsável ou aba dedicada.
- **Ordem de Apresentação:** 
  1. Exibir **Dados Principais** sempre visível (primeira seção do card/modal).
  2. **Dados Complementares** e **Dados da Solução** como seções expansíveis abaixo.
- **Ordem dos Campos Dentro do Grupo:** Respeitar a prioridade numérica definida (1 a 19) sequencialmente conforme o grupo.
- **Responsividade:** Em dispositivos móveis, considerar layout empilhado (stacked) para melhor legibilidade.

### 6.3. Ordem de Render Esperada

```
Grupo 1 - Dados Principais (Sempre Visível)
├─ Número Primário
├─ Número Secundário
├─ Titulo
├─ Data de Abertura
├─ Data de Recepção
├─ Analista Cliente
├─ Analista Interno
├─ Situação Atual
└─ Prioridade

Grupo 2 - Dados Complementares [+]
├─ Descrição
├─ Causa Raiz
├─ Solução
└─ Observaçãocls


Grupo 3 - Dados da Solução [+]
├─ Tipo de Atendimento
├─ Vertical
├─ Sistema
├─ Tipo de Ocorrência
├─ Tipo de Solução
└─ Data Limite
```

### 6.4. Navegação e Resumos

- **Sidebar de Filtros:** Deve ser fixa no lado esquerdo para facilitar o acesso aos filtros e agrupamentos da tabela.
- **Rodapé Dinâmico:** O rodapé deve apresentar resumos automáticos baseados nos dados visíveis:
    - **Botão "Todos":** Permite limpar todos os filtros aplicados instantaneamente.
    - **Por Tipo de Atendimento:** Sumariza quantidades por INC, PRB, etc. Estes itens são clicáveis para filtrar a lista.
    - **Por Situação Atual:** Sumariza quantidades para cada situação presente nos registros exibidos. Estes itens são clicáveis para filtrar a lista.

## 7. Padrões de Formulário (Criação e Edição)

- Os formulários de inclusão e alteração de atendimentos devem seguir **exatamente a mesma ordem de grupos e prioridades** da seção 2 (Esquema de Dados).
- Os campos de formato (datetime) devem permitir copiar e colar uma data/hora, mesmo sem a utilização do calendário do formulário.
  - Esta data e hora deverão ser validados ainda na entrada de dados, antes de ser gravada no banco de dados.
  - retornando qualquer inconsistência para o usuário, para que ele possa corrigir e tentar novamente.

### 7.1. Estrutura de Seções do Formulário

Cada formulário deve conter **3 seções claramente delimitadas** correspondendo aos 3 grupos:

| Seção | Grupo | Cor Indicadora | Campos | Notas |
|-------|-------|-------|--------|-------|
| Seção 1 | Dados Principais | Azul | Prioridades 1-9 | Sempre expandida, data defaults automáticos |
| Seção 2 | Dados Complementares | Âmbar | Prioridades 10-13 | Expandida por padrão, áreas de texto |
| Seção 3 | Dados da Solução | Verde | Prioridades 14-19 | Expandida por padrão, selects e datas |

### 7.2. Diretrizes de Apresentação em Formulário

- **Cada seção deve ter um header** identificando o grupo (ex: "1. Dados Principais")
- **Usar badges numerados** (1, 2, 3) para identificar os grupos
- **Dentro de cada seção**, campos em ordem rigorosa de prioridade (1 a 19)
- **Campos obrigatórios** dentro do Grupo 3 (Tipo, Vertical, Sistema, Tipo Ocorrência, Tipo Solução)
- **Campos de data** preenchem automaticamente com data/hora atual se vazios
- **Todos os campos de texto** com placeholders descritivos
- **Layout responsivo**: Grid 2 colunas no desktop, 1 no mobile

### 7.3. Sequência de Campos em Formulário

```
┌─────────────────────────────────────────────┐
│ SEÇÃO 1: DADOS PRINCIPAIS 🔵                │
├─────────────────────────────────────────────┤
│ 1️⃣  Número Primário          [__________]   │
│ 2️⃣  Número Secundário        [__________]   │
│ 3️⃣  Título                   [__________]   │
│ 4️⃣  Data de Abertura         [__________]   │
│ 5️⃣  Data de Recepção         [__________]   │
│ 6️⃣  Analista Cliente         [__________]   │
│ 7️⃣  Analista Interno         [__________]   │
│ 8️⃣  Situação Atual           [▼ Selecione]   │
│ 9️⃣  Prioridade               [__________]   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ SEÇÃO 2: DADOS COMPLEMENTARES 🟡            │
├─────────────────────────────────────────────┤
│ 1️⃣0️⃣ Descrição                               │
│     [_______________][_______________]      │
│                                             │
│ 1️⃣1️⃣ Causa Raiz                              │
│     [_______________][_______________]      │
│                                             │
│ 1️⃣2️⃣ Solução                                  │
│     [_______________][_______________]      │
│                                             │
│ 1️⃣3️⃣ Observação                             │
│     [_______________][_______________]      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ SEÇÃO 3: DADOS DA SOLUÇÃO 🟢                │
├─────────────────────────────────────────────┤
│ 1️⃣4️⃣ Tipo *          [▼ Selecione]        │
│ 1️⃣5️⃣ Vertical *      [▼ Selecione]        │
│ 1️⃣6️⃣ Sistema *       [▼ Selecione]        │
│ 1️⃣7️⃣ Tipo Ocorrência [▼ Selecione]        │
│ 1️⃣8️⃣ Tipo Solução *  [▼ Selecione]        │
│ 1️⃣9️⃣ Data Limite     [__________]         │
└─────────────────────────────────────────────┘
```

## 8. Geração do Resumo

- Um resumo de utilização do app deve ser gerado com base nos dados do atendimento e deve ser apresentado de forma clara e concisa.
- O arquivo deve ser gerado no formato MarkDown, no diretório raiz do projeto e com o nome "README.md".
