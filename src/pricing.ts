/**
 * Pricing Module
 * Token pricing calculations for LLM providers
 *
 * Pricing is defined as dollars per 1 million tokens.
 * 1 credit = 1 dollar
 *
 * To add a new model, add an entry to MODEL_PRICING with:
 * - input: cost per 1M input (prompt) tokens in dollars
 * - cachedInput: cost per 1M cached input tokens in dollars (optional, null if not supported)
 * - output: cost per 1M output (completion) tokens in dollars
 */

import { logger } from './log.js';

// ============================================================================
// PRICING MARKUP
// ============================================================================

/**
 * Pricing markup multiplier for profit margin
 * 1.0 = cost price (no profit)
 * 1.2 = 20% markup
 * 1.5 = 50% markup (recommended)
 * 2.0 = 100% markup
 */
export const PRICING_ALPHA = 1.5;

// ============================================================================
// TYPES
// ============================================================================

export interface ModelPricing {
    input: number;         // USD per 1M input tokens
    output: number;        // USD per 1M output tokens
    cachedInput?: number | null;  // USD per 1M cached input tokens (null if not supported)
}

/** Legacy format for backward compatibility */
export interface ModelPricingLegacy {
    inputPer1kTokens: number;  // USD per 1K input tokens
    outputPer1kTokens: number; // USD per 1K output tokens
    cachedInputPer1kTokens?: number; // USD per 1K cached input tokens
}

export interface EmbeddingPricing {
    per1kTokens: number; // USD per 1K tokens
}

export interface UsageCost {
    inputCost: number;
    outputCost: number;
    cachedInputCost: number;
    totalCost: number;
    currency: 'USD';
}

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens?: number;
}

// ============================================================================
// PRICING DATA (per 1 million tokens, in USD)
// Updated: January 2025
// ============================================================================

export const MODEL_PRICING: Record<string, ModelPricing> = {
    // Default model pricing (fallback for unknown models)
    'default': { input: 0.075, cachedInput: 0.01875, output: 0.30 },

    // OpenAI Models - GPT-5 Series
    'gpt-5.2': { input: 0.875, cachedInput: 0.0875, output: 7.00 },
    'gpt-5.2-chat-latest': { input: 0.875, cachedInput: 0.0875, output: 7.00 },
    'gpt-5.1': { input: 0.625, cachedInput: 0.0625, output: 5.00 },
    'gpt-5.1-chat-latest': { input: 0.625, cachedInput: 0.0625, output: 5.00 },
    'gpt-5': { input: 0.625, cachedInput: 0.0625, output: 5.00 },
    'gpt-5-mini': { input: 0.125, cachedInput: 0.0125, output: 1.00 },
    'gpt-5-nano': { input: 0.025, cachedInput: 0.0025, output: 0.20 },

    // OpenAI Models - GPT-4.1 Series
    'gpt-4.1': { input: 1.00, cachedInput: 0.25, output: 4.00 },
    'gpt-4.1-mini': { input: 0.20, cachedInput: 0.05, output: 0.80 },
    'gpt-4.1-nano': { input: 0.05, cachedInput: 0.0125, output: 0.20 },

    // OpenAI Models - GPT-4o Series
    'gpt-4o': { input: 1.25, cachedInput: 0.3125, output: 5.00 },
    'gpt-4o-mini': { input: 0.075, cachedInput: 0.01875, output: 0.30 },

    // OpenAI Models - o-Series (Reasoning)
    'o1': { input: 7.50, cachedInput: 1.875, output: 30.00 },
    'o1-mini': { input: 0.55, cachedInput: 0.1375, output: 2.20 },
    'o3': { input: 1.00, cachedInput: 0.25, output: 4.00 },
    'o3-pro': { input: 10.00, cachedInput: null, output: 40.00 },
    'o3-mini': { input: 0.55, cachedInput: 0.1375, output: 2.20 },
    'o4-mini': { input: 0.55, cachedInput: 0.1375, output: 2.20 },

    // OpenAI Legacy Models
    'gpt-4-turbo': { input: 10.00, cachedInput: null, output: 30.00 },
    'gpt-4': { input: 30.00, cachedInput: null, output: 60.00 },
    'gpt-3.5-turbo': { input: 0.50, cachedInput: null, output: 1.50 },

    // Anthropic Claude Models
    'claude-opus-4-20250514': { input: 15.00, cachedInput: 1.875, output: 75.00 },
    'claude-sonnet-4-20250514': { input: 3.00, cachedInput: 0.375, output: 15.00 },
    'claude-3-5-sonnet-20241022': { input: 3.00, cachedInput: 0.375, output: 15.00 },
    'claude-3-5-haiku-20241022': { input: 0.80, cachedInput: 0.10, output: 4.00 },
    'claude-3-opus-20240229': { input: 15.00, cachedInput: 1.875, output: 75.00 },
    'claude-3-sonnet-20240229': { input: 3.00, cachedInput: null, output: 15.00 },
    'claude-3-haiku-20240307': { input: 0.25, cachedInput: 0.03, output: 1.25 },

    // xAI Grok Models
    'grok-4-1-fast-reasoning': { input: 0.20, cachedInput: 0.05, output: 0.50 },
    'grok-4-1-fast-non-reasoning': { input: 0.20, cachedInput: 0.05, output: 0.50 },
    'grok-4-fast-reasoning': { input: 0.20, cachedInput: 0.05, output: 0.50 },
    'grok-4-fast-non-reasoning': { input: 0.20, cachedInput: 0.05, output: 0.50 },
    'grok-4-0709': { input: 3.00, cachedInput: 0.75, output: 15.00 },
    'grok-3-mini': { input: 0.30, cachedInput: 0.075, output: 0.50 },
    'grok-3': { input: 3.00, cachedInput: 0.75, output: 15.00 },

    // Google Gemini Models
    'gemini-3-flash-preview': { input: 0.50, cachedInput: 0.05, output: 3.00 },
    'gemini-2.0-flash': { input: 0.30, cachedInput: 0.03, output: 2.50 },
    'gemini-2.0-flash-lite': { input: 0.10, cachedInput: 0.01, output: 0.40 },
    'gemini-1.5-pro': { input: 1.25, cachedInput: 0.125, output: 5.00 },
    'gemini-1.5-flash': { input: 0.075, cachedInput: 0.0075, output: 0.30 },

    // DeepSeek Models
    'deepseek-chat': { input: 0.14, cachedInput: 0.014, output: 0.28 },
    'deepseek-reasoner': { input: 0.55, cachedInput: 0.055, output: 2.19 },
};

