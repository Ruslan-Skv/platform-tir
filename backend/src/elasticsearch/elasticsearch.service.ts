import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, ClientOptions } from '@elastic/elasticsearch';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client;

  constructor(private configService: ConfigService) {
    const node = this.configService.get<string>('ELASTICSEARCH_NODE') || 'http://localhost:9200';
    const username = this.configService.get<string>('ELASTICSEARCH_USERNAME');
    const password = this.configService.get<string>('ELASTICSEARCH_PASSWORD');

    const clientOptions: ClientOptions = {
      node,
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
      this.logger.log(`Elasticsearch connected: ${health.status}`);
    } catch (error) {
      this.logger.error('Failed to connect to Elasticsearch', error);
    }
  }

  getClient(): Client {
    return this.client;
  }

  async indexExists(index: string): Promise<boolean> {
    try {
      return await this.client.indices.exists({ index });
    } catch (error) {
      this.logger.error(`Error checking index existence: ${index}`, error);
      return false;
    }
  }

  async createIndex(index: string, body?: any): Promise<void> {
    try {
      const exists = await this.indexExists(index);
      if (!exists) {
        await this.client.indices.create({
          index,
          body: body || {},
        });
        this.logger.log(`Index created: ${index}`);
      }
    } catch (error) {
      this.logger.error(`Error creating index: ${index}`, error);
      throw error;
    }
  }

  async indexDocument(index: string, id: string, document: any): Promise<void> {
    try {
      await this.client.index({
        index,
        id,
        document,
      });
    } catch (error) {
      this.logger.error(`Error indexing document: ${index}/${id}`, error);
      throw error;
    }
  }

  async search(index: string, query: any): Promise<any> {
    try {
      const result = await this.client.search({
        index,
        body: query,
      });
      return result;
    } catch (error) {
      this.logger.error(`Error searching: ${index}`, error);
      throw error;
    }
  }

  async deleteDocument(index: string, id: string): Promise<void> {
    try {
      await this.client.delete({
        index,
        id,
      });
    } catch (error) {
      this.logger.error(`Error deleting document: ${index}/${id}`, error);
      throw error;
    }
  }

  async bulk(operations: any[]): Promise<any> {
    try {
      const result = await this.client.bulk({
        body: operations,
      });
      return result;
    } catch (error) {
      this.logger.error('Error in bulk operation', error);
      throw error;
    }
  }
}
