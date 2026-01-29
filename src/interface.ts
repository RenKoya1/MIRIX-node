/**
 * Agent Interface Module
 * Interfaces handle Mirix-related events (observer pattern)
 * Converted from: mirix/interface.py
 */

import chalk from 'chalk';
import {
    ASSISTANT_MESSAGE_CLI_SYMBOL,
    CLI_WARNING_PREFIX,
    INNER_THOUGHTS_CLI_SYMBOL,
} from './constants.js';
import { jsonLoads, printd } from './utils.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEBUG = process.env.LOG_LEVEL === 'DEBUG';
let STRIP_UI = false;

/**
 * Set whether to strip UI formatting
 */
export function setStripUI(value: boolean): void {
    STRIP_UI = value;
}

/**
 * Get whether UI formatting is stripped
 */
export function getStripUI(): boolean {
    return STRIP_UI;
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Interface message type for CLI/agent event handling
 * Note: This is different from the Prisma/Zod Message schema
 */
export interface InterfaceMessage {
    id?: string;
    role: string;
    content?: string | null;
    function_call?: {
        name: string;
        arguments: string;
    };
    tool_calls?: Array<{
        id: string;
        type: string;
        function: {
            name: string;
            arguments: string;
        };
    }>;
    [key: string]: unknown;
}

// ============================================================================
// ABSTRACT INTERFACE
// ============================================================================

/**
 * Abstract base interface for agent events
 */
export abstract class AgentInterface {
    /**
     * Mirix receives a user message
     */
    abstract userMessage(msg: string, msgObj?: InterfaceMessage): void;

    /**
     * Mirix generates reasoning/thinking content (native model reasoning)
     */
    abstract reasoning(msg: string, msgObj?: InterfaceMessage): void;

    /**
     * Mirix uses send_message
     */
    abstract assistantMessage(msg: string, msgObj?: InterfaceMessage): void;

    /**
     * Mirix calls a function
     */
    abstract functionMessage(msg: string, msgObj?: InterfaceMessage): void;
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

/**
 * Basic interface for dumping agent events to the command-line
 */
export class CLIInterface extends AgentInterface {
    /**
     * Display an important message
     */
    static importantMessage(msg: string): void {
        if (STRIP_UI) {
            console.log(msg);
        } else {
            console.log(chalk.magenta.bold(msg));
        }
    }

    /**
     * Display a warning message
     */
    static warningMessage(msg: string): void {
        if (!STRIP_UI) {
            console.log(chalk.red.bold(msg));
        }
    }

    /**
     * Display reasoning/thinking content from the model
     */
    reasoning(msg: string, _msgObj?: InterfaceMessage): void {
        CLIInterface.reasoningStatic(msg);
    }

    static reasoningStatic(msg: string, _msgObj?: InterfaceMessage): void {
        if (STRIP_UI) {
            console.log(msg);
        } else {
            // Italic gray text with inner thoughts symbol
            console.log(chalk.gray.italic(`${INNER_THOUGHTS_CLI_SYMBOL} ${msg}`));
        }
    }

    /**
     * Display assistant message
     */
    assistantMessage(msg: string, _msgObj?: InterfaceMessage): void {
        CLIInterface.assistantMessageStatic(msg);
    }

    static assistantMessageStatic(msg: string, _msgObj?: InterfaceMessage): void {
        if (STRIP_UI) {
            console.log(msg);
        } else {
            console.log(chalk.yellow.bold(`${ASSISTANT_MESSAGE_CLI_SYMBOL} ${msg}`));
        }
    }

    /**
     * Display memory-related message
     */
    static memoryMessage(msg: string, _msgObj?: InterfaceMessage): void {
        if (STRIP_UI) {
            console.log(msg);
        } else {
            console.log(chalk.magentaBright.bold(`🧠 ${msg}`));
        }
    }

    /**
     * Display system message
     */
    static systemMessage(msg: string, _msgObj?: InterfaceMessage): void {
        if (STRIP_UI) {
            console.log(msg);
        } else {
            console.log(chalk.magenta.bold(`🖥️ [system] ${msg}`));
        }
    }

    /**
     * Display user message
     */
    userMessage(
        msg: string,
        msgObj?: InterfaceMessage,
        options: { raw?: boolean; dump?: boolean; debug?: boolean } = {}
    ): void {
        CLIInterface.userMessageStatic(msg, msgObj, options);
    }

    static userMessageStatic(
        msg: string,
        _msgObj?: InterfaceMessage,
        options: { raw?: boolean; dump?: boolean; debug?: boolean } = {}
    ): void {
        const { raw = false, dump = false, debug = DEBUG } = options;

        const printUserMessage = (icon: string, message: string | object): void => {
            const msgStr = typeof message === 'string' ? message : JSON.stringify(message);
            if (STRIP_UI) {
                console.log(`${icon} ${msgStr}`);
            } else {
                console.log(chalk.green.bold(`${icon} ${msgStr}`));
            }
        };

        if (!(raw || dump || debug)) {
            // Do not repeat the message in normal use
            return;
        }

        if (typeof msg === 'string') {
            if (raw) {
                printUserMessage('🧑', msg);
                return;
            }

            let msgJson: Record<string, unknown>;
            try {
                msgJson = jsonLoads(msg) as Record<string, unknown>;
            } catch {
                printd(`${CLI_WARNING_PREFIX}failed to parse user message into json`);
                printUserMessage('🧑', msg);
                return;
            }

            if (msgJson.type === 'user_message') {
                if (dump) {
                    printUserMessage('🧑', msgJson.message as string);
                    return;
                }
                delete msgJson.type;
                printUserMessage('🧑', msgJson);
            } else if (msgJson.type === 'continue_chaining') {
                if (debug) {
                    delete msgJson.type;
                    printUserMessage('💓', msgJson);
                } else if (dump) {
                    printUserMessage('💓', msgJson);
                }
            } else if (msgJson.type === 'system_message') {
                delete msgJson.type;
                printUserMessage('🖥️', msgJson);
            } else {
                printUserMessage('🧑', msgJson);
            }
        }
    }

    /**
     * Display function message
     */
    functionMessage(msg: string, msgObj?: InterfaceMessage): void {
        CLIInterface.functionMessageStatic(msg, msgObj);
    }

    static functionMessageStatic(
        msg: string | Record<string, unknown>,
        _msgObj?: InterfaceMessage,
        debug: boolean = DEBUG
    ): void {
        const printFunctionMessage = (
            icon: string,
            message: string | object,
            color: typeof chalk.red = chalk.red,
            printFn: typeof console.log = console.log
        ): void => {
            const msgStr = typeof message === 'string' ? message : JSON.stringify(message);
            if (STRIP_UI) {
                printFn(`⚡${icon} [function] ${msgStr}`);
            } else {
                printFn(color.bold(`⚡${icon} [function] ${msgStr}`));
            }
        };

        const printdFunctionMessage = (
            icon: string,
            message: string | object,
            color: typeof chalk.red = chalk.red
        ): void => {
            printFunctionMessage(icon, message, color, debug ? console.log : () => {});
        };

        if (typeof msg === 'object') {
            printdFunctionMessage('', msg);
            return;
        }

        if (msg.startsWith('Success')) {
            printdFunctionMessage('🟢', msg);
        } else if (msg.startsWith('Error: ')) {
            printdFunctionMessage('🔴', msg);
        } else if (msg.startsWith('Ran ')) {
            // Ignore 'ran' messages that come post-execution
            return;
        } else if (msg.startsWith('Running ')) {
            if (debug) {
                printdFunctionMessage('', msg);
            } else {
                const match = msg.match(/Running (\w+)\((.*)\)/);
                if (match) {
                    const functionName = match[1];
                    const memoryFunctions = [
                        'archival_memory_insert',
                        'archival_memory_search',
                        'core_memory_append',
                        'conversation_search',
                        'conversation_search_date',
                    ];

                    if (memoryFunctions.includes(functionName)) {
                        if (['archival_memory_insert', 'core_memory_append'].includes(functionName)) {
                            printFunctionMessage('🧠', `updating memory with ${functionName}`);
                        } else {
                            printFunctionMessage('🧠', `searching memory with ${functionName}`);
                        }
                    } else {
                        printd(`${CLI_WARNING_PREFIX}did not recognize function message`);
                        printdFunctionMessage('', msg);
                    }
                }
            }
        } else {
            try {
                const msgDict = jsonLoads(msg) as Record<string, unknown>;
                if (msgDict.status === 'OK') {
                    printdFunctionMessage('', msg, chalk.green);
                } else {
                    printdFunctionMessage('', msg, chalk.red);
                }
            } catch {
                console.log(`${CLI_WARNING_PREFIX}did not recognize function message ${typeof msg} ${msg}`);
                printdFunctionMessage('', msg);
            }
        }
    }

    /**
     * Print a sequence of messages
     */
    static printMessages(messageSequence: InterfaceMessage[], dump: boolean = false): void {
        let idx = messageSequence.length;

        for (const msg of messageSequence) {
            if (dump) {
                process.stdout.write(`[${idx}] `);
                idx -= 1;
            }

            const role = msg.role;
            const content = msg.content;

            if (role === 'system') {
                CLIInterface.systemMessage(content ?? '');
            } else if (role === 'assistant') {
                // Differentiate between reasoning content, function calls, and messages
                if (msg.function_call) {
                    if (content) {
                        CLIInterface.reasoningStatic(content);
                    }
                    try {
                        const args = jsonLoads(msg.function_call.arguments) as Record<string, unknown>;
                        CLIInterface.assistantMessageStatic(args.message as string);
                    } catch {
                        // Ignore parse errors
                    }
                } else if (msg.tool_calls && msg.tool_calls.length > 0) {
                    if (content) {
                        CLIInterface.reasoningStatic(content);
                    }
                    const functionObj = msg.tool_calls[0]?.function;
                    if (functionObj) {
                        try {
                            const args = jsonLoads(functionObj.arguments) as Record<string, unknown>;
                            if (args.message) {
                                CLIInterface.assistantMessageStatic(args.message as string);
                            }
                        } catch {
                            // Ignore parse errors
                        }
                    }
                } else if (content) {
                    CLIInterface.assistantMessageStatic(content);
                }
            } else if (role === 'user') {
                CLIInterface.userMessageStatic(content ?? '', undefined, { dump });
            } else if (role === 'function' || role === 'tool') {
                CLIInterface.functionMessageStatic(content ?? '');
            }
        }
    }
}

// ============================================================================
// STREAMING INTERFACE
// ============================================================================

/**
 * Interface for streaming agent events
 */
export class StreamingInterface extends AgentInterface {
    private buffer: string[] = [];

    userMessage(msg: string, _msgObj?: InterfaceMessage): void {
        this.buffer.push(`[USER] ${msg}`);
    }

    reasoning(msg: string, _msgObj?: InterfaceMessage): void {
        this.buffer.push(`[REASONING] ${msg}`);
    }

    assistantMessage(msg: string, _msgObj?: InterfaceMessage): void {
        this.buffer.push(`[ASSISTANT] ${msg}`);
    }

    functionMessage(msg: string, _msgObj?: InterfaceMessage): void {
        this.buffer.push(`[FUNCTION] ${msg}`);
    }

    /**
     * Get and clear the buffer
     */
    flush(): string[] {
        const messages = [...this.buffer];
        this.buffer = [];
        return messages;
    }

    /**
     * Get buffer without clearing
     */
    peek(): string[] {
        return [...this.buffer];
    }
}

// ============================================================================
// ASYNC QUEUE INTERFACE
// ============================================================================

/**
 * Interface that queues events for async processing
 */
export class AsyncQueueInterface extends AgentInterface {
    private queue: Array<{ type: string; msg: string; msgObj?: InterfaceMessage }> = [];
    private resolvers: Array<(value: { type: string; msg: string; msgObj?: InterfaceMessage }) => void> = [];

    userMessage(msg: string, msgObj?: InterfaceMessage): void {
        this.enqueue({ type: 'user', msg, msgObj });
    }

    reasoning(msg: string, msgObj?: InterfaceMessage): void {
        this.enqueue({ type: 'reasoning', msg, msgObj });
    }

    assistantMessage(msg: string, msgObj?: InterfaceMessage): void {
        this.enqueue({ type: 'assistant', msg, msgObj });
    }

    functionMessage(msg: string, msgObj?: InterfaceMessage): void {
        this.enqueue({ type: 'function', msg, msgObj });
    }

    private enqueue(event: { type: string; msg: string; msgObj?: InterfaceMessage }): void {
        const resolver = this.resolvers.shift();
        if (resolver) {
            resolver(event);
        } else {
            this.queue.push(event);
        }
    }

    /**
     * Get next event (async)
     */
    async getNext(): Promise<{ type: string; msg: string; msgObj?: InterfaceMessage }> {
        const event = this.queue.shift();
        if (event) {
            return event;
        }

        return new Promise((resolve) => {
            this.resolvers.push(resolve);
        });
    }

    /**
     * Check if queue has events
     */
    hasEvents(): boolean {
        return this.queue.length > 0;
    }

    /**
     * Clear the queue
     */
    clear(): void {
        this.queue = [];
        this.resolvers = [];
    }
}

// ============================================================================
// DEFAULT INSTANCE
// ============================================================================

let defaultInterface: AgentInterface = new CLIInterface();

/**
 * Get the default interface
 */
export function getDefaultInterface(): AgentInterface {
    return defaultInterface;
}

/**
 * Set the default interface
 */
export function setDefaultInterface(iface: AgentInterface): void {
    defaultInterface = iface;
}
