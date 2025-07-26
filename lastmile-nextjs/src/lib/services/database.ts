/**
 * Database connection service for Next.js with MongoDB
 */

import mongoose from 'mongoose';
import { env } from '@/lib/config/env';

interface DatabaseConnection {
  isConnected: boolean;
  connection?: typeof mongoose;
}

class DatabaseService {
  private static instance: DatabaseService;
  private connection: DatabaseConnection = { isConnected: false };

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async connect(): Promise<typeof mongoose> {
    // If already connected, return existing connection
    if (this.connection.isConnected && this.connection.connection) {
      return this.connection.connection;
    }

    try {
      // Configure mongoose for Next.js
      mongoose.set('strictQuery', true);
      
      // Connection options optimized for serverless
      const options = {
        bufferCommands: false, // Disable mongoose buffering
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4, // Use IPv4, skip trying IPv6
        // Optimize for serverless
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
        heartbeatFrequencyMS: 10000, // Send a ping every 10 seconds
      };

      console.log('🔄 Connecting to MongoDB...');
      
      const connection = await mongoose.connect(env.MONGODB_URI, options);
      
      this.connection = {
        isConnected: true,
        connection
      };

      console.log('✅ MongoDB connected successfully');
      
      // Handle connection events
      mongoose.connection.on('connected', () => {
        console.log('📡 MongoDB connection established');
      });

      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
        this.connection.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('📴 MongoDB disconnected');
        this.connection.isConnected = false;
      });

      // Handle process termination
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      return connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      this.connection.isConnected = false;
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connection.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.connection = { isConnected: false };
      console.log('📴 MongoDB disconnected successfully');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connection.isConnected && mongoose.connection.readyState === 1;
  }

  getConnection(): typeof mongoose | null {
    return this.connection.isConnected ? this.connection.connection || null : null;
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      connected: boolean;
      readyState: number;
      host?: string;
      name?: string;
    };
  }> {
    try {
      const isHealthy = this.isConnected();
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          connected: this.connection.isConnected,
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          name: mongoose.connection.name
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          readyState: mongoose.connection.readyState
        }
      };
    }
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.isConnected()) {
        return false;
      }
      
      // Simple ping to check if database is responsive
      await mongoose.connection.db?.admin().ping();
      return true;
    } catch (error) {
      console.error('Database ping failed:', error);
      return false;
    }
  }

  // Get database statistics
  async getStats(): Promise<{
    collections: number;
    indexes: number;
    dataSize: number;
    storageSize: number;
  } | null> {
    try {
      if (!this.isConnected()) {
        return null;
      }

      const stats = await mongoose.connection.db?.stats();
      
      return {
        collections: stats?.collections || 0,
        indexes: stats?.indexes || 0,
        dataSize: stats?.dataSize || 0,
        storageSize: stats?.storageSize || 0
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return null;
    }
  }

  // Utility method for transactions
  async withTransaction<T>(
    operation: (session: mongoose.ClientSession) => Promise<T>
  ): Promise<T> {
    if (!this.isConnected()) {
      throw new Error('Database not connected');
    }

    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      const result = await operation(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  // Utility method for retrying operations
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          break;
        }

        console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, lastError.message);
        
        // Exponential backoff
        const backoffDelay = delay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        
        // Try to reconnect if connection was lost
        if (!this.isConnected()) {
          try {
            await this.connect();
          } catch (reconnectError) {
            console.error('Failed to reconnect:', reconnectError);
          }
        }
      }
    }

    throw lastError!;
  }
}

// Export singleton instance
export const dbService = DatabaseService.getInstance();

// Helper function for API routes
export async function connectToDatabase(): Promise<typeof mongoose> {
  return await dbService.connect();
}

// Helper function to ensure database connection in API routes
export async function withDatabase<T>(
  operation: () => Promise<T>
): Promise<T> {
  await connectToDatabase();
  return await operation();
}

// Export types for use in other modules
export type { DatabaseConnection };