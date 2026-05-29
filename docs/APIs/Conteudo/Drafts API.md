# Drafts API (`/api/drafts`)

Responsável pela gestão de rascunhos criados no Editor TipTap. Trabalha exclusivamente com o **MongoDB Atlas** para permitir documentos JSON profundos sem as restrições de esquemas relacionais.

## Segurança
- 🔒 **Protegida:** Sim (JWT obrigatório). O `author_id` é cravado na query do banco usando o ID do token, tornando impossível listar, editar ou deletar rascunhos de terceiros.

---

## 1. Listar Meus Rascunhos
- **Método:** `GET`
- **Endpoint:** `/api/drafts`

### Comportamento
Retorna os últimos 50 rascunhos com status `draft`, projetando (retornando) apenas metadados leves (`title`, `visibility`, datas) para montar a tabela de rascunhos sem carregar os conteúdos pesados do TipTap.

---

## 2. Criar Novo Rascunho
- **Método:** `POST`
- **Endpoint:** `/api/drafts`

### Body (JSON)
```json
{
  "title": "Título Opcional",
  "content": "<p>JSON/HTML do Editor</p>",
  "visibility": "public"
}
```
*Requer que pelo menos o título ou conteúdo seja preenchido.*

---

## 3. Atualizar Rascunho (Auto-Save)
- **Método:** `PUT`
- **Endpoint:** `/api/drafts`

### Body (JSON)
```json
{
  "id": "mongo_object_id",
  "title": "...",
  "content": "...",
  "visibility": "..."
}
```
Atualiza o documento no MongoDB usando `$set`. Retorna `404` se o ID não for do usuário logado.

---

## 4. Deletar Rascunho
- **Método:** `DELETE`
- **Endpoint:** `/api/drafts?id={mongo_object_id}`

Deleta permanentemente o rascunho da coleção MongoDB.

---
*Voltar para: [[00_API_Index]]*