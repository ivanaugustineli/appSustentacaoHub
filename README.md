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

1. **Dados Principais (Prioridade 1-7)**: Inclui Número Primário, Secundário, Título, Datas de Abertura/Recepção e Analistas. Sempre visível na listagem.
2. **Dados Complementares (Prioridade 8-11)**: Detalhes textuais expansíveis como Descrição, Causa Raiz, Solução e Observações.
3. **Dados da Solução (Prioridade 12-17)**: Categorizações estruturadas como Tipo, Vertical, Sistema, Ocorrência, Tipo de Solução e Data Limite.

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

### 4. Estrutura de Persistência

Os dados inseridos são persistidos de forma segura no arquivo `data/atendimentos.db` no seu host local (graças ao mapeamento de volume do Docker Compose). Se você precisar fazer backup ou inspecionar o banco diretamente, basta acessar este diretório.

## Comandos Úteis

- Parar a aplicação: `docker-compose down`
- Acessar logs do backend: `docker-compose logs -f shub_app`
- Acessar logs do web server: `docker-compose logs -f shub_web`
