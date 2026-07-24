/**
 * SliceLine Custom LLM WebSocket Handler for Retell AI
 *
 * Implements the Retell Custom LLM protocol:
 * - WebSocket endpoint that Retell connects to during calls
 * - Receives live transcript and responds via OpenAI GPT-4.1
 * - Uses our existing tool definitions for menu lookup, orders, etc.
 * - Streams responses back token-by-token for low latency
 */

const WebSocket = require('ws');
const OpenAI = require('openai');

// Retell protocol interaction types
const INTERACTION_UPDATE_ONLY = 'update_only';
const INTERACTION_RESPONSE_REQUIRED = 'response_required';
const INTERACTION_REMINDER_REQUIRED = 'reminder_required';

// System prompt for the pizza ordering agent
const SYSTEM_PROMPT = `You are SliceLine, the friendly AI ordering assistant for Demo Pizza. You take pizza orders over the phone with a warm, efficient, and helpful personality.

## Style Guidelines
- Be concise and conversational. Speak like you're on the phone with a friend ordering pizza.
- Keep responses short — under 3 sentences when possible.
- Don't repeat what the customer just said. Acknowledge and move forward.
- Use filler words occasionally to sound natural ("got it", "sure thing", "awesome").
- Be proactive — ask questions to move the order along.

## Call Flow
1. Greet warmly: "Hey, thanks for calling Demo Pizza! What can I get for you today?"
2. Determine their location early (which store / delivery address)
3. Take their order, using available tools to check the menu and stock
4. Calculate total and confirm the full order before placing it
5. Give order number and estimated time
6. Thank them and say goodbye

## Important Rules
- ALWAYS confirm the complete order with total price before placing it
- Use tools to look up the menu, check stock, and find locations — never guess prices or availability
- If a topping is out of stock, explain which pizzas are affected and offer alternatives
- Extra toppings cost extra; removing toppings does not reduce the price
- Delivery fee depends on distance — check location info
- Tax is 13% HST (Ontario)
- Be helpful with dietary restrictions and suggestions
- Payment is handled at pickup or delivery — never ask for payment info`;

