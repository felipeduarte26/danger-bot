/**
 * 🌐 PORTUGUESE DOCUMENTATION CHECKER PLUGIN
 * ==========================================
 * Detecta documentação em português quando o padrão é inglês
 *
 * FUNCIONALIDADES:
 * ✅ Analisa apenas comentários de documentação (///)
 * ✅ Usa cld3 (Compact Language Detector v3) - mesmo do Google Chrome
 * ✅ Detecção precisa de idioma
 * ✅ Ignora templates Dart ({@template}, {@macro}, etc)
 * ✅ Comenta inline no PR
 */
declare const _default: import("../../../types").DangerPlugin;
export default _default;
