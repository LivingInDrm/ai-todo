import { http, HttpResponse } from 'msw';

export const handlers = [
  // OpenAI Chat Completions (GPT-4o)
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      id: 'chatcmpl-mock',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4o',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: null,
          function_call: {
            name: 'process_tasks',
            arguments: JSON.stringify({
              operations: [
                {
                  action: 'add_todo',
                  payload: {
                    title: 'Mock Task from GPT',
                    due_ts: null,
                    note: ''
                  }
                }
              ]
            })
          }
        },
        finish_reason: 'function_call'
      }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150
      }
    });
  }),

  // OpenAI Whisper Transcription
  http.post('https://api.openai.com/v1/audio/transcriptions', () => {
    return HttpResponse.json({
      text: 'Mock transcribed text from audio'
    });
  }),

  // Supabase Auth
  http.post('*/auth/v1/signup', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
        created_at: new Date().toISOString()
      }
    });
  }),

  http.post('*/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com'
      }
    });
  }),

  // Supabase Realtime
  http.get('*/realtime/v1/websocket', () => {
    return new HttpResponse(null, { status: 101 });
  }),

  // Supabase Database
  http.get('*/rest/v1/tasks', () => {
    return HttpResponse.json([
      {
        id: 'remote-task-1',
        title: 'Remote Task 1',
        due_ts: null,
        status: 0,
        pending: false,
        created_ts: Date.now() - 86400000,
        updated_ts: Date.now() - 3600000,
        completed_ts: null,
        pinned: false,
        recurring: null,
        reminder_ts: null,
        list_id: null,
        note: '',
        user_id: 'mock-user-id'
      }
    ]);
  }),

  http.post('*/rest/v1/tasks', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...body,
      id: 'new-remote-task-id',
      user_id: 'mock-user-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { status: 201 });
  }),

  http.patch('*/rest/v1/tasks', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...body,
      updated_at: new Date().toISOString()
    });
  }),

  http.delete('*/rest/v1/tasks', () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

// Error handlers for testing error scenarios
export const errorHandlers = {
  openAIError: http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json(
      {
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded'
        }
      },
      { status: 429 }
    );
  }),

  whisperError: http.post('https://api.openai.com/v1/audio/transcriptions', () => {
    return HttpResponse.json(
      {
        error: {
          message: 'Invalid audio format',
          type: 'invalid_request_error',
          code: 'invalid_audio'
        }
      },
      { status: 400 }
    );
  }),

  supabaseAuthError: http.post('*/auth/v1/signup', () => {
    return HttpResponse.json(
      {
        error: 'User already registered',
        error_description: 'User with this email already exists'
      },
      { status: 400 }
    );
  }),

  supabaseNetworkError: http.get('*/rest/v1/tasks', () => {
    return HttpResponse.error();
  }),
};