import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, ClientOptions } from '@elastic/elasticsearch';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client;
  private isConnected = false;

  constructor(private configService: ConfigService) {
    const node = this.configService.get<string>('ELASTICSEARCH_NODE') || 'http://localhost:9200';
    const username = this.configService.get<string>('ELASTICSEARCH_USERNAME');
    const password = this.configService.get<string>('ELASTICSEARCH_PASSWORD');

    const clientOptions: ClientOptions = {
      node,
      requestTimeout: 5000, // 5 second timeout
      maxRetries: 1,
    };

    if (username && password) {
      clientOptions.auth = {
        username,
        password,
      };
    }

    this.client = new Client(clientOptions);
  }

  async onModuleInit() {
    try {
      const health = await this.client.cluster.health();
      this.isConnected = true;
      this.logger.log(`Elasticsearch connected: ${health.status}`);
    } catch (error) {
      this.isConnected = false;
      this.logger.warn('Elasticsearch is not available. Search functionality will be limited.');
    }
  }

  isAvailable(): boolean {
    return this.isConnected;
  }

  getClient(): Client {
    return this.client;
  }

  async indexExists(index: string): Promise<boolean> {
    if (!this.isConnected) return false;
    try {
      return await this.client.indices.exists({ index });
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createIndex(index: string, body?: any): Promise<void> {
    if (!this.isConnected) return;
    try {
      const exists = await this.indexExists(index);
      if (!exists && this.isConnected) {
        await this.client.indices.create({
          index,
          body: body || {},
        });
        this.logger.log(`Index created: ${index}`);
      }
    } catch (error) {
      this.isConnected = false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async indexDocument(index: string, id: string, document: any): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.index({
        index,
        id,
        document,
      });
    } catch (error) {
      this.isConnected = false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async search(index: string, query: any): Promise<any> {
    if (!this.isConnected) {
      return { body: { hits: { hits: [], total: { value: 0 } } } };
    }
    try {
      const result = await this.client.search({
        index,
        body: query,
      });
      return result;
    } catch (error) {
      this.isConnected = false;
      return { body: { hits: { hits: [], total: { value: 0 } } } };
    }
  }

  async deleteDocument(index: string, id: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.delete({
        index,
        id,
      });
    } catch (error) {
      this.isConnected = false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async bulk(operations: any[]): Promise<any> {
    if (!this.isConnected) return { body: { items: [] } };
    try {
      const result = await this.client.bulk({
        body: operations,
      });
      return result;
    } catch (error) {
      this.isConnected = false;
      return { body: { items: [] } };
    }
  }
}
