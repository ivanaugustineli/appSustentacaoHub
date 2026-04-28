# Gerenciador de Atendimentos de Sustentação

Bem-vindo ao **SustentaçãoHub**, uma aplicação web minimalista e de alta performance projetada para o gerenciamento de atendimentos de suporte técnico.

## Arquitetura

A aplicação foi construída visando eficiência, isolamento e modernidade:
- **Backend**: FastAPI (Python 3.11) + SQLAlchemy Assíncrono (`aiosqlite`).
- **Banco de Dados**: SQLite persistido em arquivo local (`/data/atendimentos.db`), operando sem necessidade de serviço de banco pesado.
- **Frontend**: Single Page Application (SPA) utilizando HTML5, CSS3 Vanilla (com variáveis CSS e layout responsivo) e JavaScript moderno (Fetch API).
- **Infraestrutura**: Orquestrado estritamente via Docker Compose, com o Nginx atuando como proxy reverso e servidor estático.

## Estrutura de Dados do Atendimento

A aplicação é rigorosamente orientada aos grupos de apresentação definidos no esquema de dados:

1. **Dados Principais (Prioridade 1-9)**: Inclui Número Primário, Secundário, Título, Datas de Abertura/Recepção, Analistas (Cliente/Interno) e Situação. Sempre visível na listagem.
2. **Dados Complementares (Prioridade 10-13)**: Detalhes textuais expansíveis como Descrição, Causa Raiz, Solução e Observações.
3. **Dados da Solução (Prioridade 14-19)**: Categorizações estruturadas como Tipo, Vertical, Sistema, Ocorrência, Tipo de Solução e Data Limite.

### Campos Completos

| Campo | Grupo | Descrição |
|-------|-------|-----------|
| `id` | Sistema | Identificador único auto-incrementado |
| `atenNumeroPrimario` | 1 | Número principal do atendimento |
| `atenNumeroSecundario` | 1 | Número secundário (filho/relacionado) |
| `atenTitulo` | 1 | Título/descrição resumida |
| `atenDataAbertura` | 1 | Data de abertura do atendimento |
| `atenDataRecepcao` | 1 | Data de recepção no sistema |
| `atenAnalistaCliente` | 1 | Analista do lado do cliente |
| `atenAnalistaInterno` | 1 | Analista interno |
| `atenSituacaoAtual` | 1 | Estado atual do atendimento |
| `atenPrioridade` | 1 | Prioridade (1-5) |
| `atenDescricao` | 2 | Descrição detalhada |
| `atenCausa` | 2 | Causa raiz do problema |
| `atenSolucao` | 2 | Solução aplicada |
| `atenObservacao` | 2 | Observações adicionais |
| `atenTipo` | 3 | Tipo (INC, PRB, RITM, SCTASK) |
| `atenVertical` | 3 | Vertical de mercado |
| `atenSistema` | 3 | Sistema envolvido |
| `atenTipoOcorrencia` | 3 | Tipo de ocorrência |
| `atenTipoSolucao` | 3 | Tipo de solução aplicada |
| `atenDataLimite` | 3 | Prazo para resolução |

## API REST

