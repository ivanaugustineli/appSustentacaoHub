# Plano de Implementação: Atualizações de Layout e Novos Campos (Situação Atual)

Este documento descreve as etapas para adicionar o novo campo "Situação Atual", adaptar a visualização de "Lista" (Tabela) para tela inteira e introduzir funcionalidades de filtro e ordenação por coluna.

## Alterações Propostas

### 1. Backend (Banco de Dados e API)
#### [MODIFY] `app/models.py`
- Inclusão do campo `atenSituacaoAtual = Column(String, nullable=True)` no modelo SQLAlchemy `Atendimento`.
- Atualização do schema base do Pydantic (`AtendimentoBase`) para aceitar o campo `atenSituacaoAtual`.

#### [MODIFY] `app/database.py`
- Adicionar uma rotina rudimentar de migração na função `init_db()`.
- Após o `create_all`, tentaremos executar `ALTER TABLE atendimentos ADD COLUMN "atenSituacaoAtual" VARCHAR` capturando a exceção se a coluna já existir. Isso garantirá que o banco de dados atual do usuário mantenha todos os registros existentes sem corrupção.

### 2. Frontend (HTML e Estilos)
#### [MODIFY] `static/index.html`
- Inclusão de um novo campo `<select id="atenSituacaoAtual">` com as opções do Enum definidas no `context.md` (Aguardando Atendimento, Em Atendimento, etc.) dentro do formulário "Dados Principais" (Grupo 1).

#### [MODIFY] `static/style.css`
- Atualizar a classe `.container` para que, quando a visualização em lista estiver ativa, ela ocupe 100% da largura da janela (`max-width: 100%` ou `100vw`).
- Adicionar estilização para os cabeçalhos de ordenação (ex: setas ↑ e ↓).
- Adicionar estilização para os inputs de filtro (`input[type="text"]` minúsculos) posicionados dentro dos próprios `<th>`.

### 3. Frontend (Comportamento e Lógica)
#### [MODIFY] `static/app.js`
- **Novo Campo**: Adicionar `atenSituacaoAtual` à lista de strings capturadas/preenchidas pelo formulário modal e renderizadas na tabela e nos cards.
- **Estado da Tabela**: Criar variáveis de estado para a ordenação (ex: `currentSortColumn`, `currentSortDirection`) e para filtros (ex: objeto `currentFilters`).
- **Renderização Dinâmica**:
  - Modificar a construção do `<thead>` na tabela para incluir, além do texto, ícones clicáveis de ordenação e `<input>`s para filtragem de texto.
  - Interceptar eventos de "keyup" nos filtros e "click" nas colunas para engatilhar um re-processamento dos dados (`renderAtendimentos(currentData)`).
  - A função `renderAtendimentos` passará `currentData` por um pipeline de filtragem (verificando se o campo contém o texto do filtro) e ordenação (comparando alfabética/numericamente e por data) antes de criar as linhas da tabela.

### 4. Documentação
#### [MODIFY] `README.md` e `walkthrough.md`
- O `README.md` receberá menções sobre a ordenação e filtros da tabela.
- O `walkthrough.md` documentará as implementações focadas em tela cheia e o novo campo.

## Verificação

1. **Migração Segura**: O container subirá sem erros de SQL e os dados antigos permanecerão no SQLite.
2. **Largura Total**: Ao clicar em "Lista", a área ocupará as bordas completas da tela.
3. **Ordenação e Filtro**: O usuário poderá buscar "João" na coluna de Analista ou ordenar datas de abertura crescente/decrescente.

## User Review Required
> [!IMPORTANT]
> - A migração do SQLite utilizará uma instrução "ALTER TABLE" silenciosa. Não resetaremos o seu banco de dados atual, e você não perderá registros que porventura já tenha inserido.
> - O container do Nginx lidará automaticamente com o HTML atualizado, mas talvez o Uvicorn (`shub_app`) precise ser reiniciado. Eu rodarei `docker-compose restart shub_app` silenciosamente após o build. Tudo certo com esta abordagem?
