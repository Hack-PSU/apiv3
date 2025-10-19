import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Hackathon } from '../../entities/hackathon.entity';

export interface GotifyMessage {
  title: string;
  message: string;
  priority?: number; // 0-10, default is 5
  extras?: Record<string, any>;
}

@Injectable()
export class GotifyService {
  private readonly logger = new Logger(GotifyService.name);
  private readonly gotifyUrl: string;
  private readonly gotifyToken: string;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    this.gotifyUrl = this.configService.get<string>('gotify.url');
    this.gotifyToken = this.configService.get<string>('gotify.token');
    this.enabled = this.configService.get<boolean>('gotify.enabled');

    // Check if required configuration is present
    if (this.enabled && (!this.gotifyUrl || !this.gotifyToken)) {
      this.logger.warn(
        'Gotify is enabled (production) but GOTIFY_URL or GOTIFY_TOKEN is missing - notifications will be skipped',
      );
      // Disable if config is missing to prevent errors
      (this.enabled as any) = false;
    } else if (this.enabled) {
      this.logger.log(
        `Gotify notifications enabled for production instance: ${this.gotifyUrl}`,
      );
    } else {
      this.logger.log(
        `Gotify notifications disabled (RUNTIME_INSTANCE: ${this.configService.get('RUNTIME_INSTANCE')})`,
      );
    }
  }

  async sendNotification(payload: GotifyMessage): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(
        `Skipping Gotify notification (not production): ${payload.title}`,
      );
      return;
    }

    if (!this.gotifyUrl || !this.gotifyToken) {
      this.logger.error(
        'Gotify URL or token not configured in environment variables',
      );
      return;
    }

    try {
      const url = `${this.gotifyUrl}/message?token=${this.gotifyToken}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: payload.title,
          message: payload.message,
          priority: payload.priority ?? 5,
          extras: payload.extras,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Gotify API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      this.logger.log(`Gotify notification sent: ${payload.title}`);
    } catch (error) {
      this.logger.error(
        `Failed to send Gotify notification: ${error.message}`,
        error.stack,
      );
    }
  }

  async sendRegistrationNotification(
    count: number,
    userName: string,
    userEmail: string,
  ): Promise<void> {
    await this.sendNotification({
      title: 'New Registration!',
      message: `${userName} (${userEmail}) just registered!\n\nRegistration #${count}\nTotal registrations: ${count}`,
      priority: 6,
      extras: {
        type: 'registration',
        count,
        userName,
        userEmail,
      },
    });
  }

  async sendCheckinNotification(
    userName: string,
    userEmail: string,
    eventName: string,
    totalCheckins: number,
  ): Promise<void> {
    await this.sendNotification({
      title: 'New Check-in!',
      message: `${userName} (${userEmail}) checked in to "${eventName}"\n\nEvent: ${eventName}\nTotal check-ins: ${totalCheckins}`,
      priority: 6,
      extras: {
        type: 'checkin',
        count: totalCheckins,
        userName,
        userEmail,
        eventName,
      },
    });
  }

  async sendCountdownNotification(
    daysUntil: number,
    hackathonName?: string,
  ): Promise<void> {
    // If hackathon name not provided, try to get from active hackathon
    if (!hackathonName) {
      const activeHackathon = await Hackathon.query()
        .where('active', true)
        .first();
      hackathonName = activeHackathon?.name || 'HackPSU';
    }

    let message: string;
    if (daysUntil === 0) {
      message = `${hackathonName} is TODAY! Let's go!`;
    } else if (daysUntil === 1) {
      message = `Only 1 day until ${hackathonName}! Get ready!`;
    } else {
      message = `${daysUntil} days until ${hackathonName}!`;
    }

    await this.sendNotification({
      title: 'Hackathon Countdown',
      message,
      priority: 7,
      extras: {
        type: 'countdown',
        daysUntil,
        hackathonName,
      },
    });
  }

  async sendBootstrapNotification(): Promise<void> {
    const instance =
      this.configService.get<string>('RUNTIME_INSTANCE') || 'unknown';

    await this.sendNotification({
      title: 'API Started',
      message: `HackPSU ${instance} API is awake and ready to serve.`,
      priority: 5,
      extras: {
        type: 'bootstrap',
        instance,
        timestamp: new Date().toISOString(),
      },
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