A aplicação expõe os seguintes endpoints:

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/atendimentos` | Lista todos os atendimentos (ordenado por ID DESC) |
| `POST` | `/atendimentos` | Cria um novo atendimento |
| `GET` | `/atendimentos/{id}` | Retorna um atendimento específico |
| `PUT` | `/atendimentos/{id}` | Atualiza um atendimento existente |
| `DELETE` | `/atendimentos/{id}` | Exclui um atendimento |
| `POST` | `/importar` | Importa atendimentos via CSV |
| `GET` | `/config` | Retorna a configuração global |
| `POST` | `/config` | Salva a configuração global |

## Como Utilizar a Aplicação

### 1. Iniciar o Ambiente

Nenhuma dependência precisa ser instalada no seu sistema host. Apenas o Docker é necessário.
Execute o seguinte comando na raiz do projeto:

```bash
docker-compose up --build -d
```

### 2. Acessar a Interface

Após a inicialização dos contêineres, abra o navegador em:
[http://localhost:8080](http://localhost:8080)

### 3. Gerenciar Atendimentos

- **Visualização**: A tela inicial apresenta seus atendimentos. Você pode alternar livremente entre uma grade de Cards (com todos os detalhes) ou uma Tabela de Dados tipo Planilha (focada apenas nos Dados Principais), usando o controle no cabeçalho.
- **Tabela em Tela Cheia**: Ao optar pela exibição em Lista, o layout se expande para 100% da largura da tela. A tabela oferece ordenação (clicando no cabeçalho das colunas) e filtros avançados textuais (digitando nas caixas abaixo de cada título).
- **Detalhes Expansíveis**: No modo Cards, clique nos cabeçalhos `Dados Complementares [+]` ou `Dados da Solução [+]` em qualquer card para expandir ou retrair as informações detalhadas de forma fluida.
- **Novo Atendimento**: Clique no botão `+ Novo Atendimento` no canto superior direito para abrir o modal de inserção.
- **Formato Flexível de Datas**: Você pode copiar e colar datas livremente nos campos de data (ex: `15/04/2026 14:30` ou formatos ISO). O sistema valida e normatiza a entrada automaticamente antes de enviar ao servidor.
- **Edição**: Clique no título ou cabeçalho azul de um card existente para editar suas informações.

### 4. Importação de Dados

A aplicação permite a importação em massa de atendimentos através de arquivos `.csv`.
Clique no botão **Importar** no topo da tela e siga os passos:
1. **Selecionar Layout**: Escolha entre:
   - **Incidentes (INC)**: Origem ServiceNow - importa número, título, data, situação, analista, descrição e prioridade.
   - **Problemas (PRB)**: Origem ServiceNow - mesmo leiaute dos incidentes.
   - **Solicitações (RITM)**: Origem ServiceNow - utiliza `parent` como número primário e `number` como secundário.
   - **Geral**: Layout do AzureDevOps - suporta múltiplos tipos em um único arquivo, extraindo números automaticamente do título.
2. **Upload**: Selecione o arquivo CSV correspondente ao layout escolhido. Suporta delimitadores `;` e `,`.
3. **Opções**: No layout Geral, marque "Ignorar Finalizados" para não importar registros com situação "Finalizado".
4. **Deduplicação**: O sistema utiliza a combinação de **Número Primário + Número Secundário** como chave única.
   - Se o registro não existir: Ele será **inserido**.
   - Se o registro já existir: O sistema compara os dados. Se houver qualquer diferença, o registro será **atualizado**. Caso contrário, será ignorado.
5. **Resultado**: Ao finalizar, é apresentada uma janela modal com o resumo da importação (inseridos, atualizados, ignorados e erros).

### 5. Configurações e Persistência

A configuração da interface (como larguras das colunas da tabela) é armazenada no arquivo `.SHconfig` no diretório `data/`. Esta configuração é compartilhada entre todos os usuários e navegadores.

### 6. Estrutura de Persistência

Os dados inseridos são persistidos de forma segura no arquivo `data/atendimentos.db` no seu host local (graças ao mapeamento de volume do Docker Compose). Se você precisar fazer backup ou inspecionar o banco diretamente, basta acessar este diretório.

## Comandos Úteis

- Iniciar a aplicação: `docker-compose up --build -d`
- Parar a aplicação: `docker-compose down`
- Reiniciar contêineres: `docker-compose restart`
- Acessar logs do backend: `docker-compose logs -f shub_app`
- Acessar logs do web server: `docker-compose logs -f shub_web`
- Rebuild completo: `docker-compose down && docker-compose up --build -d`

## Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `DATABASE_URL` | `sqlite+aiosqlite:///code/data/atendimentos.db` | URL de conexão do banco de dados |

## Tecnologias

- **FastAPI** - Framework web assíncrono
- **SQLAlchemy** - ORM com suporte assíncrono
- **aiosqlite** - Driver SQLite assíncrono
- **Pydantic** - Validação de dados
- **Nginx** - Servidor web e proxy reverso
- **Docker** - Containerização