/** Legacy format alias (per 1K tokens) - for backward compatibility */
export const LLMPricing: Record<string, ModelPricingLegacy> = Object.fromEntries(
    Object.entries(MODEL_PRICING).map(([model, pricing]) => [
        model,
        {
            inputPer1kTokens: pricing.input / 1000,
            outputPer1kTokens: pricing.output / 1000,
            cachedInputPer1kTokens: pricing.cachedInput ? pricing.cachedInput / 1000 : undefined,
        },
    ])
);

export const EmbeddingPricingData: Record<string, EmbeddingPricing> = {
    // OpenAI
    'text-embedding-3-small': { per1kTokens: 0.00002 },
    'text-embedding-3-large': { per1kTokens: 0.00013 },
    'text-embedding-ada-002': { per1kTokens: 0.0001 },

    // Google
    'text-embedding-004': { per1kTokens: 0.000025 },

    // Voyage AI
    'voyage-large-2': { per1kTokens: 0.00012 },
    'voyage-code-2': { per1kTokens: 0.00012 },

    // Cohere
    'embed-english-v3.0': { per1kTokens: 0.0001 },
    'embed-multilingual-v3.0': { per1kTokens: 0.0001 },
};

// ============================================================================
// PRICING LOOKUP
// ============================================================================

/**
 * Get the pricing for a specific model (with PRICING_ALPHA markup applied)
 *
 * @param model - The model name (e.g., "gpt-4o", "claude-3-5-sonnet-20241022")
 * @returns Tuple of [inputPricePer1M, cachedInputPricePer1M | null, outputPricePer1M] in dollars
 *          All prices include the PRICING_ALPHA markup.
 */
