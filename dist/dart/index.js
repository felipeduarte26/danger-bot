"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
        __createBinding(exports, m, p);
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.DartParseError =
  exports.DartIdentifier =
  exports.DartFile =
  exports.DartDirective =
  exports.DartTypedef =
  exports.DartEnumValue =
  exports.DartConstructor =
  exports.DartInitializer =
  exports.DartMethod =
  exports.DartFunction =
  exports.DartTopLevelVariable =
  exports.DartField =
  exports.DartUnknownMember =
  exports.DartTypeParameter =
  exports.DartClass =
  exports.DartBody =
  exports.DartStatement =
  exports.DartCatch =
  exports.DartTry =
  exports.DartReturn =
  exports.DartAwait =
  exports.DartClosure =
  exports.DartCall =
  exports.DartArgument =
  exports.DartExpression =
  exports.DartLocalVariable =
  exports.DartVariable =
  exports.DartParameter =
  exports.DartString =
  exports.DartDoc =
  exports.DartComment =
  exports.DartAnnotation =
  exports.DartNodeBase =
  exports.DartFunctionTypeParameter =
  exports.DartRecordField =
  exports.DartType =
  exports.TEST_DIRS =
  exports.GENERATED_DIRS =
  exports.GENERATED_SUFFIXES =
  exports.DartPackage =
  exports.DartPath =
  exports.DartText =
    void 0;
/**
 * Modelo Dart compartilhado pelos plugins: leia o arquivo com
 * `DartFile.read(caminho)` e trabalhe com as propriedades (classes, campos,
 * métodos, tipos, chamadas...), sem regex sobre o texto.
 *
 * Guia completo: docs/MODELO_DART.md
 */
