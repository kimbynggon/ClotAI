import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, finalize } from 'rxjs';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      // tap()은 @Res() + res.redirect() 사용 시 Observable이 값 없이 complete되어 실행 안 됨
      // finalize()는 complete/error 모두에서 실행되므로 redirect 응답도 로그 기록 가능
      finalize(() => {
        const duration = Date.now() - start;
        const log = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms\n`;
        this.writeLog(log);
      }),
    );
  }

  private writeLog(log: string) {
    // Render/클라우드 환경에서도 볼 수 있도록 stdout으로도 출력
    process.stdout.write(log);

    // 로컬 파일 로그 (Render는 ephemeral storage라 재시작 시 삭제되므로 로컬 전용)
    if (process.env.NODE_ENV !== 'production') {
      const date = new Date().toISOString().slice(0, 10);
      // __dirname 기준: dist/common/interceptors → ../../.. → BE 루트/log
      const logDir = path.resolve(__dirname, '../../../log');
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      fs.appendFileSync(path.join(logDir, `${date}.log`), log);
    }
  }
}
