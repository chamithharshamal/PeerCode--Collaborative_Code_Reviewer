import { HfInference } from '@huggingface/inference';

export class HuggingFaceClient {
  private client: HfInference;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || '';
    this.baseUrl = process.env.HUGGINGFACE_API_URL || 'https://api-inference.huggingface.co';
    
    if (!this.apiKey) {
      console.warn('HUGGINGFACE_API_KEY not found in environment variables. AI features will be limited.');
    }

    this.client = new HfInference(this.apiKey);
  }

  getClient(): HfInference {
    return this.client;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getApiKey(): string {
    return this.apiKey;
  }
}

export const huggingFaceClient = new HuggingFaceClient();