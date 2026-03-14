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
        Registration.query().knex()
          .table('registrations')
          .where('user_id', reg.userId)
          .where('hackathon_id', reg.hackathonId)
          .update({
            application_status: ApplicationStatus.DECLINED,
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
            firstName: "",
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

  @Cron(CronExpression.EVERY_HOUR)
  async handleRsvpReminders() {
    this.logger.log('Checking for upcoming RSVP deadlines...');
    const now = Date.now();
    const oneDaysFromNow = now + 24 * 60 * 60 * 1000;
    this.logger.log('One day from now: ' + oneDaysFromNow);

    const threeDayRegistrations = await Registration.query()
      .where('applicationStatus', ApplicationStatus.ACCEPTED)
      .where('rsvpDeadline', '>', now)
      .where('rsvpDeadline', '<=', now + 3 * 24 * 60 * 60 * 1000)
      .where('threeDayReminderSent', false);

    const oneDayRegistrations = await Registration.query()
      .where('applicationStatus', ApplicationStatus.ACCEPTED)
      .where('rsvpDeadline', '>', now)
      .where('rsvpDeadline', '<=', now + 24 * 60 * 60 * 1000)
      .where('threeDayReminderSent', true)
      .where('oneDayReminderSent', false);

    this.logger.log(`Found ${threeDayRegistrations.length} registrations with RSVP deadlines in 3 days`);
    this.logger.log(`Found ${oneDayRegistrations.length} registrations with RSVP deadlines in 1 day`);

    await Promise.all(
      threeDayRegistrations.map(reg =>
        Registration.query().knex()
          .table('registrations')
          .where('user_id', reg.userId)
          .where('hackathon_id', reg.hackathonId)
          .update({ three_day_reminder_sent: true })
      )
    );

    await Promise.all(
      oneDayRegistrations.map(reg =>
        Registration.query().knex()
          .table('registrations')
          .where('user_id', reg.userId)
          .where('hackathon_id', reg.hackathonId)
          .update({ one_day_reminder_sent: true })
      )
    );

    if(
      process.env.RUNTIME_INSTANCE &&
      process.env.RUNTIME_INSTANCE === 'production'
    ) {
      await this.sendRsvpReminders(threeDayRegistrations, 'threeDay');
      await this.sendRsvpReminders(oneDayRegistrations, 'oneDay');
    }
  }

  private async sendRsvpReminders(registrations: Registration[], type: 'threeDay' | 'oneDay') {
    const activeHackathon = await this.hackathonRepo
      .findAll()
      .raw()
      .where('active', true)
      .first();
    const emails = await Promise.all(
      registrations.map(async (reg) => {
        const user = await this.userRepo.findOne(reg.userId).exec();
        if (!user) return null;
      
        const message = await this.sendGridService.populateTemplate(
          DefaultTemplate.participantReminder,
          {
            previewText: `Reminder: Your RSVP for HackPSU ${activeHackathon.name} is due soon`,
            firstName: "",
            hackathon: activeHackathon.name,
            daysLeft: type === 'threeDay' ? "3 days" : "1 day",
            date: "March 28-29, 2026",
            address: "ECore Building, University Park PA",
          },
        );

        return {
          from: DefaultFromEmail,
          to: user.email,
          subject: `Reminder: Your HackPSU ${activeHackathon.name} RSVP is due soon`,
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