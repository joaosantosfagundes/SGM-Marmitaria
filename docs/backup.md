# Backup e recuperação do SGM

## Rotina e responsabilidades

A dona da marmitaria entra como ADMIN em **Administração → Backup** e usa **Baixar backup agora**.
Guarde o dump lógico `.sql` fora do Railway, por exemplo em um Drive privado ou pendrive protegido.
Faça uma cópia pelo menos uma vez por semana e gere outra antes de cada migration ou mudança de plano.
Mantenha as últimas **7 cópias diárias ou 4 semanais**, conforme a frequência adotada.

O arquivo contém dados de clientes, hashes de senha e tokens de redefinição. Guarde e compartilhe
apenas em local privado, com acesso restrito. O desenvolvedor é responsável por testar e restaurar as cópias.
O backup do botão exporta o esquema e os dados das tabelas do SGM em um snapshot do InnoDB. As tabelas
devem ter chave primária. Gere o backup antes de iniciar mudanças de esquema.

## Alternativa pelo terminal com mysqldump

No Railway, abra o serviço **MySQL → Settings → Networking → Public Access**. Use o host e
a porta do TCP Proxy, disponíveis também na variável `MYSQL_PUBLIC_URL`. Obtenha o usuário em
`MYSQLUSER`, a senha em `MYSQLPASSWORD` e o banco em `MYSQLDATABASE`, na aba **Variables** do
serviço MySQL. Use o endereço e a porta públicos nessa conexão externa. [Railway · MySQL](https://docs.railway.com/databases/mysql)

Com o cliente MySQL 8 no computador, abra o terminal em uma pasta privada e execute,
substituindo os argumentos em maiúsculas. A opção `--password` pede a senha no prompt.

```text
mysqldump --protocol=TCP --host=HOST_PUBLICO --port=PORTA_PUBLICA --user=USUARIO --password --ssl-mode=REQUIRED --default-character-set=utf8mb4 --single-transaction --quick --no-tablespaces --set-gtid-purged=OFF --hex-blob --result-file="backup-sgm-manual.sql" BANCO
```

Confira o código de saída e o tamanho do arquivo. `--single-transaction` mantém a leitura consistente
das tabelas InnoDB durante a operação. [MySQL · mysqldump](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html)

## Recuperação

### A. Dados perdidos com o MySQL ainda disponível

1. Pause as gravações do app. Preserve uma cópia do estado atual do banco, se ainda for possível.
2. Localize a última cópia válida anterior à perda. Restaure primeiro em um banco de teste separado
   e confira o resultado com o checklist abaixo.
3. Importe o arquivo no banco correto usando um dos métodos da seção Windows. O dump substitui as
   tabelas que contém. O arquivo do botão não seleciona um banco, então confira o destino antes de executar.
4. Aplique, em ordem, as migrations posteriores ao backup necessárias para a versão do app que será usada.
   Reative o app após confirmar login, pedidos, pagamentos e relatórios.

### B. Projeto Railway apagado

1. Crie um projeto no Railway e adicione um serviço MySQL 8 com volume. Anote as referências das
   variáveis no quadro abaixo e use o TCP Proxy para acessar o banco de fora do Railway.
2. Restaure o arquivo no banco novo. Confira tabelas e totais, e aplique somente as migrations que
   a cópia ainda não contém.
3. Recrie o serviço do app a partir do repositório GitHub. Reconfigure o backend e a publicação
   do frontend conforme seu ambiente. Use uma versão do app compatível com o esquema restaurado.
4. Reponha as **Variables**, publique os serviços e confira o domínio público, o login por HTTPS,
   a consulta de pedidos e o fluxo de redefinição de senha com uma conta de teste.

| Variáveis | Onde obter |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Referencie `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD` do serviço MySQL nas Variables do backend. |
| `PORT` | Variável de execução do serviço HTTP no Railway. |
| `NODE_ENV` | Configure no backend para o ambiente de produção. |
| `JWT_SECRET` | Gerenciador de senhas ou segredo novo gerado pelo desenvolvedor. Trocar o segredo encerra as sessões anteriores. |
| `FRONTEND_URL` | Origem HTTPS pública do frontend, usada no backend. |
| `VITE_API_URL` | Endereço HTTPS do backend com o caminho da API, configurado no build do frontend. |
| `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME` | Chave na conta Brevo, endereço verificado e nome de exibição opcional do remetente. |
| `SWAGGER_ATIVO` | Variável opcional do backend para habilitar a documentação no ambiente de teste. |

## Importar no Windows

**Prompt a partir do PowerShell.** O operador `<` é interpretado pelo `cmd`. Execute a partir da pasta
com o arquivo. O exemplo pressupõe que `mysql.exe` está no PATH.

```powershell
cmd /c 'mysql --protocol=TCP --host=HOST --port=PORTA --user=USUARIO --password --default-character-set=utf8mb4 BANCO < "backup-sgm.sql"'
```

**Cliente MySQL.** Abra o cliente com os mesmos parâmetros e o banco de destino. Digite `source`
com o caminho do arquivo, usando barras normais mesmo no Windows.

```text
mysql --protocol=TCP --host=HOST --port=PORTA --user=USUARIO --password --default-character-set=utf8mb4 BANCO
```

```sql
source C:/Backups/backup-sgm.sql
```

**MySQL Workbench.** Abra **Server → Data Import**, selecione **Import from Self-Contained File**,
escolha o arquivo e o esquema de destino, depois clique em **Start Import**. Confira o log da
importação. [MySQL Workbench · Importação de SQL](https://dev.mysql.com/doc/workbench/en/wb-admin-export-import-management.html)

## Checklist de restauração

- [ ] No diretório `server`, aponte o `.env` para um MySQL local de teste. Use uma conta autorizada
  a criar e remover um banco de teste. Confira host, porta e nome do banco antes de executar.
- [ ] Rode `npm run backup:testar`. O script lê a origem, restaura em um banco temporário e o remove
  ao terminar. Todas as contagens de tabelas e as somas de pedidos e pagamentos devem mostrar `ok`.
- [ ] Gere outro arquivo pela tela **Backup** como ADMIN. Para conferir pelo Swagger local,
  faça login e execute **Backup → GET /backup**. ATENDENTE e COZINHA devem receber 403.
- [ ] Importe o arquivo manualmente em um esquema descartável. Confira a quantidade de registros,
  as somas e algumas amostras, incluindo nomes com acentos, pedidos, pagamentos e caixas.
- [ ] Em uma instância de teste do app com o banco restaurado, confira o login e abra as telas
  de Pedidos, Pagamento, Estoque, Caixa e Relatórios.
