import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { GotifyService } from "../../common/gotify/gotify.service";
import { Hackathon } from "../../entities/hackathon.entity";
import { DateTime } from "luxon";

@Injectable()
export class NotificationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(private gotifyService: GotifyService) {}

  async onModuleInit() {
    // NotificationScheduler initialized
    this.logger.log("NotificationScheduler initialized");
    // Bootstrap notification disabled
  }
  @Cron("0 6 * * *", {
    name: "daily-countdown",
    timeZone: "America/New_York", // EST/EDT timezone
  })
  async handleDailyCountdown() {
    if (!this.gotifyService.isEnabled()) {
      this.logger.debug("Skipping daily countdown (not production)");
      return;
    }

    try {
      // Get the active hackathon
      const activeHackathon = await Hackathon.query()
        .where("active", true)
        .first();

      if (!activeHackathon) {
        this.logger.warn("No active hackathon found, skipping countdown");
        return;
      }

      // Convert Unix timestamp to DateTime
      const startDate = DateTime.fromMillis(activeHackathon.startTime, {
        zone: "America/New_York",
      }).startOf("day");

      const today = DateTime.now().setZone("America/New_York").startOf("day");
      const daysUntil = Math.ceil(startDate.diff(today, "days").days);

      // Only send if the event hasn't passed and is within 30 days
      if (daysUntil >= 0 && daysUntil <= 30) {
        await this.gotifyService.sendCountdownNotification(daysUntil);
        this.logger.log(
          `Daily countdown sent: ${daysUntil} days until ${activeHackathon.name}`,
        );
      } else if (daysUntil < 0) {
        this.logger.debug("Event has passed, skipping countdown");
      } else {
        this.logger.debug(
          `Event is too far away (${daysUntil} days), skipping countdown`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send daily countdown: ${error.message}`,
        error.stack,
      );
    }
  }
}
