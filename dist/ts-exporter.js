"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Convert a camelCase name to a TypeScript interface name, e.g.
 * camelCase => ICamelCase.
 *
 * @param name camelCase name
 */
const toInterfaceName = (name) => name ? `I${name.replace(/^./, (str) => str.toUpperCase())}` : 'any';
/**
 * Convert name to snake name, e.g. camelCase => camel-case
 *
 * @param name input name
 */
exports.toSnakeName = (name) => name
    .split(/(?=[A-Z])/)
    .join('-')
    .toLowerCase();
/**
 * Convert a Strapi type to a TypeScript type.
 *
 * @param propType Strapi type
 */
const toPropertyType = (model) => {
    const pt = model.type ? model.type.toLowerCase() : "any";
    switch (pt) {
        case 'text':
        case 'email':
        case 'password':
            return 'string';
        case 'enumeration':
            return model.enum ? `"${model.enum.join(`" | "`)}"` : "string";
        case 'date':
            return 'Date';
        case 'media':
            return 'Blob';
        case 'json':
            return '{ [key: string]: any }';
        case 'decimal':
        case 'float':
        case 'biginteger':
            return 'number';
        case 'string':
        case 'number':
        case 'boolean':
        default:
            return pt;
    }
};
/**
 * Transform a Strapi Attribute of group.
 *
 * @param attr IStrapiModelAttribute
 */
const groupCompatible = (attr) => {
    return (attr.type === 'group')
        ? attr.repeatable ? { collection: attr.group } : { model: attr.group }
        : attr;
};
/**
 * Convert a Strapi Attribute to a TypeScript property.
 *
 * @param name Name of the property
 * @param a Attributes of the property
 * @param structure Overall output structure
 */
const strapiModelAttributeToProperty = (name, a, structure) => {
    const findModelName = (n) => {
        const result = structure.filter((s) => s.name.toLowerCase() === n).shift();
        if (!result) {
            console.log(`WARNING - Model ${n} is unknown => Use any.`);
        }
        return result ? result.name : '';
    };
    const required = a.required ? '' : '?';
    const collection = a.collection ? '[]' : '';
    a = groupCompatible(a);
    const propType = a.collection
        ? toInterfaceName(findModelName(a.collection))
        : a.model
            ? a.model === 'file'
                ? 'Blob'
                : toInterfaceName(findModelName(a.model))
            : a.type
                ? toPropertyType(a)
                : 'unknown';
    return `${name}${required}: ${propType}${collection};`;
};
/**
 * Find all required models and import them.
 *
 * @param m Strapi model to examine
 * @param structure Overall output structure
 */
const strapiModelExtractImports = (m, structure) => {
    const isUnique = (value, index, arr) => arr.indexOf(value) === index;
    const toImportDefinition = (name) => {
        const found = structure.filter((s) => s.name.toLowerCase() === name).shift();
        const toFolder = (f) => (f.nested ? `../${f.snakeName}/${f.snakeName}` : `./${f.snakeName}`);
        return found ? `import { ${toInterfaceName(found.name)} } from '${toFolder(found)}';` : '';
    };
    const imports = [];
    if (m.attributes) {
        for (const aName in m.attributes) {
            if (!m.attributes.hasOwnProperty(aName)) {
                continue;
            }
            const a = groupCompatible(m.attributes[aName]);
            const proposedImport = a.collection
                ? toImportDefinition(a.collection)
                : a.model && a.model !== 'file'
                    ? toImportDefinition(a.model)
                    : '';
            if (proposedImport) {
                imports.push(proposedImport);
            }
        }
    }
    if (imports.length === 0) {
        return '';
    }
    return imports
        .filter(isUnique)
        .sort()
        .join('\n');
};
const strapiModelToInterface = (m, structure) => {
    const name = m.info.name;
    const interfaceName = toInterfaceName(name);
    const result = [];
    const imports = strapiModelExtractImports(m, structure);
    if (imports) {
        result.push(imports + '\n');
    }
    result.push('/**');
    result.push(` * Model definition for ${name}`);
    result.push(' */');
    result.push(`export interface ${interfaceName} {`);
    result.push('  id: string;');
    if (m.attributes) {
        for (const aName in m.attributes) {
            if (!m.attributes.hasOwnProperty(aName)) {
                continue;
            }
            result.push(`  ${strapiModelAttributeToProperty(aName, m.attributes[aName], structure)}`);
        }
    }
    result.push('}\n');
    return result.join('\n');
};
const writeIndex = (folder, structure) => {
    const outputFile = path.resolve(folder, 'index.ts');
    const output = structure
        .map((s) => (s.nested ? `export * from './${s.snakeName}/${s.snakeName}';` : `export * from './${s.snakeName}';`))
        .join('\n');
    fs.writeFileSync(outputFile, output + '\n');
};
/**
 * Export a StrapiModel to a TypeScript interface
 */
exports.convert = (outputFolder, strapiModels, nested = false) => new Promise((resolve, reject) => {
    let count = strapiModels.length;
    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder);
    }
    const structure = strapiModels.map((m) => {
        const name = m.info.name;
        const snakeName = exports.toSnakeName(name);
        const folder = nested ? path.resolve(outputFolder, snakeName) : outputFolder;
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder);
        }
        return { name, folder, snakeName, m, nested };
    });
    writeIndex(outputFolder, structure);
    structure.forEach((g) => {
        const { folder, snakeName, m } = g;
        const outputFile = path.resolve(folder, `${snakeName}.ts`);
        fs.writeFile(outputFile, strapiModelToInterface(m, structure), { encoding: 'utf8' }, (err) => {
            count--;
            if (err) {
                reject(err);
            }
            if (count === 0) {
                resolve(strapiModels.length);
            }
        });
    });
});
//# sourceMappingURL=ts-exporter.js.map