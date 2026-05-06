# Plano de Desenvolvimento - CAIXA MESTRE

## Módulo de Compras (Futuro)

### Funcionamento Geral

**Fluxo do processo de compras:**

1. **Tela de Pedidos (Almoxarifado)**
   - Usuário almoxarifado visualiza estoque baixo
   - Cria lista de itens que precisam ser comprados
   - Adiciona quantidade necessária e observações
   - Confirma o pedido (status: "Aguardando Compra")

2. **Tela de Compras (Comprador)**
   - Usuário comprador visualiza todos os pedidos pendentes
   - Vê lista consolidada de itens para comprar
   - Pode marcar itens como "Comprado" com:
     - Valor pago
     - Data da compra
     - Fornecedor
     - Nota fiscal (opcional)
   - Ao confirmar, pedido vai para "Histórico de Compras"

3. **Histórico**
   - Pedidos concluídos ficam arquivados
   - Filtros por data, fornecedor, valor
   - Exportação para PDF/Excel

### Benefícios do Banco Online (Firebase)

**Como facilita este fluxo:**
- Almoxarifado cria pedido no celular A → Comprador vê instantaneamente no celular B
- Não precisa de comunicação manual (WhatsApp, papel, etc.)
- Histórico centralizado e acessível por todos
- Funciona em qualquer lugar com internet

**Estrutura de Dados Prevista:**

```
Pedidos de Compra:
- ID do pedido
- Data de criação
- Usuário que solicitou (almoxarifado)
- Status (pendente/comprado/cancelado)
- Itens do pedido:
  - Produto (referência)
  - Quantidade solicitada
  - Quantidade comprada
  - Valor unitário
  - Fornecedor
- Data da compra
- Usuário comprador
- Observações
```

### Gestão de Limite do Firebase

**Estratégia de Arquivamento:**

**Opção 1 - Auto-arquivamento por tempo:**
- Pedidos com mais de 2 anos são automaticamente exportados para PDF
- PDF salvo no dispositivo do administrador
- Dados removidos do banco online
- Libera espaço permanentemente

**Opção 2 - Limite por quantidade:**
- Manter apenas últimos 1000 pedidos no banco
- Pedidos antigos exportados e removidos
- Suficiente para ~2 anos de histórico ativo

**Cálculo de espaço:**
- Cada pedido: ~3-5 KB
- 1000 pedidos: ~3-5 MB
- 5 anos de histórico ativo: ~15-25 MB
- Total ainda bem abaixo do limite gratuito de 1 GB

### Próximos Passos

1. **Implementar módulo de compras primeiro com banco local** (IndexedDB)
   - Testar o fluxo de trabalho
   - Ajustar a usabilidade
   - Validar se atende às necessidades

2. **Depois migrar para Firebase** (banco online)
   - Adicionar autenticação de usuários
   - Sincronizar dados entre dispositivos
   - Manter funcionamento offline quando sem internet

3. **Implementar sistema de arquivamento**
   - Exportação automática de pedidos antigos
   - Geração de relatórios em PDF
   - Limpeza automática do banco

### Dúvidas a Resolver

- Quantos anos de histórico precisam ficar acessíveis online?
- Precisa de aprovação antes da compra ou o comprador decide sozinho?
- Vários compradores diferentes ou apenas um?
- Precisa controlar orçamento/limites de gasto?
- Fornecedores precisam ser cadastrados ou apenas nome livre?

---

## Anotações de Reuniões/Ideias

*Espaço para adicionar novas ideias e decisões*

---

## Ideia Detalhada: Tela do Comprador

*Data: 29/04/2026 - Análise do prompt fornecido*

### Conceito Principal
Tela extremamente simples e rápida para o comprador confirmar pedidos sem burocracia. Foco em produtividade - o comprador está ocupado e precisa resolver rapidamente.

### Fluxo de Interação

**1. Lista de Pedidos Pendentes**
- Visualização em lista simples
- Cada item mostra: Nome do produto + Quantidade solicitada
- Interface limpa, sem informações desnecessárias

**2. Ação Individual (Clique no Item)**
- Abre modal minimalista
- Campo opcional: "Quantidade comprada" (pode deixar em branco)
- Botões: Confirmar / Cancelar

