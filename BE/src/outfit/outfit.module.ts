import { Module } from '@nestjs/common';
import { ProfileModule } from '../profile/profile.module';
import { WeatherModule } from '../weather/weather.module';
import { OutfitController } from './outfit.controller';
import { OutfitService } from './outfit.service';

@Module({
  imports: [ProfileModule, WeatherModule],
  controllers: [OutfitController],
  providers: [OutfitService],
})
export class OutfitModule {}
