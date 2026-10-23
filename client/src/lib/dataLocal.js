export function dataLocal(date = new Date()) {
    let ano = date.getFullYear();
    let mes = String(date.getMonth() + 1).padStart(2, '0');
    let dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}