export function getModelPricing(model: string): [number, number | null, number] {
    const applyAlpha = (pricing: ModelPricing): [number, number | null, number] => {
        const inputPrice = pricing.input * PRICING_ALPHA;
        const cachedPrice = pricing.cachedInput != null ? pricing.cachedInput * PRICING_ALPHA : null;
        const outputPrice = pricing.output * PRICING_ALPHA;
        return [inputPrice, cachedPrice, outputPrice];
    };

    // Exact match
    if (model in MODEL_PRICING) {
        return applyAlpha(MODEL_PRICING[model]);
    }

    // Allow versioned models to match base models
    // e.g., "gpt-5-mini-2025-01-01" matches "gpt-5-mini"
    for (const modelKey of Object.keys(MODEL_PRICING)) {
        if (model.startsWith(modelKey + '-') || model.startsWith(modelKey)) {
            logger.debug(`Using pricing for ${modelKey} (matched from ${model})`);
            return applyAlpha(MODEL_PRICING[modelKey]);
        }
    }

    logger.warn(`Model '${model}' not found in MODEL_PRICING; using default pricing.`);
    return applyAlpha(MODEL_PRICING['default']);
}

// ============================================================================
// COST CALCULATION
// ============================================================================

/**
 * Calculate the cost in dollars (credits) for a given usage.
 * Note: Price includes PRICING_ALPHA markup for profit margin.
 *
 * @param model - The model name
 * @param promptTokens - Number of input/prompt tokens (non-cached)
 * @param completionTokens - Number of output/completion tokens
 * @param cachedTokens - Number of cached input tokens (default 0)
 * @returns Cost in dollars (1 dollar = 1 credit)
 */
export function calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number,
    cachedTokens: number = 0
): number {
    const [inputPricePer1M, cachedInputPricePer1M, outputPricePer1M] = getModelPricing(model);

    const inputCost = (promptTokens / 1_000_000) * inputPricePer1M;
    const outputCost = (completionTokens / 1_000_000) * outputPricePer1M;

    let cachedCost = 0;
    if (cachedTokens > 0) {
        const cachedPrice = cachedInputPricePer1M ?? inputPricePer1M;
        cachedCost = (cachedTokens / 1_000_000) * cachedPrice;
    }

    const totalCost = inputCost + cachedCost + outputCost;

    logger.debug(
        `Cost calculation for ${model}: ${promptTokens} input ($${inputCost.toFixed(6)}) + ` +
        `${cachedTokens} cached ($${cachedCost.toFixed(6)}) + ` +
        `${completionTokens} output ($${outputCost.toFixed(6)}) = $${totalCost.toFixed(6)}`
    );

    return totalCost;
}

/**
 * Calculate cost for LLM usage (legacy interface)
 */
export function calculateLLMCost(
    model: string,
    usage: TokenUsage
): UsageCost {
    const [inputPricePer1M, cachedInputPricePer1M, outputPricePer1M] = getModelPricing(model);

    const inputCost = (usage.inputTokens / 1_000_000) * inputPricePer1M;
    const outputCost = (usage.outputTokens / 1_000_000) * outputPricePer1M;

    let cachedInputCost = 0;
    if (usage.cachedInputTokens && usage.cachedInputTokens > 0) {
        const cachedPrice = cachedInputPricePer1M ?? inputPricePer1M;
        cachedInputCost = (usage.cachedInputTokens / 1_000_000) * cachedPrice;
    }

    return {
        inputCost,
        outputCost,
        cachedInputCost,
        totalCost: inputCost + outputCost + cachedInputCost,
        currency: 'USD',
    };
}

/**
 * Calculate cost for embedding usage
 */
export function calculateEmbeddingCost(
    model: string,
    tokens: number
): { cost: number; currency: 'USD' } {
    const pricing = EmbeddingPricingData[model];

    if (!pricing) {
        return { cost: 0, currency: 'USD' };
    }

    return {
        cost: (tokens / 1000) * pricing.per1kTokens,
        currency: 'USD',
    };
}

// ============================================================================
// USAGE TRACKER
// ============================================================================

export interface UsageRecord {
    timestamp: Date;
    model: string;
    type: 'llm' | 'embedding';
    usage: TokenUsage | { tokens: number };
    cost: number;
    metadata?: Record<string, unknown>;
}

export class UsageTracker {
    private records: UsageRecord[] = [];
    private budget?: number;

    constructor(budget?: number) {
        this.budget = budget;
    }