// Simplified tool definitions for OpenAI function calling
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_menu',
      description: 'Get the full menu for a specific restaurant location.',
      parameters: {
        type: 'object',
        properties: {
          location_id: { type: 'string', description: 'The location ID' },
        },
        required: ['location_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_nearest_location',
      description: 'Find the nearest Demo Pizza location based on coordinates or address.',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number', description: 'Customer latitude' },
          longitude: { type: 'number', description: 'Customer longitude' },
          address: { type: 'string', description: 'Customer address' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_specials',
      description: 'Get current specials and promotions for a specific location.',
      parameters: {
        type: 'object',
        properties: {
          location_id: { type: 'string', description: 'The location ID' },
        },
        required: ['location_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_location_info',
      description: 'Get hours, delivery zones, fees, and open/closed status for a location.',
      parameters: {
        type: 'object',
        properties: {
          location_id: { type: 'string', description: 'The location ID' },
        },
        required: ['location_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_stock',
      description: 'Check if an item or topping is available at a location.',
      parameters: {
        type: 'object',
        properties: {
          location_id: { type: 'string', description: 'The location ID' },
          item_type: { type: 'string', enum: ['menu_item', 'topping'], description: 'Item or topping' },
          item_id: { type: 'string', description: 'Item or topping ID' },
          item_name: { type: 'string', description: 'Item name for fuzzy matching' },
        },
        required: ['location_id', 'item_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'place_order',
      description: 'Place an order. MUST confirm all details with customer first.',
      parameters: {
        type: 'object',
        properties: {
          location_id: { type: 'string', description: 'Location ID' },
          customer_name: { type: 'string', description: 'Customer name' },
          customer_phone: { type: 'string', description: 'Customer phone number' },
          order_type: { type: 'string', enum: ['pickup', 'delivery'], description: 'Pickup or delivery' },
          delivery_address: { type: 'string', description: 'Delivery address (required if delivery)' },
          items: {
            type: 'array',
            description: 'Order items',
            items: {
              type: 'object',
              properties: {
                menu_item_id: { type: 'string', description: 'Menu item ID' },
                name: { type: 'string', description: 'Item name' },
                size: { type: 'string', description: 'Size' },
                quantity: { type: 'integer', description: 'Quantity' },
                unit_price: { type: 'number', description: 'Price per unit' },
                special_requests: { type: 'string', description: 'Special requests' },
              },
              required: ['name', 'quantity', 'unit_price'],
            },
          },
          notes: { type: 'string', description: 'Order notes' },
        },
        required: ['location_id', 'customer_name', 'customer_phone', 'order_type', 'items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_customer',
      description: 'Look up a returning customer by phone number.',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'Customer phone number' },
        },
        required: ['phone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order_status',
      description: 'Check the status of an existing order by order number.',
      parameters: {
        type: 'object',
        properties: {
          order_number: { type: 'string', description: 'Order number (e.g. SL-123456)' },
        },
        required: ['order_number'],
      },
    },
  },
];

// Opening greeting
const BEGIN_SENTENCE = "Hey, thanks for calling Demo Pizza! What can I get started for you today?";

class SlicelineLLMClient {
  constructor(openaiApiKey) {
    this.openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
  }

  sendBeginMessage(ws) {
    const res = {
      response_id: 0,
      content: BEGIN_SENTENCE,
      content_complete: true,
      end_call: false,
    };
    ws.send(JSON.stringify(res));
  }

  transcriptToMessages(transcript) {
    const messages = [];
    for (const turn of transcript) {
      messages.push({
        role: turn.role === 'agent' ? 'assistant' : 'user',
        content: turn.content,
      });
    }
    return messages;
  }

  async executeToolCall(toolName, params) {
    try {
      const baseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:3000';
      const response = await fetch(`${baseUrl}/api/retell/tool-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_name: toolName, parameters: params }),
      });
      return await response.json();
    } catch (err) {
      console.error('[LLM] Tool call error:', err);
      return { error: 'Failed to execute tool call' };
    }
  }

  async draftResponse(request, ws) {
    if (request.interaction_type === INTERACTION_UPDATE_ONLY) {
      return;
    }

    if (!this.openai) {
      const res = {
        response_id: request.response_id,
        content: "I'm sorry, our ordering system is having trouble right now. Please call back in a few minutes.",
        content_complete: true,
        end_call: true,
      };
      ws.send(JSON.stringify(res));
      return;
    }

    const transcriptMessages = this.transcriptToMessages(request.transcript || []);
    let messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...transcriptMessages,
    ];

    if (request.interaction_type === INTERACTION_REMINDER_REQUIRED) {
      messages.push({
        role: 'user',
        content: '(The customer has been silent for a while. Gently prompt them.)',
      });
    }

    let maxToolRounds = 5;
    let currentResponseId = request.response_id;

    while (maxToolRounds-- > 0) {
      try {
        const stream = await this.openai.chat.completions.create({
          model: 'gpt-4.1',
          messages,
          tools: TOOLS,
          temperature: 0.3,
          max_tokens: 300,
        });

        const choice = stream.choices[0];

        if (choice.finish_reason === 'tool_calls') {
          messages.push(choice.message);
          for (const toolCall of choice.message.tool_calls) {
            let functionArgs;
            try {
              functionArgs = JSON.parse(toolCall.function.arguments);
            } catch (e) {
              functionArgs = {};
            }
            console.log('[LLM] Tool call:', toolCall.function.name, JSON.stringify(functionArgs).substring(0, 200));
            const result = await this.executeToolCall(toolCall.function.name, functionArgs);
            console.log('[LLM] Tool result:', JSON.stringify(result).substring(0, 200));
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });
          }
          continue;
        }

        // No tool calls - stream the response
        // Since we used non-streaming, just send the full content
        const content = choice.message.content || '';
        const res = {
          response_id: currentResponseId,
          content: content,
          content_complete: true,
          end_call: false,
        };
        try {
          ws.send(JSON.stringify(res));
        } catch (e) {
          // WebSocket closed
        }
        return;

      } catch (err) {
        console.error('[LLM] OpenAI error:', err.message);
        const fallbackRes = {
          response_id: currentResponseId,
          content: "I'm sorry, I'm having trouble right now. Can you repeat that?",
          content_complete: true,
          end_call: false,
        };
        try {
          ws.send(JSON.stringify(fallbackRes));
        } catch (e) {}
        return;
      }
    }

    // Max rounds reached
    const maxRoundsRes = {
      response_id: currentResponseId,
      content: "Let me confirm that with you — one moment please.",
      content_complete: true,
      end_call: false,
    };
    try {
      ws.send(JSON.stringify(maxRoundsRes));
    } catch (e) {}
  }
}

function setupLLMWebSocket(fastify) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.warn('[LLM] WARNING: No OPENAI_API_KEY set — WebSocket LLM will return fallback responses');
  }

  const llmClient = new SlicelineLLMClient(openaiApiKey);
  const wss = new WebSocket.Server({ noServer: true });

  fastify.server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

    if (pathname.startsWith('/api/retell/llm-websocket')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws, request) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const callId = url.pathname.split('/').pop();
    console.log('[LLM] WebSocket connected for call:', callId);

    llmClient.sendBeginMessage(ws);

    ws.on('message', async (data) => {
      try {
        const request = JSON.parse(data.toString());
        console.log('[LLM] Received:', request.interaction_type, 'transcript len:', request.transcript?.length || 0);

        if (request.interaction_type === INTERACTION_UPDATE_ONLY) {
          return;
        }

        await llmClient.draftResponse(request, ws);
      } catch (err) {
        console.error('[LLM] Error processing message:', err);
      }
    });

    ws.on('close', (code) => {
      console.log('[LLM] WebSocket closed for call', callId, 'code:', code);
    });

    ws.on('error', (err) => {
      console.error('[LLM] WebSocket error for call', callId, ':', err.message);
    });
  });

  console.log('[LLM] WebSocket server ready at /api/retell/llm-websocket/:call_id');
}

module.exports = { setupLLMWebSocket, SlicelineLLMClient };