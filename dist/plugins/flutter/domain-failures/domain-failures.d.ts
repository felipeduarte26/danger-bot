/**
 * 🔥 Domain Failures Plugin
 *
 * Verifica regras para failures na camada Domain:
 * - Primeira classe: sealed class NomeFailure
 * - Demais classes: final class extends NomeFailure
 * - Nomenclatura: *_failure.dart
 * - Sufixo: Failure
 */
declare const _default: import("../../../types").DangerPlugin;
export default _default;
