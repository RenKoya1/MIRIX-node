/**
 * Helpers Module
 * Central exports for utility functions
 */

// DateTime helpers
export {
    getLocalTime,
    getUtcTime,
    datetimeToTimestamp,
    timestampToDatetime,
    validateDateFormat,
    extractDateFromTimestamp,
    isUtcDatetime,
    formatIsoDate,
    parseIsoDate,
    getRelativeTime,
    addDays,
    addHours,
    startOfDay,
    endOfDay,
} from './datetime-helpers';

// JSON helpers
export {
    jsonStringify,
    jsonParse,
    parseJsonRobust,
    getNestedProperty,
    deepClone,
    isValidJson,
    prettyJson,
    compactJson,
} from './json-helpers';

// Converters
export {
    serializeLLMConfig,
    deserializeLLMConfig,
    convertMessageContent,
    extractTextFromContent,
    convertToolRulesToSnakeCase,
    convertToolRulesToCamelCase,
    camelToSnake,
    snakeToCamel,
    objectToSnakeCase,
    objectToCamelCase,
} from './converters';

export type {
    TextContent,
    ImageContent,
    FileContent,
    CloudFileContent,
    MessageContent,
    ToolRuleInput,
    ToolRuleOutput,
} from './converters';
