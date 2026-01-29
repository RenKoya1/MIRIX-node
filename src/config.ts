/**
 * Config Module
 * Configuration management for MIRIX using INI-style config files
 * Converted from: mirix/config.py
 */

import fs from 'fs';
import path from 'path';
import {
    MIRIX_DIR,
    DEFAULT_PRESET,
    DEFAULT_PERSONA,
    DEFAULT_HUMAN,
    CORE_MEMORY_PERSONA_CHAR_LIMIT,
    CORE_MEMORY_HUMAN_CHAR_LIMIT,
} from './constants';
import { logger } from './log';

/** MIRIX version - defined here to avoid circular imports */
export const CONFIG_VERSION = '0.1.0';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simple INI parser
 */
function parseIni(content: string): Record<string, Record<string, string>> {
    const result: Record<string, Record<string, string>> = {};
    let currentSection = '';

    for (const line of content.split('\n')) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
            continue;
        }

        // Section header
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            currentSection = trimmed.slice(1, -1);
            result[currentSection] = {};
            continue;
        }

        // Key-value pair
        const equalsIndex = trimmed.indexOf('=');
        if (equalsIndex > 0 && currentSection) {
            const key = trimmed.slice(0, equalsIndex).trim();
            const value = trimmed.slice(equalsIndex + 1).trim();
            result[currentSection][key] = value;
        }
    }

    return result;
}

/**
 * Simple INI serializer
 */
