# Troubleshooting de Acesso Git — Organizações Privadas no GitHub

## Contexto

Organização privada no GitHub com repositórios privados. O usuário é membro da org mas não consegue clonar repositórios via SSH nem HTTPS.

---

## Problema 1: Autenticação SSH Funciona mas o Clone Falha

### Sintomas

```
ssh -T git@github.com
→ Hi <usuario>! You've successfully authenticated, but GitHub does not provide shell access.

git clone git@github.com:<org>/<repo>.git
→ ERROR: Repository not found.
→ fatal: Could not read from remote repository.
```

### Diagnóstico

A autenticação SSH funciona corretamente (a chave está registrada no GitHub e o usuário correto é identificado), mas o clone falha com "Repository not found" em **todos** os repos da org — não só em um.

Confirmado com:

```bash
git ls-remote git@github.com:<org>/<repo>.git
→ ERROR: Repository not found.
```

### Causa Raiz

Ser **membro de uma organização no GitHub não garante acesso automático a todos os repositórios privados**. O acesso a repositórios deve ser concedido separadamente, de uma dessas formas:

- Adicionando o usuário diretamente como **colaborador** no repositório específico
- Adicionando o usuário a um **team** que tenha acesso ao repositório

Além disso, algumas organizações ativam **restrições de chave SSH** no nível da org, que exigem que as chaves SSH sejam explicitamente autorizadas para a organização via SSO (SAML). Quando isso ocorre, o botão "Configure SSO" aparece ao lado de cada chave em **Settings → SSH and GPG keys**.

> **Observação:** É possível visualizar um repositório privado no navegador e ainda assim não conseguir cloná-lo via SSH. Acesso pelo browser e acesso via Git usam camadas de permissão diferentes.

### Checklist para o Admin

1. Acesse `github.com/<org>/<repo>` → **Settings → Collaborators and teams**
2. Confirme que o usuário aparece com permissão explícita (Read, Write ou Admin)
3. Verifique `github.com/organizations/<org>/settings/security` para restrições de chave SSH

---

## Problema 2: Clone HTTPS Falha por Credential Helper Quebrado

### Sintomas

```
git clone https://github.com/<org>/<repo>.git

<caminho-do-helper-customizado>.exe get: No such file or directory

Username for 'https://github.com': <usuario>
Password for 'https://<usuario>@github.com':
remote: Invalid username or token. Password authentication is not supported for Git operations.
fatal: Authentication failed
```

### Causa Raiz

Dois problemas ocorrendo simultaneamente:

1. **Credential helper quebrado**: O Git estava configurado para usar um helper customizado que não existe mais no caminho configurado
2. **Autenticação por senha não é suportada**: O GitHub não aceita mais senhas para operações Git. É necessário usar um **Personal Access Token (PAT)**

### Correção — Resetar o Credential Helper

```powershell
# Verificar quais helpers estão configurados
git config --global --get-all credential.helper

# Remover todos os helpers customizados
git config --global --unset-all credential.helper

# Configurar o Windows Credential Manager como helper padrão
git config --global credential.helper manager
```

---

## Solução: Clonar via HTTPS com Personal Access Token (PAT)

### O que é um PAT?

Um Personal Access Token é uma string gerada pelo GitHub que funciona como senha para operações Git via HTTPS. O GitHub não aceita mais senhas de conta para esse fim.

### Passo 1 — Gerar um PAT

1. Acesse **github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Clique em **Generate new token (classic)**
3. Dê um nome descritivo
4. Configure a expiração conforme necessário
5. Marque o escopo **`repo`**
6. Clique em **Generate token**
7. **Copie o token** — ele só é exibido uma vez

### Passo 2 — Clonar o Repositório

```bash
git clone https://github.com/<org>/<repo>.git
```

Quando solicitado:
- **Username**: seu usuário do GitHub
- **Password**: cole o PAT (ex: `ghp_xxxxxxxxxxxx`)

### Passo 3 — Token é Salvo Automaticamente

O Windows Credential Manager salva o token após o primeiro uso. Operações subsequentes de `git pull`, `git push` e clone funcionarão sem precisar digitar novamente — até o token expirar.

---

## Tabela Resumo

| Método | Resultado | Motivo |
|--------|-----------|--------|
| Clone SSH | ❌ Repository not found | Restrição SSH na org ou permissão ausente no repo |
| HTTPS com senha | ❌ Auth failed | GitHub não aceita mais senhas |
| HTTPS com helper quebrado | ❌ Helper not found | Caminho do helper customizado inválido |
| HTTPS com PAT | ✅ Sucesso | Método de autenticação correto |

---

## Notas para Referência Futura

- O PAT expira após o período configurado. Gere um novo quando expirar e cole quando o Windows solicitar novamente
- Se o SSH precisar funcionar no futuro, o admin da org deve verificar se a autorização de chave SSH para SSO é necessária nas configurações de segurança da org
- Se estiver desenvolvendo um credential helper customizado, armazene o PAT no keyring do sistema e garanta que o caminho do binário permaneça válido após rebuilds e relocações