    /**
     * Record LLM usage
     */
    recordLLMUsage(
        model: string,
        usage: TokenUsage,
        metadata?: Record<string, unknown>
    ): UsageCost {
        const cost = calculateLLMCost(model, usage);

        this.records.push({
            timestamp: new Date(),
            model,
            type: 'llm',
            usage,
            cost: cost.totalCost,
            metadata,
        });

        return cost;
    }

    /**
     * Record embedding usage
     */
    recordEmbeddingUsage(
        model: string,
        tokens: number,
        metadata?: Record<string, unknown>
    ): { cost: number; currency: 'USD' } {
        const result = calculateEmbeddingCost(model, tokens);

        this.records.push({
            timestamp: new Date(),
            model,
            type: 'embedding',
            usage: { tokens },
            cost: result.cost,
            metadata,
        });

        return result;
    }

    /**
     * Get total cost
     */
    getTotalCost(): number {
        return this.records.reduce((sum, record) => sum + record.cost, 0);
    }

    /**
     * Get cost by model
     */
    getCostByModel(): Record<string, number> {
        const result: Record<string, number> = {};

        for (const record of this.records) {
            result[record.model] = (result[record.model] || 0) + record.cost;
        }

        return result;
    }

    /**
     * Get cost for a time period
     */
    getCostForPeriod(startDate: Date, endDate: Date): number {
        return this.records
            .filter(r => r.timestamp >= startDate && r.timestamp <= endDate)
            .reduce((sum, record) => sum + record.cost, 0);
    }

    /**
     * Check if budget is exceeded
     */
    isBudgetExceeded(): boolean {
        if (!this.budget) return false;
        return this.getTotalCost() >= this.budget;
    }

    /**
     * Get remaining budget
     */
    getRemainingBudget(): number | null {
        if (!this.budget) return null;
        return Math.max(0, this.budget - this.getTotalCost());
    }

    /**
     * Get usage summary
     */
    getSummary(): {
        totalCost: number;
        totalRecords: number;
        costByModel: Record<string, number>;
        costByType: { llm: number; embedding: number };
        budget?: number;
        remainingBudget?: number;
    } {
        const costByType = { llm: 0, embedding: 0 };

        for (const record of this.records) {
            costByType[record.type] += record.cost;
        }

        return {
            totalCost: this.getTotalCost(),
            totalRecords: this.records.length,
            costByModel: this.getCostByModel(),
            costByType,
            budget: this.budget,
            remainingBudget: this.getRemainingBudget() ?? undefined,
        };
    }

    /**
     * Clear all records
     */
    clear(): void {
        this.records = [];
    }

    /**
     * Get all records
     */
    getRecords(): UsageRecord[] {
        return [...this.records];
    }

    /**
     * Set budget
     */
    setBudget(budget: number): void {
        this.budget = budget;
    }
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format cost as currency string
 */
export function formatCost(cost: number, decimals: number = 6): string {
    return `$${cost.toFixed(decimals)}`;
}

/**
 * Format usage summary as string
 */
export function formatUsageSummary(tracker: UsageTracker): string {
    const summary = tracker.getSummary();
    const lines: string[] = [];

    lines.push(`Total Cost: ${formatCost(summary.totalCost)}`);
    lines.push(`Total Records: ${summary.totalRecords}`);
    lines.push('');
    lines.push('Cost by Type:');
    lines.push(`  LLM: ${formatCost(summary.costByType.llm)}`);
    lines.push(`  Embedding: ${formatCost(summary.costByType.embedding)}`);
    lines.push('');
    lines.push('Cost by Model:');

    for (const [model, cost] of Object.entries(summary.costByModel)) {
        lines.push(`  ${model}: ${formatCost(cost)}`);
    }

    if (summary.budget) {
        lines.push('');
        lines.push(`Budget: ${formatCost(summary.budget, 2)}`);
        lines.push(`Remaining: ${formatCost(summary.remainingBudget!, 2)}`);
    }

    return lines.join('\n');
}

// ============================================================================
// DEFAULT INSTANCE
// ============================================================================

let defaultTracker: UsageTracker | null = null;

/**
 * Get or create the default usage tracker
 */
export function getDefaultUsageTracker(): UsageTracker {
    if (!defaultTracker) {
        defaultTracker = new UsageTracker();
    }
    return defaultTracker;
}

/**
 * Set the default usage tracker
 */
export function setDefaultUsageTracker(tracker: UsageTracker): void {
    defaultTracker = tracker;
}
