/**
 * Tool Sandbox
 * Provides isolated execution environment for user-defined tools
 */

import { VM, VMScript } from 'vm2';
import { ToolExecutionContext, ToolExecutionResult } from './types.js';
import { logger } from '../log.js';

// ============================================================================
// SANDBOX CONFIGURATION
// ============================================================================

export interface SandboxConfig {
    /** Maximum execution time in milliseconds */
    timeout: number;
    /** Maximum memory in MB */
    memoryLimit?: number;
    /** Allowed Node.js modules */
    allowedModules?: string[];
    /** Custom globals to inject */
    globals?: Record<string, unknown>;
}

const DEFAULT_CONFIG: SandboxConfig = {
    timeout: 5000,
    memoryLimit: 128,
    allowedModules: [],
};

// ============================================================================
// TOOL SANDBOX
// ============================================================================

class ToolSandbox {
    private readonly logger = logger;
    private readonly config: SandboxConfig;

    constructor(config: Partial<SandboxConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Execute code in a sandboxed environment
     */
    async execute(
        code: string,
        args: Record<string, unknown>,
        context: ToolExecutionContext
    ): Promise<ToolExecutionResult> {
        const startTime = Date.now();

        try {
            // Create VM instance with strict settings
            const vm = new VM({
                timeout: this.config.timeout,
                sandbox: this.createSandbox(args, context),
                eval: false,
                wasm: false,
            });

            // Compile script
            const script = new VMScript(this.wrapCode(code));

            // Execute
            const result = await Promise.race([
                this.runScript(vm, script),
                this.createTimeoutPromise(),
            ]);

            return {
                success: true,
                result,
                executionTime: Date.now() - startTime,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            this.logger.error(
                { error: errorMessage, executionTime: Date.now() - startTime },
                'Sandbox execution failed'
            );

            return {
                success: false,
                error: errorMessage,
                executionTime: Date.now() - startTime,
            };
        }
    }

    /**
     * Create the sandbox context
     */
    private createSandbox(
        args: Record<string, unknown>,
        context: ToolExecutionContext
    ): Record<string, unknown> {
        return {
            // Provided arguments
            args,

            // Execution context (safe subset)
            context: {
                agentId: context.agentId,
                userId: context.userId,
                organizationId: context.organizationId,
            },

            // Safe built-ins
            console: {
                log: (...logArgs: unknown[]) => this.logger.debug({ logArgs }, 'Sandbox console.log'),
                warn: (...logArgs: unknown[]) => this.logger.warn({ logArgs }, 'Sandbox console.warn'),
                error: (...logArgs: unknown[]) => this.logger.error({ logArgs }, 'Sandbox console.error'),
            },

            // Safe utilities
            JSON: {
                parse: JSON.parse,
                stringify: JSON.stringify,
            },
            Date,
            Math,
            String,
            Number,
            Boolean,
            Array,
            Object,
            Map,
            Set,
            RegExp,

            // Custom globals
            ...this.config.globals,
        };
    }

    /**
     * Wrap user code in an async function
     */
    private wrapCode(code: string): string {
        return `
            (async function() {
                ${code}
            })();
        `;
    }

    /**
     * Run script in VM
     */
    private async runScript(vm: VM, script: VMScript): Promise<unknown> {
        return vm.run(script);
    }

    /**
     * Create a timeout promise
     */
    private createTimeoutPromise(): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Execution timed out after ${this.config.timeout}ms`));
            }, this.config.timeout);
        });
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new sandbox instance
 */
export function createSandbox(config?: Partial<SandboxConfig>): ToolSandbox {
    return new ToolSandbox(config);
}

// Default sandbox instance
export const toolSandbox = new ToolSandbox();

export default toolSandbox;
