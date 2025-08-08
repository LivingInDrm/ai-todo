import * as FileSystem from 'expo-file-system';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';
const CHAT_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface TaskOperation {
  action: 'add_todo' | 'update_todo' | 'complete_todo' | 'delete_todo';
  payload: {
    title: string;
    due_ts?: number;
    urgent?: boolean;
    id?: string;
  };
}

class OpenAIService {
  private apiKey: string;

  constructor() {
    this.apiKey = OPENAI_API_KEY;
    // In test environment, use a test key
    if (process.env.NODE_ENV === 'test' && !this.apiKey) {
      this.apiKey = 'test-api-key';
    }
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured');
    }
  }

  async transcribeAudio(audioUri: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // Read the audio file
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('model', 'whisper-1');
      formData.append('language', 'zh');

      // Send to Whisper API
      const response = await fetch(WHISPER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          const message = errorData.error?.message || 'Unknown error';
          throw new Error(message);
        } catch (parseError) {
          const error = await response.text();
          throw new Error(`Whisper API error: ${error}`);
        }
      }

      const result = await response.json();
      return result.text || '';
    } catch (error) {
      console.error('Failed to transcribe audio:', error);
      throw error;
    }
  }

  async parseTaskOperations(text: string): Promise<TaskOperation[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const functions = [
      {
        name: 'process_tasks',
        description: 'Process task operations from user input',
        parameters: {
          type: 'object',
          properties: {
            operations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: {
                    type: 'string',
                    enum: ['add_todo', 'update_todo', 'complete_todo', 'delete_todo'],
                    description: 'The action to perform'
                  },
                  payload: {
                    type: 'object',
                    properties: {
                      title: {
                        type: 'string',
                        description: 'Task title'
                      },
                      due_ts: {
                        type: 'number',
                        description: 'Due timestamp in milliseconds'
                      },
                      urgent: {
                        type: 'boolean',
                        description: 'Whether the task is urgent'
                      },
                      id: {
                        type: 'string',
                        description: 'Task ID for update/complete/delete operations'
                      }
                    },
                    required: ['title']
                  }
                },
                required: ['action', 'payload']
              }
            }
          },
          required: ['operations']
        }
      }
    ];

    const systemPrompt = `You are a task management assistant. Parse the user's input and extract task operations.
    
Rules:
1. Extract all mentioned tasks and their details
2. Recognize time expressions and convert to timestamps
3. Identify urgent/important tasks
4. For "complete" or "done" mentions, use complete_todo action
5. For deletion requests, use delete_todo action
6. Default to add_todo for new tasks
7. Current time: ${new Date().toISOString()}

Time parsing examples:
- "明天" -> tomorrow at 9:00
- "今晚" -> today at 20:00
- "下午3点" -> today/tomorrow at 15:00
- "周末" -> next Saturday at 9:00`;

    try {
      const response = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          functions,
          function_call: { name: 'process_tasks' },
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GPT API error: ${error}`);
      }

      const result = await response.json();
      const functionCall = result.choices[0]?.message?.function_call;
      
      if (!functionCall || !functionCall.arguments) {
        return [];
      }

      const args = JSON.parse(functionCall.arguments);
      return args.operations || [];
    } catch (error) {
      console.error('Failed to parse task operations:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export default new OpenAIService();