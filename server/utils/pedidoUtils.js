export const MAX_CENTAVOS = 9999999999;

export function validarDinheiro(valor) {
    return Number.isFinite(valor) && valor >= 0 && valor <= MAX_CENTAVOS / 100
        && Math.round(valor * 100) / 100 === valor;
}

export function centavos(valor) {
    return Math.round(valor * 100);
}

export function validarId(id) {
    return Number.isSafeInteger(id) && id > 0;
}

export function lerInteiro(valor, nome, maximo = Number.MAX_SAFE_INTEGER) {
    if (typeof valor !== 'string' || !/^\d+$/.test(valor) || !validarId(Number(valor)) || Number(valor) > maximo) {
        throw { status: 400, msg: `Informe ${nome} válido.` };
    }
    return Number(valor);
}