**3. Lógica Inteligente de Confirmação**
- **Se não digitar nada**: Assume quantidade total = status "Concluído"
- **Se digitar menos**: Status = "Parcial" (faltou comprar algo)
- **Se digitar igual ou mais**: Status = "Concluído"

**4. Feedback Imediato**
- Mensagem: "✔ Pedido confirmado"
- Botão "Desfazer" visível por 3 segundos
- Se não clicar em desfazer → item some da lista e vai para histórico

**5. Botão "Confirmar Todos"**
- No topo da tela, botão grande
- Confirmação rápida: "Deseja confirmar todos?"
- Se confirmar: todos os itens da lista viram "Concluído"
- Também tem opção de "Desfazer" por 3 segundos

### Estado Vazio
Quando não há pedidos: mensagem simples "Você não tem pedidos novos"

### Dados Salvos no Histórico

Cada confirmação registra:
- Nome do produto
- Quantidade solicitada vs confirmada
- Tipo de confirmação: automática (sem digitar) ou manual (com digitação)
- Status: Concluído ou Parcial
- Data/hora
- Usuário que confirmou
- Origem: ação individual ou "confirmar todos"

### Pontos Fortes Desta Ideia

1. **Simplicidade Extrema**: O comprador não precisa preencher formulários
2. **Rapidez**: Um clique confirma, sem burocracia
3. **Segurança**: Opção de desfazer evita erros
4. **Flexibilidade**: Pode confirmar individual ou em massa
5. **Inteligente**: Sistema assume o óbvio (comprou tudo) se usuário não especificar

### Diferença do Fluxo Anterior

| Aspecto | Ideia Anterior | Nova Ideia (Prompt) |
|---------|---------------|---------------------|
| Campos | Valor, fornecedor, nota fiscal | Apenas quantidade (opcional) |
| Foco | Controle financeiro completo | Agilidade e simplicidade |
| Preenchimento | Vários campos obrigatórios | Um campo opcional |
| Objetivo | Documentar compra | Confirmar recebimento |

### Decisão a Tomar

**Qual fluxo adotar?**

**Opção A (Prompt - Simples)**: Para compras rápidas, mercado, materiais de uso imediato. O comprador só confirma que comprou.

**Opção B (Anterior - Completo)**: Para compras com nota fiscal, controle de fornecedores, necessidade de comprovação.

**Opção C (Híbrido)**: Tela simples por padrão, com botão "Adicionar detalhes" para quando precisar de mais informações (valor, fornecedor, etc.).

### Questões para Definir

1. O comprador precisa registrar o valor pago ou apenas confirmar que comprou?
2. Precisa saber qual fornecedor comprou ou isso é irrelevante?
3. Nota fiscal é importante para controle ou não?
4. A prioridade é velocidade ou controle completo?

---

## 🎯 Decisão Estratégica - Versões do Sistema

**Data da decisão: 29/04/2026**

### Versão 1.0 (Simples) - IMPLEMENTAR AGORA
**Foco:** Agilidade e simplicidade para o dia a dia

**Funcionalidades:**
- Tela do comprador conforme prompt (minimalista)
- Apenas confirmação de compra (sim/não)
- Quantidade opcional (automático = comprou tudo)
- Sem controle de fornecedor
- Sem registro de nota fiscal
- Sem controle de valores
- Botão "Confirmar Todos" para agilidade
- Histórico básico (produto, quantidade, data, usuário)

**Público-alvo:** Operação interna rápida, compras do dia a dia

---

### Versão 2.0 (Comercial) - FUTURO
**Foco:** Controle completo e compliance

**Funcionalidades adicionais:**
- Cadastro de fornecedores
- Registro de notas fiscais
- Controle de valores/unitários
- Relatórios financeiros
- Aprovação de orçamentos
- Controle de pagamentos
- Exportação contábil

**Público-alvo:** Controle patrimonial, auditorias, compras estratégicas

---

### Vantagem desta estratégia
- **Versão 1.0**: Rápida de implementar, resolve o problema imediato
- **Versão 2.0**: Evolução natural quando o negócio crescer
- **Base comum**: Mesma estrutura de dados, apenas campos adicionais na v2.0
- **Sem perda**: Histórico da v1.0 mantido na v2.0

---

## Estado Atual do App (29/04/2026)

