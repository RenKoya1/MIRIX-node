/**
 * Main Agent
 * The primary agent implementation for MIRIX
 */

import { Agent, Block } from '@prisma/client';
import { BaseAgent, AgentConfig, AgentResult } from './base-agent.js';
import {
    ToolCall,
    ToolReturn,
    ToolExecutionContext,
    toolRegistry,
} from '../tools/index.js';
import { blockManager } from '../services/block-manager.js';

// ============================================================================
// MIRIX AGENT
// ============================================================================

export class MirixAgent extends BaseAgent {
    private coreMemory: Block[] = [];

    constructor(agent: Agent, config: Partial<AgentConfig> = {}) {
        super(agent, config);
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize the agent with all required context
     */
    async initialize(): Promise<void> {
        await this.loadCoreMemory();
        await this.loadContext();
    }

    /**
     * Load core memory blocks
     */
    private async loadCoreMemory(): Promise<void> {
        this.coreMemory = await blockManager.getAgentBlocks(
            this.state.agent.id,
            this.state.agent.organizationId
                ? { id: '', organizationId: this.state.agent.organizationId }
                : undefined
        );
    }

    // ========================================================================
    // SYSTEM PROMPT
    // ========================================================================

    /**
     * Build the system prompt including core memory
     */
    protected async buildSystemPrompt(): Promise<string> {
        const parts: string[] = [];

        // Base system prompt from agent
        if (this.state.agent.system) {
            parts.push(this.state.agent.system);
        }

        // Add core memory section
        if (this.coreMemory.length > 0) {
            parts.push('\n\n<core_memory>');
            for (const block of this.coreMemory) {
                parts.push(`\n<${block.label}>\n${block.value}\n</${block.label}>`);
            }
            parts.push('\n</core_memory>');
        }

        // Add current datetime
        parts.push(`\n\nCurrent datetime: ${new Date().toISOString()}`);

        return parts.join('\n');
    }

    // ========================================================================
    // TOOL EXECUTION
    // ========================================================================

    /**
     * Process tool calls by executing them through the registry
     */
    protected async processToolCalls(
        toolCalls: ToolCall[],
        context: ToolExecutionContext
    ): Promise<ToolReturn[]> {
        const returns: ToolReturn[] = [];

        for (const tc of toolCalls) {
            this.logger.debug(
                { toolName: tc.name, toolCallId: tc.id },
                'Executing tool'
            );

            try {
                const result = await toolRegistry.execute(tc.name, tc.arguments, context);

                returns.push({
                    toolCallId: tc.id,
                    name: tc.name,
                    result: result.success ? result.result : { error: result.error },
                    error: result.error,
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);

                this.logger.error(
                    { toolName: tc.name, error: errorMessage },
                    'Tool execution error'
                );

                returns.push({
                    toolCallId: tc.id,
                    name: tc.name,
                    result: { error: errorMessage },
                    error: errorMessage,
                });
            }
        }

        return returns;
    }

    // ========================================================================
    // RESPONSE HANDLING
    // ========================================================================

    /**
     * Handle the final assistant response
     */
    protected async handleFinalResponse(message: string): Promise<void> {
        await this.addAssistantMessage(message);

        this.logger.debug(
            { agentId: this.state.agent.id, messageLength: message.length },
            'Final response generated'
        );
    }

    // ========================================================================
    // CHAT INTERFACE
    // ========================================================================

    /**
     * Send a message and get a response
     */
    async chat(
        message: string,
        userId: string,
        options?: {
            clientId?: string;
            stepId?: string;
        }
    ): Promise<AgentResult> {
        const context: ToolExecutionContext = {
            agentId: this.state.agent.id,
            userId,
            organizationId: this.state.agent.organizationId ?? '',
            clientId: options?.clientId,
            stepId: options?.stepId,
        };

        return this.step(message, context);
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new agent instance
 */
export async function createAgent(
    agentId: string,
    config?: Partial<AgentConfig>
): Promise<MirixAgent> {
    const { prismaRaw } = await import('../database/prisma-client.js');

    const agent = await prismaRaw.agent.findUnique({
        where: { id: agentId },
    });

    if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
    }

    const mirixAgent = new MirixAgent(agent, config);
    await mirixAgent.initialize();

    return mirixAgent;
}

export default MirixAgent;
