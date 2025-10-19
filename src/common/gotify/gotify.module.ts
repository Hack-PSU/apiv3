import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GotifyService } from './gotify.service';
import gotifyConfig from './gotify.config';

@Module({
  imports: [ConfigModule.forFeature(gotifyConfig)],
  providers: [GotifyService],
  exports: [GotifyService],
})
export class GotifyModule {}
