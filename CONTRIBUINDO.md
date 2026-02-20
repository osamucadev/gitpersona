# Contribuindo com o Git Persona

Obrigado por considerar contribuir! Este documento cobre como configurar o ambiente,
nossas convenções e o processo de envio de alterações.

> **English:** Veja o arquivo [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Código de Conduta

Seja gentil, respeitoso e construtivo. Este é um projeto acolhedor para desenvolvedores de todos os níveis de experiência.

---

## Primeiros Passos

1. **Faça um Fork** do repositório no GitHub
2. **Clone** o seu fork: `git clone https://github.com/SEU-USUARIO/gitpersona.git`
3. Siga o [Guia Como Executar](docs/COMO_EXECUTAR.md) para configurar o ambiente
4. Crie uma **branch de feature**: `git checkout -b feat/minha-feature`
5. Faça suas alterações
6. Execute `npm run lint` e `npm run test`
7. Faça commit e push para o seu fork
8. Abra um **Pull Request** contra a branch `main`

---

## Fluxo de Desenvolvimento

### Frontend (React/TypeScript)
- O código-fonte está em `apps/desktop/src-ui/`
- Execute `npm run dev` dentro de `apps/desktop` para trabalhar na UI isoladamente
- Hot reload disponível para todas as mudanças de UI

### Backend (Rust/Tauri)
- O código-fonte está em `apps/desktop/src-tauri/src/` e `crates/`
- Mudanças no Rust requerem recompilação (automática no `tauri:dev`)
- Os comandos estão em `src/commands/`

### Credential Helper
- O código-fonte está em `crates/credential-helper/`
- É um binário separado compilado independentemente
- Mudanças requerem: `cargo build -p gitpersona-credential-helper`

---

## Estilo de Código

### TypeScript / React
- **Formatador:** Prettier (`npm run format`)
- **Linter:** ESLint (`npm run lint`)
- Use exportações nomeadas para componentes
- Use Zustand para estado global

### Rust
- Siga as convenções padrão do Rust (`rustfmt`)
- Use `anyhow::Result` para funções que podem falhar
- Documente funções públicas com `///`
- Evite `unwrap()` em código de produção, use `?` ou tratamento explícito
- Use macros `tracing::*` para logs, nunca `println!`

---

## Adicionando um Novo Comando Tauri

1. Adicione o handler em `src/commands/` no arquivo apropriado
2. Registre em `src/lib.rs` dentro de `generate_handler![]`
3. Adicione o wrapper TypeScript em `src-ui/lib/tauri.ts`
4. Adicione os tipos TypeScript em `src-ui/types/index.ts` se necessário

---

## Testes

- **Lógica de UI:** `npm run test` (Vitest)
- **Rust:** `cargo test --workspace`

---

## Convenção de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

```
feat: adicionar memória de navegador entre sessões
fix: credential helper não encontrado na primeira ativação
docs: atualizar guia COMO_EXECUTAR
```

---

## Checklist para Pull Request

- [ ] Código formatado (`npm run format`)
- [ ] Lint passa (`npm run lint`)
- [ ] Testes passam (`npm run test`)
- [ ] Novas funcionalidades descritas no PR
- [ ] Nenhum token, segredo ou chave de API commitado

---

## Reportando Bugs

Abra uma Issue no GitHub com:
1. Título claro
2. Passos para reproduzir
3. Comportamento esperado vs. real
4. Cópia de diagnósticos (Configurações → Diagnósticos → Copiar)
5. Versão do sistema operacional
