import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository, Repository } from 'common/objection';
import { Registration, ApplicationStatus } from 'entities/registration.entity';
import { User } from 'entities/user.entity';
import { SendGridService, DefaultTemplate, DefaultFromEmail } from 'common/sendgrid';
import { Hackathon } from 'entities/hackathon.entity';

@Injectable()
export class RegistrationScheduler {
  private readonly logger = new Logger(RegistrationScheduler.name);

  constructor(
    @InjectRepository(Registration)
    private readonly registrationRepo: Repository<Registration>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Hackathon)
    private readonly hackathonRepo: Repository<Hackathon>,
    private readonly sendGridService: SendGridService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredRsvpDeadlines() {
    this.logger.log('Checking for expired RSVP deadlines...');
    
    const now = Date.now();

    // Find all accepted registrations past deadline without RSVP
    const expiredRegistrations = await Registration.query()
      .where('applicationStatus', ApplicationStatus.ACCEPTED)
      .where('rsvpDeadline', '<', now)
      .whereNull('rsvpAt');

    if (expiredRegistrations.length === 0) {
      this.logger.log('No expired registrations found');
      return;
    }

    this.logger.log(`Found ${expiredRegistrations.length} expired registrations`);

    // Update all to declined
    await Promise.all(
      expiredRegistrations.map(reg =>
        Registration.query()
          .where({ userId: reg.userId, hackathonId: reg.hackathonId })
          .patch({
            applicationStatus: ApplicationStatus.DECLINED,
          })
      )
    );

    if (
      process.env.RUNTIME_INSTANCE &&
      process.env.RUNTIME_INSTANCE === 'production'
    ) {
      await this.sendExpirationNotifications(expiredRegistrations);
    }

    this.logger.log(`Successfully expired ${expiredRegistrations.length} registrations`);
  }

  private async sendExpirationNotifications(registrations: Registration[]) {
    const activeHackathon = await this.hackathonRepo
      .findAll()
      .raw()
      .where('active', true)
      .first();

    if (!activeHackathon) return;

    const emails = await Promise.all(
      registrations.map(async (reg) => {
        const user = await this.userRepo.findOne(reg.userId).exec();
        if (!user) return null;
        
        const message = await this.sendGridService.populateTemplate(
          DefaultTemplate.participantExpired,
          {
            previewText: `Your RSVP for HackPSU ${activeHackathon.name} has expired`,
            firstName: user.firstName,
            hackathon: activeHackathon.name,
          },
        );

        return {
          from: DefaultFromEmail,
          to: user.email,
          subject: `Your HackPSU ${activeHackathon.name} RSVP has expired`,
          message,
        };
      })
    );

    const validEmails = emails.filter(Boolean);
    if (validEmails.length > 0) {
      await this.sendGridService.sendBatch(validEmails);
    }
  }
}