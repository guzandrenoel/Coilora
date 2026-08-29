import { Global, Module } from '@nestjs/common';

import { UserDatabaseClientFactory } from './user-database-client.factory.js';

@Global()
@Module({
  providers: [UserDatabaseClientFactory],
  exports: [UserDatabaseClientFactory],
})
export class DatabaseModule {}