function serializeIni(data: Record<string, Record<string, string>>): string {
    const lines: string[] = [];

    for (const [section, values] of Object.entries(data)) {
        lines.push(`[${section}]`);
        for (const [key, value] of Object.entries(values)) {
            if (value !== undefined && value !== null) {
                lines.push(`${key} = ${value}`);
            }
        }
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Get field from config
 */
function getField(
    config: Record<string, Record<string, string>>,
    section: string,
    field: string
): string | undefined {
    return config[section]?.[field];
}

/**
 * Set field in config
 */
function setField(
    config: Record<string, Record<string, string>>,
    section: string,
    field: string,
    value: string | undefined
): void {
    if (value === undefined || value === null) {
        return;
    }

    if (!config[section]) {
        config[section] = {};
    }

    config[section][field] = value;
}

// ============================================================================
// MIRIX CONFIG
// ============================================================================

export interface MirixConfigOptions {
    configPath?: string;
    preset?: string;
    persona?: string;
    human?: string;
    archivalStorageType?: string;
    archivalStoragePath?: string;
    archivalStorageUri?: string;
    recallStorageType?: string;
    recallStoragePath?: string;
    recallStorageUri?: string;
    metadataStorageType?: string;
    metadataStoragePath?: string;
    metadataStorageUri?: string;
    persistenceManagerType?: string;
    persistenceManagerSaveFile?: string;
    persistenceManagerUri?: string;
    mirixVersion?: string;
    policiesAccepted?: boolean;
    coreMemoryPersonaCharLimit?: number;
    coreMemoryHumanCharLimit?: number;
}

export class MirixConfig {
    /** Path to the config file */
    configPath: string;

    /** Preset/system prompt name */
    preset: string;

    /** Persona name */
    persona: string;

    /** Human name */
    human: string;

    // Database configs: archival
    archivalStorageType: string;
    archivalStoragePath: string;
    archivalStorageUri?: string;

    // Database configs: recall
    recallStorageType: string;
    recallStoragePath: string;
    recallStorageUri?: string;

    // Database configs: metadata
    metadataStorageType: string;
    metadataStoragePath: string;
    metadataStorageUri?: string;

    // Database configs: agent state
    persistenceManagerType?: string;
    persistenceManagerSaveFile?: string;
    persistenceManagerUri?: string;

    /** MIRIX version */
    mirixVersion: string;

    /** Whether policies have been accepted */
    policiesAccepted: boolean;

    /** Core memory persona character limit */
    coreMemoryPersonaCharLimit: number;

    /** Core memory human character limit */
    coreMemoryHumanCharLimit: number;

    constructor(options: MirixConfigOptions = {}) {
        this.configPath = options.configPath ??
            process.env.MEMGPT_CONFIG_PATH ??
            path.join(MIRIX_DIR, 'config');

        this.preset = options.preset ?? DEFAULT_PRESET;
        this.persona = options.persona ?? DEFAULT_PERSONA;
        this.human = options.human ?? DEFAULT_HUMAN;

        // Archival storage
        this.archivalStorageType = options.archivalStorageType ?? 'sqlite';
        this.archivalStoragePath = options.archivalStoragePath ?? MIRIX_DIR;
        this.archivalStorageUri = options.archivalStorageUri;

        // Recall storage
        this.recallStorageType = options.recallStorageType ?? 'sqlite';
        this.recallStoragePath = options.recallStoragePath ?? MIRIX_DIR;
        this.recallStorageUri = options.recallStorageUri;

        // Metadata storage
        this.metadataStorageType = options.metadataStorageType ?? 'sqlite';
        this.metadataStoragePath = options.metadataStoragePath ?? MIRIX_DIR;
        this.metadataStorageUri = options.metadataStorageUri;

        // Persistence manager
        this.persistenceManagerType = options.persistenceManagerType;
        this.persistenceManagerSaveFile = options.persistenceManagerSaveFile;
        this.persistenceManagerUri = options.persistenceManagerUri;

        // Version
        this.mirixVersion = options.mirixVersion ?? CONFIG_VERSION;

        // User info
        this.policiesAccepted = options.policiesAccepted ?? false;

        // Memory limits
        this.coreMemoryPersonaCharLimit = options.coreMemoryPersonaCharLimit ?? CORE_MEMORY_PERSONA_CHAR_LIMIT;
        this.coreMemoryHumanCharLimit = options.coreMemoryHumanCharLimit ?? CORE_MEMORY_HUMAN_CHAR_LIMIT;
    }

    /**
     * Load config from file
     */
    static load(): MirixConfig {
        // Allow overriding with env variables
        const configPath = process.env.MEMGPT_CONFIG_PATH ?? path.join(MIRIX_DIR, 'config');

        // Ensure all configuration directories exist
        MirixConfig.createConfigDir();

        logger.debug(`Loading config from ${configPath}`);

        if (fs.existsSync(configPath)) {
            // Read existing config
            const content = fs.readFileSync(configPath, 'utf-8');
            const config = parseIni(content);

            const configDict: MirixConfigOptions = {
                configPath,
                preset: getField(config, 'defaults', 'preset'),
                persona: getField(config, 'defaults', 'persona'),
                human: getField(config, 'defaults', 'human'),
                archivalStorageType: getField(config, 'archival_storage', 'type'),
                archivalStoragePath: getField(config, 'archival_storage', 'path'),
                archivalStorageUri: getField(config, 'archival_storage', 'uri'),
                recallStorageType: getField(config, 'recall_storage', 'type'),
                recallStoragePath: getField(config, 'recall_storage', 'path'),
                recallStorageUri: getField(config, 'recall_storage', 'uri'),
                metadataStorageType: getField(config, 'metadata_storage', 'type'),
                metadataStoragePath: getField(config, 'metadata_storage', 'path'),
                metadataStorageUri: getField(config, 'metadata_storage', 'uri'),
                mirixVersion: getField(config, 'version', 'mirix_version'),
            };

            // Remove undefined values
            const cleanedDict = Object.fromEntries(
                Object.entries(configDict).filter(([_, v]) => v !== undefined)
            ) as MirixConfigOptions;

            return new MirixConfig(cleanedDict);
        }

        // Create new config
        const newConfig = new MirixConfig({ configPath });
        MirixConfig.createConfigDir();

        return newConfig;
    }

    /**
     * Save config to file
     */
    save(): void {
        const config: Record<string, Record<string, string>> = {};

        // CLI defaults
        setField(config, 'defaults', 'preset', this.preset);
        setField(config, 'defaults', 'persona', this.persona);
        setField(config, 'defaults', 'human', this.human);

        // Archival storage
        setField(config, 'archival_storage', 'type', this.archivalStorageType);
        setField(config, 'archival_storage', 'path', this.archivalStoragePath);
        setField(config, 'archival_storage', 'uri', this.archivalStorageUri);

        // Recall storage
        setField(config, 'recall_storage', 'type', this.recallStorageType);
        setField(config, 'recall_storage', 'path', this.recallStoragePath);
        setField(config, 'recall_storage', 'uri', this.recallStorageUri);

        // Metadata storage
        setField(config, 'metadata_storage', 'type', this.metadataStorageType);
        setField(config, 'metadata_storage', 'path', this.metadataStoragePath);
        setField(config, 'metadata_storage', 'uri', this.metadataStorageUri);

        // Set version
        setField(config, 'version', 'mirix_version', CONFIG_VERSION);

        // Always make sure all directories are present
        MirixConfig.createConfigDir();

        // Write config
        fs.writeFileSync(this.configPath, serializeIni(config), 'utf-8');
        logger.debug(`Saved Config: ${this.configPath}`);
    }

    /**
     * Check if config file exists
     */
    static exists(): boolean {
        const configPath = process.env.MEMGPT_CONFIG_PATH ?? path.join(MIRIX_DIR, 'config');

        if (fs.existsSync(configPath) && fs.statSync(configPath).isDirectory()) {
            throw new Error(`Config path ${configPath} cannot be set to a directory.`);
        }

        return fs.existsSync(configPath);
    }

    /**
     * Create config directory
     */
    static createConfigDir(): void {
        if (!fs.existsSync(MIRIX_DIR)) {
            fs.mkdirSync(MIRIX_DIR, { recursive: true });
        }

        // Only create the tmp folder if it doesn't exist
        const tmpFolder = path.join(MIRIX_DIR, 'tmp');
        if (!fs.existsSync(tmpFolder)) {
            fs.mkdirSync(tmpFolder, { recursive: true });
        }
    }

    /**
     * Get config as plain object
     */
    toObject(): MirixConfigOptions {
        return {
            configPath: this.configPath,
            preset: this.preset,
            persona: this.persona,
            human: this.human,
            archivalStorageType: this.archivalStorageType,
            archivalStoragePath: this.archivalStoragePath,
            archivalStorageUri: this.archivalStorageUri,
            recallStorageType: this.recallStorageType,
            recallStoragePath: this.recallStoragePath,
            recallStorageUri: this.recallStorageUri,
            metadataStorageType: this.metadataStorageType,
            metadataStoragePath: this.metadataStoragePath,
            metadataStorageUri: this.metadataStorageUri,
            persistenceManagerType: this.persistenceManagerType,
            persistenceManagerSaveFile: this.persistenceManagerSaveFile,
            persistenceManagerUri: this.persistenceManagerUri,
            mirixVersion: this.mirixVersion,
            policiesAccepted: this.policiesAccepted,
            coreMemoryPersonaCharLimit: this.coreMemoryPersonaCharLimit,
            coreMemoryHumanCharLimit: this.coreMemoryHumanCharLimit,
        };
    }
}

// ============================================================================
// DEFAULT INSTANCE
// ============================================================================

let defaultConfig: MirixConfig | null = null;

/**
 * Get or load the default config instance
 */
export function getConfig(): MirixConfig {
    if (!defaultConfig) {
        defaultConfig = MirixConfig.load();
    }
    return defaultConfig;
}

/**
 * Set the default config instance
 */
export function setConfig(config: MirixConfig): void {
    defaultConfig = config;
}

/**
 * Reset the default config instance
 */
export function resetConfig(): void {
    defaultConfig = null;
}