__exportStar(require("./enums"), exports);
var text_1 = require("./text");
Object.defineProperty(exports, "DartText", {
  enumerable: true,
  get: function () {
    return text_1.DartText;
  },
});
var path_1 = require("./path");
Object.defineProperty(exports, "DartPath", {
  enumerable: true,
  get: function () {
    return path_1.DartPath;
  },
});
Object.defineProperty(exports, "DartPackage", {
  enumerable: true,
  get: function () {
    return path_1.DartPackage;
  },
});
Object.defineProperty(exports, "GENERATED_SUFFIXES", {
  enumerable: true,
  get: function () {
    return path_1.GENERATED_SUFFIXES;
  },
});
Object.defineProperty(exports, "GENERATED_DIRS", {
  enumerable: true,
  get: function () {
    return path_1.GENERATED_DIRS;
  },
});
Object.defineProperty(exports, "TEST_DIRS", {
  enumerable: true,
  get: function () {
    return path_1.TEST_DIRS;
  },
});
var type_1 = require("./type");
Object.defineProperty(exports, "DartType", {
  enumerable: true,
  get: function () {
    return type_1.DartType;
  },
});
Object.defineProperty(exports, "DartRecordField", {
  enumerable: true,
  get: function () {
    return type_1.DartRecordField;
  },
});
Object.defineProperty(exports, "DartFunctionTypeParameter", {
  enumerable: true,
  get: function () {
    return type_1.DartFunctionTypeParameter;
  },
});
var nodes_1 = require("./nodes");
Object.defineProperty(exports, "DartNodeBase", {
  enumerable: true,
  get: function () {
    return nodes_1.DartNodeBase;
  },
});
Object.defineProperty(exports, "DartAnnotation", {
  enumerable: true,
  get: function () {
    return nodes_1.DartAnnotation;
  },
});
Object.defineProperty(exports, "DartComment", {
  enumerable: true,
  get: function () {
    return nodes_1.DartComment;
  },
});
Object.defineProperty(exports, "DartDoc", {
  enumerable: true,
  get: function () {
    return nodes_1.DartDoc;
  },
});
Object.defineProperty(exports, "DartString", {
  enumerable: true,
  get: function () {
    return nodes_1.DartString;
  },
});
Object.defineProperty(exports, "DartParameter", {
  enumerable: true,
  get: function () {
    return nodes_1.DartParameter;
  },
});
Object.defineProperty(exports, "DartVariable", {
  enumerable: true,
  get: function () {
    return nodes_1.DartVariable;
  },
});
Object.defineProperty(exports, "DartLocalVariable", {
  enumerable: true,
  get: function () {
    return nodes_1.DartLocalVariable;
  },
});
Object.defineProperty(exports, "DartExpression", {
  enumerable: true,
  get: function () {
    return nodes_1.DartExpression;
  },
});
Object.defineProperty(exports, "DartArgument", {
  enumerable: true,
  get: function () {
    return nodes_1.DartArgument;
  },
});
Object.defineProperty(exports, "DartCall", {
  enumerable: true,
  get: function () {
    return nodes_1.DartCall;
  },
});
Object.defineProperty(exports, "DartClosure", {
  enumerable: true,
  get: function () {
    return nodes_1.DartClosure;
  },
});
Object.defineProperty(exports, "DartAwait", {
  enumerable: true,
  get: function () {
    return nodes_1.DartAwait;
  },
});
Object.defineProperty(exports, "DartReturn", {
  enumerable: true,
  get: function () {
    return nodes_1.DartReturn;
  },
});
Object.defineProperty(exports, "DartTry", {
  enumerable: true,
  get: function () {
    return nodes_1.DartTry;
  },
});
Object.defineProperty(exports, "DartCatch", {
  enumerable: true,
  get: function () {
    return nodes_1.DartCatch;
  },
});
Object.defineProperty(exports, "DartStatement", {
  enumerable: true,
  get: function () {
    return nodes_1.DartStatement;
  },
});
Object.defineProperty(exports, "DartBody", {
  enumerable: true,
  get: function () {
    return nodes_1.DartBody;
  },
});
var declarations_1 = require("./declarations");
Object.defineProperty(exports, "DartClass", {
  enumerable: true,
  get: function () {
    return declarations_1.DartClass;
  },
});
Object.defineProperty(exports, "DartTypeParameter", {
  enumerable: true,
  get: function () {
    return declarations_1.DartTypeParameter;
  },
});
Object.defineProperty(exports, "DartUnknownMember", {
  enumerable: true,
  get: function () {
    return declarations_1.DartUnknownMember;
  },
});
Object.defineProperty(exports, "DartField", {
  enumerable: true,
  get: function () {
    return declarations_1.DartField;
  },
});
Object.defineProperty(exports, "DartTopLevelVariable", {
  enumerable: true,
  get: function () {
    return declarations_1.DartTopLevelVariable;
  },
});
Object.defineProperty(exports, "DartFunction", {
  enumerable: true,
  get: function () {
    return declarations_1.DartFunction;
  },
});
Object.defineProperty(exports, "DartMethod", {
  enumerable: true,
  get: function () {
    return declarations_1.DartMethod;
  },
});
Object.defineProperty(exports, "DartInitializer", {
  enumerable: true,
  get: function () {
    return declarations_1.DartInitializer;
  },
});
Object.defineProperty(exports, "DartConstructor", {
  enumerable: true,
  get: function () {
    return declarations_1.DartConstructor;
  },
});
Object.defineProperty(exports, "DartEnumValue", {
  enumerable: true,
  get: function () {
    return declarations_1.DartEnumValue;
  },
});
Object.defineProperty(exports, "DartTypedef", {
  enumerable: true,
  get: function () {
    return declarations_1.DartTypedef;
  },
});
Object.defineProperty(exports, "DartDirective", {
  enumerable: true,
  get: function () {
    return declarations_1.DartDirective;
  },
});
var file_1 = require("./file");
Object.defineProperty(exports, "DartFile", {
  enumerable: true,
  get: function () {
    return file_1.DartFile;
  },
});
Object.defineProperty(exports, "DartIdentifier", {
  enumerable: true,
  get: function () {
    return file_1.DartIdentifier;
  },
});
Object.defineProperty(exports, "DartParseError", {
  enumerable: true,
  get: function () {
    return file_1.DartParseError;
  },
});
