/**
 * Base Agent
 * Abstract base class for all agent types
 */

import { Agent, Message } from '@prisma/client';
import { generateText } from 'ai';
import { z } from 'zod';
import { logger } from '../log';

// Message type for LLM context
type LLMMessage = {
    role: 'user' | 'assistant' | 'system';
    content: string;
};
import { prismaRaw } from '../database/prisma-client';
import { createModel } from '../llm_api/client';
import { LLMConfig, createDefaultLLMConfig } from '../schemas/llm_config';
import {
    AgentState,
    AgentStatus,
    createAgentState,
    updateStatus,
    startStep,
    completeStep,
    recordToolCalls,
    recordToolReturns,
    updateTokenUsage,
    setShouldStop,
    setError,
} from './agent-state';
import {
    ToolDefinition,
    ToolCall,
    ToolReturn,
    ToolExecutionContext,
    ToolRule,
    toolRegistry,
    toolRuleSolver,
    updateExecutionState,
} from '../tools/index';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface AgentConfig {
    /** Maximum number of steps per execution */
    maxSteps: number;
    /** Maximum chaining steps (tool call loops) */
    maxChainingSteps: number;
    /** Maximum tokens per execution */
    maxTokens: number;
    /** Context window limit */
    contextWindowLimit: number;
    /** Temperature for LLM */
    temperature: number;
    /** Whether to stream responses */
    streaming: boolean;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
    maxSteps: 100,
    maxChainingSteps: 20,
    maxTokens: 100000,
    contextWindowLimit: 128000,
    temperature: 0.7,
    streaming: false,
};

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface AgentResult {
    success: boolean;
    message?: string;
    messages: Message[];
    tokenUsage: {
        input: number;
        output: number;
        total: number;
    };
    stepCount: number;
    executionTimeMs: number;
    error?: string;
}

// ============================================================================
// BASE AGENT
// ============================================================================

export abstract class BaseAgent {
    protected readonly logger = logger;
    protected readonly prisma = prismaRaw;
    protected state: AgentState;
    protected config: AgentConfig;
    protected tools: ToolDefinition[] = [];
    protected toolRules: ToolRule[] = [];

    constructor(agent: Agent, config: Partial<AgentConfig> = {}) {
        this.state = createAgentState(agent);
        this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
    }

    // ========================================================================
    // ABSTRACT METHODS
    // ========================================================================

    /**
     * Build system prompt for the agent
     */
    protected abstract buildSystemPrompt(): Promise<string>;

    /**
     * Process tool calls and return results
     */
    protected abstract processToolCalls(
        toolCalls: ToolCall[],
        context: ToolExecutionContext
    ): Promise<ToolReturn[]>;

    /**
     * Handle final response from agent
     */
    protected abstract handleFinalResponse(message: string): Promise<void>;

    // ========================================================================
    // CORE EXECUTION
    // ========================================================================

