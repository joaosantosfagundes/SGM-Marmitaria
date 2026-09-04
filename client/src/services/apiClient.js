import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/';

export default class ApiClient {

    // options: { silent?: boolean } — silent=true não mostra toast de erro
    // (usado só na checagem automática de "já tô logado?" ao abrir a página,
    // onde um 401 é esperado/normal e não deve assustar o usuário)

    static async get(endpoint, options = {}) {
        let response = await fetch(`${BASE_URL}${endpoint}`, {
            method: "GET",
            credentials: "include"
        });
        return await this.checarResposta(response, options);
    }

    static async post(endpoint, body, options = {}) {
        let response = await fetch(`${BASE_URL}${endpoint}`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        return await this.checarResposta(response, options);
    }

    static async put(endpoint, body, options = {}) {
        let response = await fetch(`${BASE_URL}${endpoint}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        return await this.checarResposta(response, options);
    }

    static async delete(endpoint, options = {}) {
        let response = await fetch(`${BASE_URL}${endpoint}`, {
            method: "DELETE",
            credentials: "include"
        });
        return await this.checarResposta(response, options);
    }

    static async checarResposta(response, options = {}) {
        if (response.ok) {
            return await response.json();
        }

        let json = await response.json().catch(() => ({ msg: "Erro inesperado" }));

        if (!options.silent) {
            toast.error(json.msg || "Erro inesperado");
        }

        throw { status: response.status, ...json };
    }
}
