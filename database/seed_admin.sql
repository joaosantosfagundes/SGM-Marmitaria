-- ============================================================
-- SEED MANUAL DO USUÁRIO ADMIN (sem precisar rodar Node)
-- Rode isso no MySQL Workbench / phpMyAdmin / linha de comando,
-- DEPOIS de já ter rodado o schema-restaurante-escopo-atual.sql
-- ============================================================

USE sistema_restaurante;

-- Login: admin@sgm.com
-- Senha: admin123
-- (a coluna `senha` guarda o hash bcrypt, NUNCA a senha em texto puro)

INSERT INTO usuario (nome, email, senha, perfil, ativo)
VALUES (
    'Administrador',
    'admin@sgm.com',
    '$2b$10$Yo6FINUvkjUAM3dVdgCzw.TmVeikBcLCNCLYanrm75lFlB.Hievn6',
    'ADMIN',
    TRUE
);

-- Confere se entrou certinho:
SELECT id_usuario, nome, email, perfil, ativo FROM usuario;

-- ⚠️ Troque essa senha assim que der acesso ao sistema.
-- Pra trocar via SQL depois (sem tela ainda), gere outro hash bcrypt
-- (não dá pra simplesmente digitar a senha nova aqui, TEM que ser hash)
-- e rode:
-- UPDATE usuario SET senha = '<novo_hash_bcrypt>' WHERE email = 'admin@sgm.com';