    /**
     * Main entry point for agent execution
     */
    async step(
        userMessage?: string,
        context?: ToolExecutionContext
    ): Promise<AgentResult> {
        const startTime = Date.now();

        try {
            this.state = updateStatus(this.state, AgentStatus.THINKING);
            this.state.executionStartedAt = new Date();

            // Load messages and tools
            await this.loadContext();

            // Add user message if provided
            if (userMessage) {
                await this.addUserMessage(userMessage, context?.userId ?? '');
            }

            // Execute inner loop
            const result = await this.innerLoop(context);

            return {
                success: true,
                message: result.assistantMessage,
                messages: this.state.messages,
                tokenUsage: {
                    input: this.state.tokenUsage.inputTokens,
                    output: this.state.tokenUsage.outputTokens,
                    total: this.state.tokenUsage.totalTokens,
                },
                stepCount: this.state.stepNumber,
                executionTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.state = setError(this.state, errorMessage);

            this.logger.error(
                { agentId: this.state.agent.id, error: errorMessage },
                'Agent execution failed'
            );

            return {
                success: false,
                messages: this.state.messages,
                tokenUsage: {
                    input: this.state.tokenUsage.inputTokens,
                    output: this.state.tokenUsage.outputTokens,
                    total: this.state.tokenUsage.totalTokens,
                },
                stepCount: this.state.stepNumber,
                executionTimeMs: Date.now() - startTime,
                error: errorMessage,
            };
        }
    }

    /**
     * Inner execution loop
     */
    protected async innerLoop(
        context?: ToolExecutionContext
    ): Promise<{ assistantMessage?: string }> {
        let chainingCount = 0;
        let assistantMessage: string | undefined;

        while (chainingCount < this.config.maxChainingSteps) {
            if (this.state.shouldStop) {
                break;
            }

            // Start new step
            this.state = startStep(this.state);

            // Get AI response
            const response = await this.getAiReply();

            // Update token usage
            this.state = updateTokenUsage(
                this.state,
                response.usage?.promptTokens ?? 0,
                response.usage?.completionTokens ?? 0
            );

            // Handle response
            if (response.toolCalls && response.toolCalls.length > 0) {
                // Process tool calls
                const toolCalls: ToolCall[] = response.toolCalls.map((tc) => ({
                    id: tc.toolCallId,
                    name: tc.toolName,
                    arguments: tc.args as Record<string, unknown>,
                }));

                this.state = recordToolCalls(this.state, toolCalls);

                // Execute tools
                const executionContext: ToolExecutionContext = context ?? {
                    agentId: this.state.agent.id,
                    userId: '',
                    organizationId: this.state.agent.organizationId ?? '',
                };

                const toolReturns = await this.processToolCalls(toolCalls, executionContext);
                this.state = recordToolReturns(this.state, toolReturns);

                // Update tool state
                for (const tc of toolCalls) {
                    this.state.toolState = updateExecutionState(this.state.toolState, tc.name);

                    // Check for terminal tool
                    if (toolRuleSolver.isTerminalCall(tc.name, this.toolRules)) {
                        this.state = setShouldStop(this.state, 'Terminal tool called');
                    }
                }

                // Add tool messages
                await this.addToolMessages(toolCalls, toolReturns);

                chainingCount++;
            } else if (response.text) {
                // Final text response
                assistantMessage = response.text;
                await this.handleFinalResponse(assistantMessage);
                this.state = completeStep(this.state, {
                    assistantMessage,
                    status: AgentStatus.COMPLETED,
                });
                break;
            } else {
                // No response
                this.state = setShouldStop(this.state, 'No response from AI');
                break;
            }

            this.state = completeStep(this.state, { status: AgentStatus.COMPLETED });
        }

        if (chainingCount >= this.config.maxChainingSteps) {
            this.state = setShouldStop(this.state, 'Max chaining steps reached');
        }

        return { assistantMessage };
    }

    /**
     * Get AI reply from LLM
     */
    protected async getAiReply(): Promise<{
        text?: string;
        toolCalls?: Array<{
            toolCallId: string;
            toolName: string;
            args: unknown;
        }>;
        usage?: {
            promptTokens: number;
            completionTokens: number;
        };
    }> {
        const systemPrompt = await this.buildSystemPrompt();
        const messages = this.buildMessages();

        // Get available tools
        const availableTools = toolRuleSolver.getAvailableTools(
            this.tools.map((t) => t.name),
            this.toolRules,
            this.state.toolState
        );

        const toolsForLLM = toolRegistry.getForLLM(availableTools);

        // Get LLM config from agent or use defaults
        const agentLlmConfig = this.state.agent.llmConfig as Partial<LLMConfig> | null;
        let llmConfig: LLMConfig;

        if (agentLlmConfig && agentLlmConfig.model && agentLlmConfig.modelEndpointType) {
            llmConfig = {
                ...createDefaultLLMConfig('gpt-4o'),
                ...agentLlmConfig,
            } as LLMConfig;
        } else {
            llmConfig = createDefaultLLMConfig('gpt-4o');
        }

        const languageModel = createModel(llmConfig);

        // Build tools for Vercel AI SDK format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aiTools: Record<string, any> = {};
        for (const t of toolsForLLM) {
            const properties = t.function.parameters.properties ?? {};
            const schemaObj: Record<string, z.ZodTypeAny> = {};

            for (const [key, prop] of Object.entries(properties)) {
                const propDef = prop as { type?: string; description?: string };
                let schema: z.ZodTypeAny = z.unknown();
                if (propDef.type === 'string') schema = z.string();
                else if (propDef.type === 'number') schema = z.number();
                else if (propDef.type === 'boolean') schema = z.boolean();
                else if (propDef.type === 'array') schema = z.array(z.unknown());
                else if (propDef.type === 'object') schema = z.record(z.unknown());
                if (propDef.description) {
                    schema = schema.describe(propDef.description);
                }
                schemaObj[key] = schema.optional();
            }

            aiTools[t.function.name] = {
                description: t.function.description,
                parameters: z.object(schemaObj),
            };
        }

        // Generate response
        const response = await generateText({
            model: languageModel,
            system: systemPrompt,
            messages,
            tools: aiTools,
            temperature: this.config.temperature,
            maxOutputTokens: 4096,
        });

        // Extract tool calls from response
        type ToolCallType = { toolCallId: string; toolName: string; args: unknown };
        const toolCallsResult: ToolCallType[] = (response.toolCalls ?? []).map((tc) => ({
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            args: (tc as unknown as { args: unknown }).args,
        }));

        // Extract usage with type safety
        const usage = response.usage as { promptTokens?: number; completionTokens?: number } | undefined;

        return {
            text: response.text,
            toolCalls: toolCallsResult.length > 0 ? toolCallsResult : undefined,
            usage: usage
                ? {
                      promptTokens: usage.promptTokens ?? 0,
                      completionTokens: usage.completionTokens ?? 0,
                  }
                : undefined,
        };
    }

    // ========================================================================
    // MESSAGE MANAGEMENT
    // ========================================================================

    /**
     * Build messages for LLM context
     */
    protected buildMessages(): LLMMessage[] {
        return this.state.messages.map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.text ?? '',
        }));
    }

    /**
     * Load context (messages, tools, etc.)
     */
    protected async loadContext(): Promise<void> {
        // Load messages
        const messages = await this.prisma.message.findMany({
            where: {
                agentId: this.state.agent.id,
                isDeleted: false,
            },
            orderBy: { createdAt: 'asc' },
            take: 100,
        });

        this.state.messages = messages;

        // Load tools
        await this.loadTools();
    }

    /**
     * Load available tools for this agent
     */
    protected async loadTools(): Promise<void> {
        const toolsAgents = await this.prisma.toolsAgents.findMany({
            where: { agentId: this.state.agent.id },
            include: { tool: true },
        });

        // Convert DB tools to tool definitions
        for (const ta of toolsAgents) {
            const tool = ta.tool;
            if (tool.isDeleted) continue;

            const registeredTool = toolRegistry.get(tool.name);
            if (registeredTool) {
                this.tools.push(registeredTool);
            }
        }

        // Load tool rules from agent config
        const agentToolRules = this.state.agent.toolRules as ToolRule[] | null;
        if (agentToolRules) {
            this.toolRules = agentToolRules;
        }
    }

    /**
     * Add user message to context
     */
    protected async addUserMessage(content: string, userId: string): Promise<void> {
        const message = await this.prisma.message.create({
            data: {
                id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                role: 'user',
                text: content,
                agentId: this.state.agent.id,
                userId,
                organizationId: this.state.agent.organizationId,
            },
        });

        this.state.messages.push(message);
    }

    /**
     * Add assistant message to context
     */
    protected async addAssistantMessage(content: string): Promise<void> {
        const message = await this.prisma.message.create({
            data: {
                id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                role: 'assistant',
                text: content,
                agentId: this.state.agent.id,
                userId: this.state.agent.createdById ?? '',
                organizationId: this.state.agent.organizationId,
            },
        });

        this.state.messages.push(message);
    }

    /**
     * Add tool messages to context
     */
    protected async addToolMessages(
        toolCalls: ToolCall[],
        toolReturns: ToolReturn[]
    ): Promise<void> {
        // Add assistant message with tool calls
        const toolCallsJson = toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments),
            },
        }));

        await this.prisma.message.create({
            data: {
                id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                role: 'assistant',
                text: null,
                toolCalls: toolCallsJson,
                agentId: this.state.agent.id,
                userId: this.state.agent.createdById ?? '',
                organizationId: this.state.agent.organizationId,
            },
        });

        // Add tool return messages
        for (const tr of toolReturns) {
            await this.prisma.message.create({
                data: {
                    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    role: 'tool',
                    text: typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result),
                    toolCallId: tr.toolCallId,
                    name: tr.name,
                    agentId: this.state.agent.id,
                    userId: this.state.agent.createdById ?? '',
                    organizationId: this.state.agent.organizationId,
                },
            });
        }
    }

    // ========================================================================
    // GETTERS
    // ========================================================================

    get agentId(): string {
        return this.state.agent.id;
    }

    get currentState(): AgentState {
        return this.state;
    }

    get isRunning(): boolean {
        return (
            this.state.status !== AgentStatus.IDLE &&
            this.state.status !== AgentStatus.COMPLETED &&
            this.state.status !== AgentStatus.ERROR
        );
    }
}

export default BaseAgent;
