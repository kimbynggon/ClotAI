import {
  Controller, Get, Post, Body, UseGuards, UploadedFile,
  UseInterceptors, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { ProfileService } from './profile.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@ApiTags('Profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: '내 프로필 조회' })
  async getProfile(@CurrentUser() user: User) {
    const data = await this.profileService.findOne(user.id);
    return { success: true, message: '', data };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '프로필 등록 / 수정 (upsert)' })
  async upsertProfile(@CurrentUser() user: User, @Body() dto: UpsertProfileDto) {
    const data = await this.profileService.upsert(user.id, dto);
    return { success: true, message: '프로필이 저장되었습니다.', data };
  }

  @Post('image')
  @ApiOperation({ summary: '프로필 이미지 업로드 (최대 5MB, jpeg/png/webp)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/profile',
        filename: (_, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadImage(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const imageUrl = `/uploads/profile/${file.filename}`;
    const data = await this.profileService.updateImage(user.id, imageUrl);
    return { success: true, message: '이미지가 업로드되었습니다.', data: { profileImageUrl: data.profileImageUrl } };
  }
}
