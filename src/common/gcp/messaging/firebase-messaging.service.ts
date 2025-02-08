import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import {
  DefaultTopic,
  Payload,
} from "common/gcp/messaging/firebase-messaging.types";
import { FirestoreModel } from "common/gcp/firestore";
import { FirestoreUser } from "entities/firestore-user.entity";
import { DateTime } from "luxon";

@Injectable()
export class FirebaseMessagingService {
  private get users(): FirestoreModel<FirestoreUser> {
    return admin
      .firestore()
      .collection("users") as FirestoreModel<FirestoreUser>;
  }

  private static _clickableNotification = {
    android: {
      notification: {
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
      },
    },
    apns: {
      payload: {
        aps: {
          category: "MESSAGE_LINK",
        },
      },
    },
  };

  private async getFcmToken(userId: string): Promise<string | null> {
    const user = await this.users.doc(userId).get();

    if (!user) {
      return null;
    }

    return user.get("token");
  }

  private createDataPayload(
    data?: Record<string, string>,
    scheduleTime?: number,
  ) {
    return {
      ...(data ? data : {}),
      ...(scheduleTime
        ? {
            scheduleTime: scheduleTime.toString(),
            isScheduled: "true",
          }
        : {}),
    };
  }

  async sendTokenMessage(userId: string, payload: Payload) {
    const { title, scheduleTime, data, body, isClickable } = payload;

    const payloadData = this.createDataPayload(data, scheduleTime);

    const token = await this.getFcmToken(userId);

    const message: admin.messaging.TokenMessage = {
      token,
      data: payloadData,
      ...(isClickable ? FirebaseMessagingService._clickableNotification : {}),
      notification: {
        title,
        body,
      },
    };

    return admin.messaging().send(message);
  }

  async sendTopicMessage(topic: DefaultTopic | string, payload: Payload) {
    const { title, body, isClickable, scheduleTime, data } = payload;

    const payloadData = this.createDataPayload(data, scheduleTime);

    const message: admin.messaging.TopicMessage = {
      ...(isClickable ? FirebaseMessagingService._clickableNotification : {}),
      data: payloadData,
      topic,
      notification: {
        title,
        body,
      },
    };

    await admin.messaging().send(message);
  }

  async register(userId: string, fcmToken: string) {
    return this.users.doc(userId).set({
      token: fcmToken,
      updatedAt: DateTime.now().toUnixInteger(),
    });
  }

  async subscribeTo(fcmToken: string, topic: DefaultTopic | string) {
    await admin.messaging().subscribeToTopic(fcmToken, topic);
  }

  async unsubscribeTo(fcmToken: string, topic: DefaultTopic | string) {
    await admin.messaging().unsubscribeFromTopic(fcmToken, topic);
  }

  async subscribeUsingId(userId: string, topic: string): Promise<boolean> {
    const fcmToken = await this.getFcmToken(userId);

    if (!fcmToken) {
      return false;
    }

    await this.subscribeTo(fcmToken, topic);

    return true;
  }

  async unsubscribeUsingId(userId: string, topic: string): Promise<boolean> {
    const fcmToken = await this.getFcmToken(userId);

    if (!fcmToken) {
      return false;
    }

    await this.unsubscribeTo(fcmToken, topic);

    return true;
  }
}
