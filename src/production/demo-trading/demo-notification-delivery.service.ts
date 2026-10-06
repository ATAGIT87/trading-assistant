import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Cron } from "@nestjs/schedule";
import { Repository } from "typeorm";
import { AlertDelivery } from "../alerts/entities/alert-delivery.entity";
import { DemoPosition } from "./entities/demo-position.entity";
import { TelegramNotificationService } from "./telegram-notification.service";

/** At-least-once delivery; a crash after Telegram accepts but before marking can repeat a message. */
@Injectable()
export class DemoNotificationDeliveryService {
  private readonly logger = new Logger(DemoNotificationDeliveryService.name);
  private running = false;
  constructor(
    @InjectRepository(AlertDelivery)
    private readonly ledger: Repository<AlertDelivery>,
    @InjectRepository(DemoPosition)
    private readonly positions: Repository<DemoPosition>,
    private readonly telegram: TelegramNotificationService,
  ) {}
  @Cron("25 * * * * *")
  async handlePendingNotifications() {
    try {
      await this.flush();
    } catch {
      this.logger.warn(
        "Demo notification queue is unavailable; a later delivery cycle will retry.",
      );
    }
  }

  async flush() {
    if (this.running || !this.telegram.isEnabled()) return;
    this.running = true;
    try {
      // Filter acknowledged rows in SQL before applying the bounded batch.
      const pending = await this.ledger
        .createQueryBuilder("pending")
        .where("pending.action LIKE :pattern", { pattern: "DEMO_%_PENDING:%" })
        .andWhere(
          `NOT EXISTS (SELECT 1 FROM alert_delivery sent WHERE sent.symbol = pending.symbol
          AND sent.timeframe = pending.timeframe AND sent."candleTime" = pending."candleTime"
          AND sent.action = REPLACE(pending.action, '_PENDING:', '_SENT:'))`,
        )
        .orderBy('pending."sentAt"', "ASC")
        .addOrderBy("pending.id", "ASC")
        .take(100)
        .getMany();
      for (const event of pending) {
        try {
          const match = /^DEMO_(OPEN|CLOSE)_PENDING:(\d+)$/.exec(event.action);
          if (!match) continue;
          const position = await this.positions.findOneBy({
            id: Number(match[2]),
          });
          if (!position || (match[1] === "CLOSE" && position.status === "OPEN"))
            continue;
          const delivered =
            match[1] === "OPEN"
              ? await this.telegram.sendOpenNotification(
                  position,
                  "BUY",
                  event.payload,
                )
              : await this.telegram.sendCloseNotification({
                  ...position,
                  status: position.status as "WIN" | "LOSS",
                });
          if (!delivered) continue;
          await this.ledger.upsert(
            {
              symbol: event.symbol,
              timeframe: event.timeframe,
              candleTime: event.candleTime,
              action: event.action.replace(
                "_PENDING:",
                "_SENT:",
              ) as AlertDelivery["action"],
            },
            ["symbol", "timeframe", "candleTime", "action"],
          );
        } catch {
          // Do not log HTTP URLs/token-bearing errors. The durable event remains retryable.
          this.logger.warn(`Demo notification ${event.id} remains pending.`);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
