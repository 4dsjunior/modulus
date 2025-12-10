Modulus Platform - Boilerplate SaaS

Este é um projeto boilerplate construído com Next.js e Supabase para servir como base para aplicações SaaS (Software as a Service) multitenant e modulares.

Visão Geral

A plataforma Modulus foi projetada para resolver dois desafios comuns no desenvolvimento de SaaS:

Multi-Tenancy: Isolar os dados de diferentes clientes (tenants) de forma segura e escalável.

Modularidade: Permitir que diferentes tenants tenham acesso a diferentes conjuntos de funcionalidades (módulos).

Este boilerplate fornece a estrutura fundamental para um painel de Super Admin (para gerenciamento de usuários e tenants) e uma arquitetura de rotas dinâmica que renderiza os módulos corretos para o tenant e usuário autenticado.

Core Concepts

Tenant: Representa um cliente da sua plataforma (uma empresa, uma organização, etc.). Cada tenant possui seu próprio conjunto de usuários e dados, isolados dos demais.

Módulo: Um conjunto de funcionalidades específicas (ex: "financeiro", "gestão de alunos", "relatórios"). Um tenant pode ter um ou mais módulos habilitados.

Super Admin: Um usuário com privilégios elevados que pode gerenciar todos os tenants, usuários e configurações da plataforma.

Membro do Tenant: Um usuário que pertence a um tenant específico e só pode acessar os dados e módulos daquele tenant.

Estrutura do Projeto

A arquitetura de pastas foi pensada para manter a organização e escalabilidade:

/app
├── admin/                # Rotas e lógica do painel Super Admin
│   ├── create/
│   └── users/
├── [module]/             # Rota dinâmica para os módulos dos tenants
│   └── [tenant]/
│       └── dashboard/
├── login/                # Página e lógica de autenticação
└── utils/
    └── supabase/         # Clientes Supabase para client, server e admin


/app/admin: Contém todas as páginas acessíveis apenas pelo Super Admin.

/app/[module]/[tenant]: O coração da aplicação do cliente. O Next.js roteia dinamicamente com base no módulo e no slug do tenant (ex: /financeiro/minha-empresa/dashboard).

Guia de Instalação (Getting Started)

1. Pré-requisitos

Node.js (versão 20 ou superior)

npm, yarn ou pnpm

Uma conta no Supabase

2. Clonar o Repositório

git clone [https://github.com/seu-usuario/modulus.git](https://github.com/seu-usuario/modulus.git)
cd modulus


3. Instalar Dependências

npm install


4. Configurar Variáveis de Ambiente

Crie uma cópia do arquivo .env.example e renomeie para .env.local.

cp .env.example .env.local


Preencha as variáveis no arquivo .env.local com as chaves do seu projeto Supabase:

NEXT_PUBLIC_SUPABASE_URL=SUA_URL_DO_PROJETO
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANONIMA
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_DE_SERVIÇO


Importante: A SERVICE_ROLE_KEY deve ser mantida em segredo absoluto e nunca exposta no lado do cliente.

5. Configurar o Banco de Dados (Supabase)

Execute os scripts SQL necessários para criar as tabelas tenants, tenant_members, profiles, e tenant_modules. Você pode encontrar os scripts na pasta /supabase/migrations.

6. Rodar o Servidor de Desenvolvimento

npm run dev


Abra http://localhost:3000 no seu navegador para ver a aplicação.

Guia para Integração de Novos Módulos

Integrar um novo módulo (ex: "gestão de estoque") é um processo simples. Siga os passos abaixo.

Passo 1: Criar a Estrutura de Pastas

Crie uma nova pasta dentro de /app/[module]/. O nome da pasta deve corresponder ao module_id que você usará no banco de dados.

Exemplo para um módulo inventory:

/app
└── [module]/
    └── inventory/
        ├── [tenant]/
        │   ├── page.tsx          # Página principal do módulo de inventário
        │   └── products/
        │       └── page.tsx      # Página de produtos do inventário
        └── layout.tsx            # Layout específico para o módulo de inventário (opcional)


Passo 2: Desenvolver as Páginas do Módulo

Dentro da pasta do seu novo módulo, crie as páginas e componentes React normalmente, usando o padrão do Next.js App Router.

Você pode usar params para obter o slug do tenant e o id do módulo.

Use o cliente Supabase para buscar e manipular dados, sempre filtrando pelo tenant_id para garantir o isolamento dos dados.

Passo 3: Registrar o Módulo no Banco de Dados

Para que o sistema reconheça o novo módulo, adicione-o à sua tabela modules (ou similar) no Supabase. O id ou slug que você registrar aqui deve ser o mesmo nome da pasta criada no Passo 1.

Passo 4: Habilitar o Módulo para um Tenant

No seu painel de Super Admin (ou diretamente no banco), associe o novo módulo a um tenant na tabela tenant_modules.

Uma vez associado, um usuário daquele tenant poderá acessar as novas rotas, como por exemplo: http://localhost:3000/inventory/nome-do-tenant/. O sistema de roteamento dinâmico do Next.js e a lógica de autenticação cuidarão do resto.