**Tela Pedidos - JÁ EXISTE:**
- ✅ Permite selecionar itens cadastrados no estoque
- ✅ Função de salvar pedido
- ✅ Gera PDF do pedido
- ✅ Opção de excluir pedido
- ✅ Compartilhar via WhatsApp
- ❌ **Só permite itens do estoque** (não permite itens avulsos)
- ❌ **Ao salvar, vai para histórico de pedidos** (não vai para compras)

**Fluxo Atual:**
Pedidos → Seleciona item do estoque → Salva → Histórico de Pedidos (PDF/Excluir/WhatsApp)

---

## Próximos Passos - Versão 1.0 (Simples)

### Fase 1: Modificar Tela Pedidos + Gerenciamento de Usuários
- [x] Decidido: Implementar versão simples primeiro (conforme prompt)

**Gerenciamento de Usuários:**
- [ ] **Adicionar tipo de usuário "Comprador"**
- [ ] **Criar sistema de permissões por perfil:**
  - Administrador: acesso total (todas as telas)
  - Almoxarifado: Pedidos, Entregas, Estoque, Relatórios
  - Comprador: Tela Compras + Histórico de Compras (somente leitura do estoque)
- [ ] **Configurar visibilidade de menus** conforme permissão do usuário logado
- [ ] **Tela de cadastro/edição de usuários** com seleção de permissões

**Tela Pedidos:**
- [ ] **Adicionar modal para itens avulsos** (produtos não cadastrados no estoque)
- [ ] **Adicionar campos de detalhes do pedido:**
  - Quantidade necessária
  - Observações (opcional)
  - Urgência (opcional: normal/urgente)
- [ ] **Modificar comportamento ao salvar:**
  - Ao invés de ir para "Histórico de Pedidos"
  - Ir para "Fila de Compras" (tela do comprador)
  - Status: "Aguardando Compra"

### Fase 2: Criar Tela Compras (Comprador)
- [ ] Listar pedidos pendentes (da fila de compras)
- [ ] Implementar modal de confirmação (conforme prompt)
  - Campo opcional: quantidade comprada
  - Botões: Confirmar / Cancelar
  - Lógica: vazio = comprou tudo
- [ ] Botão "Confirmar Todos" no topo
- [ ] Mensagem "✔ Pedido confirmado" + botão Desfazer (3s)
- [ ] Estado vazio: "Você não tem pedidos novos"

### Fase 3: Histórico de Compras
- [ ] Tela de histórico (separada do histórico de pedidos atual)
- [ ] Filtros: data, status (concluído/parcial), usuário
- [ ] Exportar para PDF
- [ ] Visualizar detalhes da compra

### Decisão de Fluxo - Estoque (Cenário B)

**Data: 29/04/2026**

**Regra definida:** A tela de Compras **NÃO altera o estoque automaticamente**

**Fluxo completo:**
```
1. Almoxarifado cria pedido na tela Pedidos
   ↓
2. Pedido vai para Fila de Compras (status: Aguardando)
   ↓
3. Comprador vê na tela Compras e confirma
   (apenas registra: "comprei X quantidade")
   ↓
4. Almoxarifado recebe mercadoria fisicamente
   ↓
5. Almoxarifado confere: quantidade, qualidade, nota fiscal
   ↓
6. Almoxarifado dá ENTRADA no estoque pela tela existente "Entrega"
   (ou nova tela específica de "Entrada de Compras")
   ↓
7. Estoque só aumenta no passo 6 (com conferência física)
```

**Vantagens do Cenário B:**
- ✅ Conferência física antes de atualizar sistema
- ✅ Permite divergências (comprou 100, veio 95 → almoxarifado lança 95)
- ✅ Segurança contra erros de digitação
- ✅ Responsabilidade clara: comprador compra, almoxarifado recebe

**Status do pedido:**
- "Aguardando" → "Comprado" (quando comprador confirma)
- "Comprado" → "Recebido" (quando almoxarifado dá entrada)

---

### Fase 4: Testes e Ajustes
- [x] Definido: Comprador NÃO altera estoque (apenas registra compra)
- [ ] Definir se comprador pode recusar/rejeitar um pedido
- [ ] Validar tempo do "Desfazer" (3s é suficiente?)
- [ ] Testar fluxo completo com banco local (IndexedDB)
- [ ] Testar no mobile (usabilidade)

