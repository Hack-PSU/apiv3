import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository, Repository } from 'common/objection';
import { Finance } from 'entities/finance.entity';
import { SendGridService, DefaultTemplate, DefaultFromEmail } from 'common/sendgrid';

@Injectable()
export class FinanceScheduler {
  private readonly logger = new Logger(FinanceScheduler.name);

  constructor(
    @InjectRepository(Finance)
    private readonly financeRepo: Repository<Finance>,
    private readonly sendGridService: SendGridService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async sendReimbursementReminder() {
    /* Sends an email to finance team running every hour or so to check if createdAt is 4 days old */
    this.logger.log('Checking for reimbursement requests created 4 days ago...');

    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    
    // Find all reimbursement requests created 4 days ago
    const datedReimbursementRequests = await this.financeRepo.findAll()
      .byHackathon()
      .where('status', "PENDING")
      .where('createdAt', '>', fourDaysAgo)
      .where('reminderSent', false);

    if (datedReimbursementRequests.length === 0) {
      this.logger.log('No dated reimbursement requests found');
      return;
    }

    const ids = datedReimbursementRequests.map(r => r.id);
    await Finance.query()
        .whereIn('id', ids)
        .patch({ reminderSent: true });
    this.logger.log(`Found ${datedReimbursementRequests.length} dated reimbursement requests`);
    
    // Send an email to the finance team
    if (
        process.env.RUNTIME_INSTANCE
        && process.env.RUNTIME_INSTANCE === 'production') 
    {
      await this.sendReimbursementReminderEmail(datedReimbursementRequests);
    }
  }

  private async sendReimbursementReminderEmail(datedReimbursementRequests: Finance[]) {
    // Send an email to finance team, finance@hackpsu.org
    const message = await this.sendGridService.populateTemplate(
      DefaultTemplate.reimbursementReminder,
      {
        previewText: `${datedReimbursementRequests.length} reimbursement requests created 4 days ago`,
        count: datedReimbursementRequests.length,
      },
    );

    await this.sendGridService.send({
      from: DefaultFromEmail,
      to: "finance@hackpsu.org",
      subject: "Reimbursement Requests Reminder",
      message,
    });
  }
}
