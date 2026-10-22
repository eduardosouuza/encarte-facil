import { randomBytes } from "node:crypto";
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
/**
 * Gera um identificador no formato `_key` observado no app original
 * (ex.: "B0n2ULZOeYjROsaXCQlse"): 20 caracteres alfanumericos.
 */
export function newId(length = 20) {
    const bytes = randomBytes(length);
    let out = "";
    for (let i = 0; i < length; i += 1) {
        out += ALPHABET[(bytes[i] ?? 0) % ALPHABET.length];
    }
    return out;
}
/** Identificador com prefixo legivel, usado em tabelas internas. */
export function newPrefixedId(prefix) {
    return `${prefix}_${newId(12).toLowerCase()}`;
}
