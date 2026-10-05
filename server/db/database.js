import mysql from 'mysql2';

const pool = mysql.createPool({
    host:                  process.env.DB_HOST || 'localhost',
    database:              process.env.DB_NAME,
    user:                  process.env.DB_USER,
    password:              process.env.DB_PASSWORD,
    waitForConnections:    true,
    connectionLimit:       10,
    queueLimit:            0,
    dateStrings:           true,
    enableKeepAlive:       true,
    keepAliveInitialDelay: 30000
});

pool.on('error', (err) => {
    if (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.warn('Conexão MySQL resetada — pool vai reconectar automaticamente');
    } else {
        console.error('Erro inesperado no pool MySQL:', err.message);
    }
});

export default class Database {

    get conexao() { return pool; }

    AbreTransacao() {
        return new Promise((res, rej) => {
            pool.query("START TRANSACTION", (error, results) => {
                if (error) rej(error); else res(results);
            });
        });
    }

    Rollback() {
        return new Promise((res, rej) => {
            pool.query("ROLLBACK", (error, results) => {
                if (error) rej(error); else res(results);
            });
        });
    }

    Commit() {
        return new Promise((res, rej) => {
            pool.query("COMMIT", (error, results) => {
                if (error) rej(error); else res(results);
            });
        });
    }

    ExecutaComando(sql, valores) {
        return new Promise((res, rej) => {
            pool.query(sql, valores, (error, results) => {
                if (error) rej(error); else res(results);
            });
        });
    }

    ExecutaComandoNonQuery(sql, valores) {
        return new Promise((res, rej) => {
            pool.query(sql, valores, (error, results) => {
                if (error) rej(error); else res(results.affectedRows > 0);
            });
        });
    }

    ExecutaComandoLastInserted(sql, valores) {
        return new Promise((res, rej) => {
            pool.query(sql, valores, (error, results) => {
                if (error) rej(error); else res(results.insertId);
            });
        });
    }

    async ExecutaTransacao(callback) {
        let conexao = await new Promise((res, rej) => {
            pool.getConnection((error, connection) => error ? rej(error) : res(connection));
        });

        try {
            await new Promise((res, rej) => conexao.beginTransaction(error => error ? rej(error) : res()));
            let consultar = (sql, valores = []) => new Promise((res, rej) => {
                conexao.query(sql, valores, (error, results) => error ? rej(error) : res(results));
            });
            let resultado = await callback(consultar);
            await new Promise((res, rej) => conexao.commit(error => error ? rej(error) : res()));
            return resultado;
        } catch (error) {
            await new Promise(res => conexao.rollback(() => res()));
            throw error;
        } finally {
            conexao.release();
        }
    }
}
