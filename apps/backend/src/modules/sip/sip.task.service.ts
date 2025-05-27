import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SIPService } from './sip.service';

@Injectable()
export class SIPTaskService {
  private readonly logger = new Logger(SIPTaskService.name);

  constructor(private sipService: SIPService) {}

  // Run every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailySIPExecution() {
    this.logger.log('Starting daily SIP execution task');
    try {
      await this.sipService.executePendingSIPs();
      this.logger.log('Daily SIP execution completed successfully');
    } catch (error) {
      this.logger.error('Error during SIP execution', error);
    }
  }

  // You can add more schedule options if needed:
  // @Cron(CronExpression.EVERY_HOUR)
  // async handleHourlySIPCheck() {
  //   // For more frequent checks if needed
  // }
}
