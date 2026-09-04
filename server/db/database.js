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
}
